// Reverse-search a product image: identify it with Gemini vision, then
// return candidate retailers + ready-to-use search links. No paid API needed.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, category } = (await req.json().catch(() => ({}))) ?? {};
    if (!imageUrl) return json({ error: "imageUrl required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

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

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_matches",
            description: "Return product identification matches.",
            parameters: {
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
                    additionalProperties: false,
                  },
                },
              },
              required: ["primary_query", "candidates"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_matches" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited, try again shortly" }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted — add credits in Settings" }, 402);
    if (!aiResp.ok) {
      console.error("AI error", aiResp.status, await aiResp.text());
      return json({ error: "Identification failed" }, 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) return json({ error: "No matches returned" }, 500);

    let parsed: any;
    try { parsed = JSON.parse(args); } catch { return json({ error: "Bad AI output" }, 500); }

    // Build candidate retailer links per match
    const retailers = (q: string) => {
      const enc = encodeURIComponent(q);
      return [
        { name: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${enc}` },
        { name: "Google Lens",     url: `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageUrl)}` },
        { name: "Amazon",          url: `https://www.amazon.com/s?k=${enc}` },
        { name: "Myntra",          url: `https://www.myntra.com/${enc.replace(/%20/g, "-")}` },
        { name: "Flipkart",        url: `https://www.flipkart.com/search?q=${enc}` },
        { name: "ASOS",            url: `https://www.asos.com/search/?q=${enc}` },
        { name: "eBay",            url: `https://www.ebay.com/sch/i.html?_nkw=${enc}` },
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
