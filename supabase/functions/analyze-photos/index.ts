// Analyze user's face + body photos with Gemini vision and write structured analysis to profile
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiStructured, GeminiError, type GeminiPart } from "../_shared/gemini.ts";

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
    const userId = userData.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("face_photo_path, body_photo_path")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.face_photo_path && !profile?.body_photo_path) {
      return json({ error: "No photos uploaded" }, 400);
    }

    const imageParts: GeminiPart[] = [];
    for (const path of [profile.face_photo_path, profile.body_photo_path].filter(Boolean) as string[]) {
      const { data: signed } = await supabase.storage.from("user-photos").createSignedUrl(path, 600);
      if (signed?.signedUrl) {
        const r = await fetch(signed.signedUrl);
        const buf = new Uint8Array(await r.arrayBuffer());
        let bin = "";
        const chunk = 0x8000;
        for (let i = 0; i < buf.length; i += chunk) {
          bin += String.fromCharCode(...buf.subarray(i, i + chunk));
        }
        const b64 = btoa(bin);
        const mime = r.headers.get("content-type") || "image/jpeg";
        imageParts.push({ inlineData: { mimeType: mime, data: b64 } });
      }
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const schema = {
      type: "object",
      properties: {
        skin_undertone: { type: "string", enum: ["warm", "cool", "neutral", "olive"] },
        skin_tone_shade: { type: "string", description: "fair / light / medium / tan / deep" },
        hair_color: { type: "string" },
        hair_style: { type: "string" },
        face_shape: { type: "string", enum: ["oval", "round", "square", "heart", "long", "diamond"] },
        eye_color: { type: "string" },
        body_proportions: { type: "string", description: "Brief proportions note (torso/legs/shoulders)" },
        recommended_colors: { type: "array", items: { type: "string" }, description: "5-7 color names that flatter" },
        colors_to_avoid: { type: "array", items: { type: "string" } },
      },
      required: ["skin_undertone", "skin_tone_shade", "recommended_colors"],
    };

    let analysis: any;
    try {
      analysis = await geminiStructured({
        apiKey: GEMINI_API_KEY,
        system:
          "You are a professional image analyst for fashion styling. Be concise, descriptive, never judgmental. Avoid identifying real people.",
        parts: [{ text: "Analyze the photo(s) and extract styling-relevant attributes." }, ...imageParts],
        schema,
      });
    } catch (e) {
      if (e instanceof GeminiError) return json({ error: e.message }, e.status);
      throw e;
    }
    if (!analysis) return json({ error: "No analysis returned" }, 500);

    await supabase.from("profiles").update({ ai_analysis: analysis }).eq("id", userId);

    return json({ analysis });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
