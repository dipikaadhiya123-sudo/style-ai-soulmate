// Render a try-on "after" image using Nano Banana image editing.
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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { photoPath, itemLabel, category, itemImageUrl } = (await req.json().catch(() => ({}))) ?? {};
    if (!photoPath || !itemLabel || !category) return json({ error: "Missing fields" }, 400);

    const { data: signed } = await supabase.storage
      .from("tryon-photos")
      .createSignedUrl(photoPath, 600);
    if (!signed?.signedUrl) return json({ error: "Photo not found" }, 404);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const instruction =
      `Photorealistically edit this photo so the person is wearing/showing this ${category}: "${itemLabel}". ` +
      `Preserve the person's face, identity, pose, body proportions, skin tone, and background exactly. ` +
      `Only modify the relevant garment/accessory area. Realistic lighting, fabric folds, and shadows. ` +
      `If a reference item image is provided, match its color, pattern, and shape closely.`;

    const userContent: any[] = [
      { type: "text", text: instruction },
      { type: "image_url", image_url: { url: signed.signedUrl } },
    ];
    if (itemImageUrl) userContent.push({ type: "image_url", image_url: { url: itemImageUrl } });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited, try again shortly" }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted — add credits in Settings" }, 402);
    if (!aiResp.ok) {
      console.error("AI error", aiResp.status, await aiResp.text());
      return json({ error: "Image generation failed" }, 500);
    }

    const aiData = await aiResp.json();
    const dataUrl: string | undefined = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) {
      console.error("No image returned", JSON.stringify(aiData).slice(0, 500));
      return json({ error: "No image returned" }, 500);
    }

    // Decode base64 → bytes and upload
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(image\/[a-z]+)/)?.[1] ?? "image/png";
    const ext = mime.split("/")[1] ?? "png";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const resultPath = `${userId}/result-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("tryon-results")
      .upload(resultPath, bytes, { contentType: mime, upsert: false });
    if (upErr) {
      console.error("upload err", upErr);
      return json({ error: "Failed to save result" }, 500);
    }

    const { data: resSigned } = await supabase.storage
      .from("tryon-results")
      .createSignedUrl(resultPath, 3600);

    return json({ resultPath, resultUrl: resSigned?.signedUrl ?? null });
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
