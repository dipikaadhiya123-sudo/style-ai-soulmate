// Generate a structured outfit recommendation tailored to profile + occasion
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const occasion = String(body.occasion ?? "casual").toLowerCase();
    if (!["casual", "office", "party", "wedding", "date", "kids"].includes(occasion)) {
      return json({ error: "Invalid occasion" }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, gender, height_cm, weight_kg, skin_tone, hair_type, body_shape, style_prefs, ai_analysis")
      .eq("id", userId)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const profileSummary = profile
      ? Object.entries(profile)
          .filter(([_, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join("\n")
      : "(no profile)";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a world-class personal stylist. Recommend a complete head-to-toe outfit tailored to the user's body, skin tone, hair, and style preferences. Use specific colors (provide a CSS hex like #C2724A for each item) and concrete garment descriptions. Be warm, confident, never preachy.",
          },
          {
            role: "user",
            content: `Profile:\n${profileSummary}\n\nOccasion: ${occasion}\n\nGive me a curated outfit, a style score (1-10), and 3 bonus tips (one each from: makeup, hair, skincare/nails).`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_outfit",
            description: "Return a structured outfit recommendation.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short evocative title for the look (3-5 words)" },
                rationale: { type: "string", description: "1-2 sentences on why this works for the user." },
                items: {
                  type: "array",
                  minItems: 3,
                  maxItems: 7,
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", description: "e.g. Top, Bottom, Outerwear, Footwear, Accessory" },
                      description: { type: "string", description: "Specific garment description" },
                      color: { type: "string", description: "CSS hex color, e.g. #C2724A" },
                    },
                    required: ["category", "description", "color"],
                    additionalProperties: false,
                  },
                },
                style_score: { type: "number", minimum: 1, maximum: 10 },
                score_breakdown: {
                  type: "object",
                  properties: {
                    fit: { type: "number", minimum: 1, maximum: 10 },
                    color_harmony: { type: "number", minimum: 1, maximum: 10 },
                    occasion_match: { type: "number", minimum: 1, maximum: 10 },
                  },
                  required: ["fit", "color_harmony", "occasion_match"],
                  additionalProperties: false,
                },
                suggestions: {
                  type: "array",
                  minItems: 3,
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", enum: ["Makeup", "Hair", "Skincare", "Nails"] },
                      tip: { type: "string" },
                    },
                    required: ["category", "tip"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "rationale", "items", "style_score", "score_breakdown", "suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "recommend_outfit" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited, try again shortly" }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!aiResp.ok) {
      console.error("AI error", aiResp.status, await aiResp.text());
      return json({ error: "AI generation failed" }, 500);
    }

    const aiData = await aiResp.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const rec = args ? JSON.parse(args) : null;
    if (!rec) return json({ error: "No recommendation returned" }, 500);

    const { data: inserted, error: insErr } = await supabase
      .from("outfits")
      .insert({
        user_id: userId,
        occasion,
        title: rec.title,
        items: rec.items,
        style_score: rec.style_score,
        score_breakdown: rec.score_breakdown,
        rationale: rec.rationale,
        suggestions: rec.suggestions,
      })
      .select("id, share_slug, saved")
      .single();

    if (insErr) {
      console.error(insErr);
      return json({ error: "Failed to save outfit" }, 500);
    }

    return json({ outfit: { ...rec, ...inserted } });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
