// Generate a textual "look" description that imagines the user wearing the chosen item.
// No image rendering — returns prose + bullet highlights only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiStructured, GeminiError, fetchAsInlineData, type GeminiPart } from "../_shared/gemini.ts";

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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { photoPath, itemLabel, category, itemImageUrl } = body ?? {};
    if (!photoPath || !itemLabel || !category) return json({ error: "Missing fields" }, 400);

    const { data: signed } = await supabase.storage.from("tryon-photos").createSignedUrl(photoPath, 600);
    if (!signed?.signedUrl) return json({ error: "Photo not found" }, 404);

    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_analysis, gender, body_shape, skin_tone, style_prefs")
      .eq("id", userData.user.id)
      .maybeSingle();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "AI not configured" }, 500);

    const userParts: GeminiPart[] = [
      {
        text:
          `Imagine the person in this photo wearing this ${category}: "${itemLabel}". ` +
          `Describe how the look would come together — fit, color harmony with their skin/hair, silhouette, and styling notes. ` +
          `Do NOT describe rendering an image. Be vivid but grounded. ` +
          `Profile context: ${JSON.stringify(profile ?? {})}.`,
      },
      await fetchAsInlineData(signed.signedUrl).then((d) => ({ inlineData: d })),
    ];
    if (itemImageUrl) {
      try {
        userParts.push({ inlineData: await fetchAsInlineData(itemImageUrl) });
      } catch (e) {
        console.error("item image fetch failed", e);
      }
    }

    const schema = {
      type: "object",
      properties: {
        description: { type: "string", description: "2–4 sentence vivid description of the imagined look." },
        highlights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              detail: { type: "string" },
            },
            required: ["label", "detail"],
          },
          description: "3–5 short bullets: fit, color harmony, silhouette, styling tip.",
        },
      },
      required: ["description", "highlights"],
    };

    let result: any;
    try {
      result = await geminiStructured({
        apiKey: GEMINI_API_KEY,
        system: "You are a precise, warm fashion stylist. Concise, specific, never generic.",
        parts: userParts,
        schema,
      });
    } catch (e) {
      if (e instanceof GeminiError) return json({ error: e.message }, e.status);
      throw e;
    }
    if (!result) return json({ error: "No result" }, 500);

    return json(result);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
