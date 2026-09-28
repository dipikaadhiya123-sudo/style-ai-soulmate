// Reverse-search a product image: identify it with Gemini vision, then
// return candidate retailers + ready-to-use search links. No paid API needed.
import { createClient } from "npm:@supabase/supabase-js@2";
import { geminiStructured, GeminiError, fetchAsInlineData } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Backend auth is not configured" }, 500);
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const { imageUrl, category } = (await req.json().catch(() => ({}))) ?? {};
    if (!imageUrl) return json({ error: "imageUrl required" }, 400);
    let parsedImageUrl: URL;
    try {
      parsedImageUrl = new URL(imageUrl);
    } catch {
      return json({ error: "Please provide a valid image URL" }, 400);
    }
    if (!['http:', 'https:'].includes(parsedImageUrl.protocol)) {
      return json({ error: "Only http and https image URLs are supported" }, 400);
    }
    const hostname = parsedImageUrl.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".local")) {
      return json({ error: "Private network URLs are not supported" }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "AI not configured" }, 500);

    const system =
      "You are a fashion product identification expert. Look at the image and identify the most prominent " +
      "wearable product (clothing, footwear, or accessory). Be specific about brand cues, color, material, " +
      "pattern, silhouette, and category. If unsure of brand, say so.";

    const userText =
      `Identify the main ${category ?? "fashion"} item in this image and return structured matches. ` +
      `Provide 3-5 likely product candidates ordered by confidence. For each candidate, include: ` +
      `a short product title, category, color, key visual features, an estimated price range in USD, ` +
      `and 4-6 search keywords a shopper could paste into Amazon/Google. Also return a single best ` +
      `"primary_query" string for web search.`;

    const schema = {
      type: "object",
      properties: {
        primary_query: { type: "string" },
        candidates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: { type: "string" },
              color: { type: "string" },
              features: { type: "array", items: { type: "string" } },
              price_range_usd: { type: "string" },
              keywords: { type: "array", items: { type: "string" } },
              confidence: { type: "number" },
            },
            required: ["title", "category", "keywords", "confidence"],
          },
        },
      },
      required: ["primary_query", "candidates"],
    };

    let parsed: any;
    try {
      const imgPart = { inlineData: await fetchAsInlineData(imageUrl) };
      parsed = await geminiStructured({
        apiKey: GEMINI_API_KEY,
        system,
        parts: [{ text: userText }, imgPart],
        schema,
      });
    } catch (e) {
      if (e instanceof GeminiError) return json({ error: e.message }, e.status);
      throw e;
    }
    if (!parsed) return json({ error: "No matches returned" }, 500);

    // Build candidate retailer links per match (incl. luxury platforms)
    const retailers = (q: string) => {
      const enc = encodeURIComponent(q);
      const dash = enc.replace(/%20/g, "-");
      return [
        { name: "Google Shopping",   url: `https://www.google.com/search?tbm=shop&q=${enc}` },
        { name: "Google Lens",       url: `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageUrl)}` },
        { name: "Nykaa Fashion",     url: `https://www.nykaafashion.com/search?q=${enc}` },
        { name: "Nykaa Luxe",        url: `https://luxe.nykaa.com/search/result?q=${enc}` },
        { name: "Tata CLiQ Luxury",  url: `https://luxury.tatacliq.com/search/?searchCategory=all&text=${enc}` },
        { name: "Ajio Luxe",         url: `https://www.ajio.com/s/luxe?query=:relevance:${enc}` },
        { name: "Darveys",           url: `https://www.darveys.com/search?q=${enc}` },
        { name: "Aza Fashions",      url: `https://www.azafashions.com/search?q=${enc}` },
        { name: "Pernia's Pop-Up",   url: `https://www.perniaspopupshop.com/catalogsearch/result/?q=${enc}` },
        { name: "Net-a-Porter",      url: `https://www.net-a-porter.com/en-in/shop/search/${dash}` },
        { name: "Farfetch",          url: `https://www.farfetch.com/shopping/search/items.aspx?q=${enc}` },
        { name: "Mytheresa",         url: `https://www.mytheresa.com/en-in/search?q=${enc}` },
        { name: "Myntra",            url: `https://www.myntra.com/${dash}` },
        { name: "Ajio",              url: `https://www.ajio.com/search/?text=${enc}` },
        { name: "Flipkart",          url: `https://www.flipkart.com/search?q=${enc}` },
        { name: "Amazon",            url: `https://www.amazon.in/s?k=${enc}` },
        { name: "ASOS",              url: `https://www.asos.com/search/?q=${enc}` },
      ];
    };

    const candidates = (parsed.candidates ?? []).map((c: any) => ({
      ...c,
      retailers: retailers(c.keywords?.slice(0, 5).join(" ") || c.title),
    }));

    return json({
      primary_query: parsed.primary_query,
      retailers: retailers(parsed.primary_query),
      candidates,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
