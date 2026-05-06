import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Body {
  query: string;
  category?: string;
  stores?: string[];
  sizes?: string[];
  city?: string;
}

const DEFAULT_STORES = [
  "Nykaa Fashion", "Ajio Luxe", "Tata CLiQ Luxury", "Myntra",
  "Darveys", "Aza Fashions", "Pernia's Pop-Up Shop",
];
const DEFAULT_BOUTIQUES = [
  { name: "White Crow", city: "Ahmedabad", address: "CG Road, Navrangpura" },
  { name: "Palladium Mall", city: "Mumbai", address: "Lower Parel" },
  { name: "DLF Emporio", city: "New Delhi", address: "Vasant Kunj" },
  { name: "UB City Mall", city: "Bengaluru", address: "Vittal Mallya Road" },
  { name: "Phoenix MarketCity", city: "Pune", address: "Viman Nagar" },
];
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stores = body.stores?.length ? body.stores : DEFAULT_STORES;
    const sizes = body.sizes?.length ? body.sizes : DEFAULT_SIZES;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sys = `You are a fashion retail availability estimator for Indian luxury & mainstream stores.
Return ONLY a JSON object matching the requested schema. Estimate plausible stock per store/size for the item described.
Use realistic Indian retailers and physical luxury boutique addresses. Vary stock realistically (some out of stock, some limited). Do not invent fake URLs — leave url as a search query path.`;

    const user = `Item: ${body.query}
Category: ${body.category ?? "unknown"}
City: ${body.city ?? "any"}
Online stores to check: ${stores.join(", ")}
Sizes to check: ${sizes.join(", ")}
Physical boutiques to consider: ${DEFAULT_BOUTIQUES.map(b => `${b.name} (${b.city})`).join(", ")}`;

    const schema = {
      type: "object",
      properties: {
        online: {
          type: "array",
          items: {
            type: "object",
            properties: {
              store: { type: "string" },
              url: { type: "string" },
              currency: { type: "string" },
              price: { type: "number" },
              sizes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    size: { type: "string" },
                    status: { type: "string", enum: ["in_stock", "limited", "out_of_stock"] },
                  },
                  required: ["size", "status"],
                  additionalProperties: false,
                },
              },
            },
            required: ["store", "url", "sizes"],
            additionalProperties: false,
          },
        },
        offline: {
          type: "array",
          items: {
            type: "object",
            properties: {
              store: { type: "string" },
              city: { type: "string" },
              address: { type: "string" },
              status: { type: "string", enum: ["in_stock", "limited", "out_of_stock", "call_to_confirm"] },
              phone: { type: "string" },
            },
            required: ["store", "city", "address", "status"],
            additionalProperties: false,
          },
        },
      },
      required: ["online", "offline"],
      additionalProperties: false,
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [{
          type: "function",
          function: { name: "report_availability", description: "Return availability", parameters: schema },
        }],
        tool_choice: { type: "function", function: { name: "report_availability" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiRes.status}: ${t}`);
    }

    const data = await aiRes.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    if (!args) throw new Error("No structured response");

    return new Response(
      JSON.stringify({ ...args, query: body.query, checked_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("check-availability error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
