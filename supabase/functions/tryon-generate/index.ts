// Universal AI Try-On Engine: auto-detects category, supports multiple items,
// uses category-specific placement prompts, and schedules cleanup of unsaved originals.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Category =
  | "clothes" | "footwear" | "bag" | "necklace" | "earrings" | "ring"
  | "bracelet" | "watch" | "sunglasses" | "hat" | "scarf" | "outfit";

const SUPPORTED: Category[] = [
  "clothes","footwear","bag","necklace","earrings","ring",
  "bracelet","watch","sunglasses","hat","scarf","outfit",
];

const PRESERVE = [
  "Do NOT alter the person's face, facial features, identity, or expression.",
  "Do NOT change hairstyle, hair color, or hairline.",
  "Do NOT change skin tone, body shape, height, or proportions.",
  "Do NOT change the pose, hand position, or background.",
  "Preserve original lighting direction, shadows, and color temperature.",
  "Output must look photorealistic — natural fabric folds, realistic contact shadows, correct perspective.",
].join(" ");

const PLACEMENT: Record<Category, string> = {
  clothes:
    "Completely REPLACE the existing upper/lower garment with the reference clothing item. Do not overlay textures on top of old clothes — remove them first, then render the new garment fitted to the body with correct drape and folds.",
  footwear:
    "CRITICAL: You MUST visibly replace the shoes/sandals/footwear on BOTH feet with the reference footwear. First DELETE the existing footwear completely (do not blend with it), then render the new footwear in its place, matching each foot's exact orientation, angle, and perspective. The new footwear's color, shape, straps, sole, and material MUST clearly match the reference image — the result must look obviously different from the original shoes. Keep the legs, ankles, pants hem, ground surface, and contact shadows exactly as before. Add a realistic contact shadow under each new shoe.",
  bag:
    "Place the bag naturally — on shoulder, in hand, or crossbody depending on the person's pose and free hand. Keep strap physics realistic.",
  necklace:
    "Detect the neck and collarbone. REMOVE any existing necklace, then drape the new necklace around the neck following the body contour with realistic chain physics.",
  earrings:
    "Detect both visible ears. Place the earrings symmetrically on the earlobes at correct scale. Remove any existing earrings first.",
  ring:
    "Detect the most visible finger (usually ring finger of the visible hand). Fit the ring precisely on the finger with correct scale and perspective.",
  bracelet:
    "Detect the visible wrist and fit the bracelet around it with correct curvature and shadow under the wrist.",
  watch:
    "Detect the wrist orientation and place the watch on it with the dial facing camera-natural. Match strap to wrist size.",
  sunglasses:
    "Detect the eyes and face angle. Align sunglasses on the bridge of the nose, covering the eyes, matching head tilt and perspective. Add subtle lens reflections.",
  hat:
    "Place the hat/cap on the head following hair volume and head angle. Do not change the hairstyle underneath visible areas.",
  scarf:
    "Drape the scarf or dupatta naturally based on pose — around the neck, over a shoulder, or across the chest — with realistic fabric flow.",
  outfit:
    "Replace the full outfit (upper + lower) with the reference items, keeping accessories untouched. Render each piece with realistic fit and layering.",
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

    const body = (await req.json().catch(() => ({}))) ?? {};
    const photoPath: string | undefined = body.photoPath;
    // Backward compatible: accept single itemImageUrl or array of items
    const items: { imageUrl?: string; label?: string; category?: Category }[] =
      Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [{ imageUrl: body.itemImageUrl, label: body.itemLabel, category: body.category }];

    if (!photoPath) return json({ error: "Missing photoPath" }, 400);
    if (!items.some((i) => i.imageUrl || i.label)) {
      return json({ error: "Provide at least one item image or description" }, 400);
    }

    const { data: signed } = await supabase.storage
      .from("tryon-photos").createSignedUrl(photoPath, 600);
    if (!signed?.signedUrl) return json({ error: "Photo not found" }, 404);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    // --- Step 1: Auto-detect category + describe each item if missing ---
    const enriched: { imageUrl?: string; label: string; category: Category }[] = [];
    for (const it of items) {
      let cat = (it.category && SUPPORTED.includes(it.category)) ? it.category as Category : undefined;
      let label = it.label?.trim();

      if (it.imageUrl && (!cat || !label)) {
        try {
          const detect = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{
                role: "user",
                content: [
                  { type: "text", text:
                    `Identify this fashion product. Reply ONLY with compact JSON: {"category":"<one of: ${SUPPORTED.join("|")}>","label":"<short descriptive name with color/material>"}` },
                  { type: "image_url", image_url: { url: it.imageUrl } },
                ],
              }],
            }),
          });
          if (detect.ok) {
            const d = await detect.json();
            const raw: string = d.choices?.[0]?.message?.content ?? "";
            const m = raw.match(/\{[\s\S]*\}/);
            if (m) {
              const parsed = JSON.parse(m[0]);
              if (!cat && SUPPORTED.includes(parsed.category)) cat = parsed.category;
              if (!label && parsed.label) label = String(parsed.label);
            }
          }
        } catch (e) { console.error("detect failed", e); }
      }

      enriched.push({
        imageUrl: it.imageUrl,
        label: label || "fashion item",
        category: cat || "clothes",
      });
    }

    // --- Step 2: Build a single combined instruction for all items ---
    const itemBlocks = enriched.map((it, i) =>
      `Item ${i + 1} [${it.category}]: "${it.label}". Placement rule: ${PLACEMENT[it.category]}`
    ).join("\n");

    const instruction =
      `You are a photorealistic virtual try-on engine. Edit the FIRST image (the person) so they are wearing the following item(s). ` +
      `Each subsequent image is a reference of the product to apply.\n\n${itemBlocks}\n\n` +
      `STRICT RULES: ${PRESERVE}`;

    const userContent: any[] = [
      { type: "text", text: instruction },
      { type: "image_url", image_url: { url: signed.signedUrl } },
    ];
    for (const it of enriched) {
      if (it.imageUrl) userContent.push({ type: "image_url", image_url: { url: it.imageUrl } });
    }

    // --- Step 3: Generate ---
    // Use fal.ai FASHN model for single clothing item try-on (much higher fidelity).
    // Fall back to Gemini for accessories / multi-item / no-image cases.
    const FAL_KEY = Deno.env.get("FAL_KEY");
    const singleClothes =
      enriched.length === 1 &&
      enriched[0].imageUrl &&
      ["clothes", "outfit"].includes(enriched[0].category);

    let mime = "image/png";
    let ext = "png";
    let bytes: Uint8Array | null = null;

    if (FAL_KEY && singleClothes) {
      try {
        const falResp = await fetch("https://fal.run/fal-ai/fashn/tryon/v1.6", {
          method: "POST",
          headers: {
            Authorization: `Key ${FAL_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model_image: signed.signedUrl,
            garment_image: enriched[0].imageUrl,
            category: "auto",
            mode: "quality",
            num_samples: 1,
          }),
        });
        if (!falResp.ok) {
          console.error("fal error", falResp.status, await falResp.text());
        } else {
          const falData = await falResp.json();
          const outUrl: string | undefined = falData.images?.[0]?.url;
          if (outUrl) {
            const imgResp = await fetch(outUrl);
            if (imgResp.ok) {
              const ab = await imgResp.arrayBuffer();
              bytes = new Uint8Array(ab);
              mime = imgResp.headers.get("content-type") || "image/png";
              ext = mime.split("/")[1]?.split(";")[0] ?? "png";
            }
          }
        }
      } catch (e) {
        console.error("fal call threw", e);
      }
    }

    // Fallback / accessory path → Gemini image editing
    if (!bytes) {
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

      const [meta, b64] = dataUrl.split(",");
      mime = meta.match(/data:(image\/[a-z]+)/)?.[1] ?? "image/png";
      ext = mime.split("/")[1] ?? "png";
      bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }

    const resultPath = `${userId}/result-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("tryon-results")
      .upload(resultPath, bytes, { contentType: mime, upsert: false });
    if (upErr) {
      console.error("upload err", upErr);
      return json({ error: "Failed to save result" }, 500);
    }

    const { data: resSigned } = await supabase.storage
      .from("tryon-results").createSignedUrl(resultPath, 3600);

    // --- Step 4: Schedule auto-delete of original photo after 2 min if not saved ---
    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil((async () => {
      await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        // Check if any saved look references this photo
        const { data: savedLook } = await admin
          .from("looks")
          .select("id")
          .eq("photo_path", photoPath)
          .eq("saved", true)
          .maybeSingle();
        if (savedLook) return; // user saved it — keep
        await admin.storage.from("tryon-photos").remove([photoPath]);
        console.log("auto-deleted unsaved original", photoPath);
      } catch (e) { console.error("auto-delete failed", e); }
    })());

    return json({
      resultPath,
      resultUrl: resSigned?.signedUrl ?? null,
      detected: enriched.map((e) => ({ category: e.category, label: e.label })),
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
