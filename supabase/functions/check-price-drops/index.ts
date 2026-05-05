// Scheduled price-drop checker. Fetches each active wishlist item's
// product page, asks Gemini to extract the current price, and creates
// a notification when price <= target (or drops vs last seen).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Optional explicit single-item check from UI
  let onlyId: string | undefined;
  try { const b = await req.json(); onlyId = b?.itemId; } catch { /* cron has no body */ }

  // Pull a batch — items not checked in last 6h, or all if onlyId
  const q = admin.from("wishlist_items").select("*").eq("active", true).limit(25);
  const { data: items, error } = onlyId
    ? await admin.from("wishlist_items").select("*").eq("id", onlyId).limit(1)
    : await q.order("last_checked_at", { ascending: true, nullsFirst: true });
  if (error) return json({ error: error.message }, 500);

  let checked = 0, notified = 0;
  for (const it of items ?? []) {
    try {
      const html = await fetchText(it.source_url);
      if (!html) continue;
      const price = await extractPriceWithAI(html, it.title, it.currency, LOVABLE_API_KEY);
      checked++;

      const dropVsTarget = it.target_price != null && price != null && price <= Number(it.target_price);
      const dropVsLast =
        price != null && it.last_notified_price != null && price < Number(it.last_notified_price);

      const updates: Record<string, unknown> = {
        last_checked_at: new Date().toISOString(),
        current_price: price ?? it.current_price,
      };

      if (price != null && (dropVsTarget || dropVsLast)) {
        await admin.from("notifications").insert({
          user_id: it.user_id,
          title: `Price drop: ${it.title}`,
          body: `Now ${it.currency} ${price}${it.target_price ? ` (target ${it.currency} ${it.target_price})` : ""}`,
          link: it.source_url,
        });
        updates.last_notified_price = price;
        notified++;
      }

      await admin.from("wishlist_items").update(updates).eq("id", it.id);
    } catch (e) {
      console.error("check failed", it.id, e);
    }
  }

  return json({ checked, notified });
});

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!r.ok) return null;
    const t = await r.text();
    // Trim down to keep prompt small
    return t.slice(0, 60_000);
  } catch { return null; }
}

async function extractPriceWithAI(
  html: string, title: string, currency: string, key: string,
): Promise<number | null> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Extract the current selling price (after discount) from a product page HTML." },
        { role: "user",   content: `Product: "${title}". Currency: ${currency}. Return just the number.\n\nHTML:\n${html}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_price",
          description: "Return the current selling price as a number, or null if not found.",
          parameters: {
            type: "object",
            properties: { price: { type: ["number", "null"] } },
            required: ["price"], additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_price" } },
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  try {
    const p = JSON.parse(args).price;
    return typeof p === "number" && isFinite(p) && p > 0 ? p : null;
  } catch { return null; }
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
