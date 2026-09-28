// Scheduled price-drop checker. Fetches each active wishlist item's
// product page, asks Gemini to extract the current price, and creates
// a notification when price <= target (or drops vs last seen).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiStructured, GeminiError } from "../_shared/gemini.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) return json({ error: "AI not configured" }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  // User-triggered checks are limited to one wishlist item owned by that user.
  let onlyId: string | undefined;
  try { const b = await req.json(); onlyId = b?.itemId; } catch { /* invalid body handled below */ }
  if (!onlyId) return json({ error: "itemId is required" }, 400);

  const { data: items, error } = await admin
    .from("wishlist_items")
    .select("*")
    .eq("id", onlyId)
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .limit(1);
  if (error) return json({ error: error.message }, 500);
  if (!items?.length) return json({ error: "Wishlist item not found" }, 404);

  let checked = 0, notified = 0;
  for (const it of items ?? []) {
    try {
      const html = await fetchText(it.source_url);
      if (!html) continue;
      const price = await extractPriceWithAI(html, it.title, it.currency, GEMINI_API_KEY);
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
  html: string, title: string, currency: string, apiKey: string,
): Promise<number | null> {
  try {
    const result = await geminiStructured({
      apiKey,
      system: "Extract the current selling price (after discount) from a product page HTML. If not found, return 0.",
      parts: [{ text: `Product: "${title}". Currency: ${currency}. Return just the price number (0 if unknown).\n\nHTML:\n${html}` }],
      schema: {
        type: "object",
        properties: { price: { type: "number" } },
        required: ["price"],
      },
    });
    const p = result?.price;
    return typeof p === "number" && isFinite(p) && p > 0 ? p : null;
  } catch (e) {
    if (!(e instanceof GeminiError)) console.error("price extraction failed", e);
    return null;
  }
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
