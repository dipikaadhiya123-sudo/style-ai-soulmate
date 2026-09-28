import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { geminiStructured, GeminiError } from "../_shared/gemini.ts";

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

async function firecrawlSearch(query: string, apiKey: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 5,
        country: "in",
        lang: "en",
      }),
    });
    if (!res.ok) {
      console.error("firecrawl search failed", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const results = data?.data?.web ?? data?.data ?? [];
    return Array.isArray(results) ? results : [];
  } catch (e) {
    console.error("firecrawl search error", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) throw new Error("Backend auth is not configured");
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stores = body.stores?.length ? body.stores : DEFAULT_STORES;
    const sizes = body.sizes?.length ? body.sizes : DEFAULT_SIZES;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // 1) Pull live snippets from Firecrawl search for each requested store
    let liveSnippets: { store: string; results: { title?: string; url?: string; description?: string }[] }[] = [];
    if (FIRECRAWL_API_KEY) {
      const tasks = stores.slice(0, 6).map(async (store) => {
        const results = await firecrawlSearch(`${body.query} ${store} buy online india`, FIRECRAWL_API_KEY);
        return {
          store,
          results: results.slice(0, 3).map((r: any) => ({
            title: r.title, url: r.url, description: r.description ?? r.snippet,
          })),
        };
      });
      liveSnippets = await Promise.all(tasks);
    }

    const liveContext = liveSnippets.length
      ? `\n\nLive web search snippets (use these to ground availability and URLs):\n${liveSnippets
          .map(s => `- ${s.store}:\n${s.results.map(r => `   • ${r.title ?? ""} — ${r.url ?? ""}\n     ${r.description ?? ""}`).join("\n")}`)
          .join("\n")}`
      : "";

    const sys = `You are a fashion retail availability estimator for Indian luxury & mainstream stores.
Return ONLY a JSON object matching the requested schema. Use the live web snippets provided to ground store URLs and infer stock realistically.
If a live snippet shows a real product page for a store, set that store's url to that link. Otherwise use the store's search URL.
Vary stock realistically (some out of stock, some limited).`;

    const user = `Item: ${body.query}
Category: ${body.category ?? "unknown"}
City: ${body.city ?? "any"}
Online stores to check: ${stores.join(", ")}
Sizes to check: ${sizes.join(", ")}
Physical boutiques to consider: ${DEFAULT_BOUTIQUES.map(b => `${b.name} (${b.city})`).join(", ")}${liveContext}`;

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
                },
              },
            },
            required: ["store", "url", "sizes"],
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
          },
        },
      },
      required: ["online", "offline"],
    };

    let args: any;
    try {
      args = await geminiStructured({
        apiKey: GEMINI_API_KEY,
        system: sys,
        parts: [{ text: user }],
        schema,
      });
    } catch (e) {
      if (e instanceof GeminiError) {
        return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw e;
    }
    if (!args) throw new Error("No structured response");

    return new Response(
      JSON.stringify({
        ...args,
        query: body.query,
        checked_at: new Date().toISOString(),
        live: Boolean(FIRECRAWL_API_KEY),
      }),
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

