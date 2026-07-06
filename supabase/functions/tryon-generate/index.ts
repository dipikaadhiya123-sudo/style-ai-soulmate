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
    "CRITICAL: Add the reference bag to the person — held in hand, on shoulder, or crossbody depending on pose. The bag's exact shape, color, hardware, and material MUST clearly match the reference. Render realistic strap physics and a soft contact shadow. The bag must be clearly visible and obviously added.",
  necklace:
    "CRITICAL: REMOVE any existing necklace first, then drape the new necklace around the neck following the collarbone contour. Match the reference's chain style, pendant, color, and length exactly. The necklace must be clearly visible against the skin/clothing with realistic chain physics and tiny shadow.",
  earrings:
    "CRITICAL: REMOVE any existing earrings first. Place the new earrings on BOTH visible earlobes, symmetrically, at correct scale. Match the reference's shape, color, stones, and dangle length exactly. Earrings must be clearly visible — not hidden behind hair.",
  ring:
    "CRITICAL: Place the ring on the most visible finger of the visible hand (prefer ring finger). Match the reference's band, stone, color, and metal exactly. The ring must be clearly visible at correct finger-scale with proper perspective and a small shadow on the finger.",
  bracelet:
    "CRITICAL: REMOVE any existing bracelet/watch on the visible wrist. Fit the new bracelet around the wrist matching the reference's exact style, color, and material. Render with correct curvature around the wrist and a soft shadow underneath.",
  watch:
    "CRITICAL: REMOVE any existing watch/bracelet on the visible wrist. Place the new watch with dial facing camera-natural. Match the reference's dial, hands, strap color, and material exactly. Strap must wrap the wrist with correct perspective and a shadow underneath.",
  sunglasses:
    "CRITICAL: REMOVE any existing eyewear. Place the sunglasses on the bridge of the nose, fully covering the eyes, aligned to head tilt and face angle. Match the reference's frame shape, color, and lens tint exactly. Add subtle lens reflections and a soft shadow on the cheeks.",
  hat:
    "CRITICAL: Place the hat/cap on the head following head angle and hair volume. Match the reference's exact shape, color, brim, and logo/details. The hat must clearly sit on the head with a realistic shadow on the forehead — do not just overlay a flat image.",
  scarf:
    "CRITICAL: Drape the scarf/dupatta naturally based on pose — around the neck, over a shoulder, or across the chest. Match the reference's exact color, pattern, and fabric. Render realistic fabric flow, folds, and shadows so it clearly looks worn.",
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
    const resolveOnly: boolean = !!body.resolveOnly;
    // Backward compatible: accept single itemImageUrl or array of items
    const items: { imageUrl?: string; productUrl?: string; label?: string; category?: Category }[] =
      Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [{ imageUrl: body.itemImageUrl, productUrl: body.productUrl, label: body.itemLabel, category: body.category }];

    if (!items.some((i) => i.imageUrl || i.productUrl || i.label)) {
      return json({ error: "Provide at least one item image, link, or description" }, 400);
    }
    if (!resolveOnly && !photoPath) return json({ error: "Missing photoPath" }, 400);

    // -------- resolveOnly: search + score candidates without generating --------
    if (resolveOnly) {
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      const it = items[0];
      // Direct image → nothing to search, just echo back.
      if (it.productUrl && /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(it.productUrl)) {
        return json({
          success: true,
          confidence: "high",
          best: { imageUrl: it.productUrl, title: it.label ?? it.productUrl, sourceDomain: safeHost(it.productUrl), score: 100 },
          candidates: [{ imageUrl: it.productUrl, title: it.label ?? it.productUrl, sourceDomain: safeHost(it.productUrl), score: 100 }],
        });
      }
      // Product page URL → scrape main image only.
      if (it.productUrl) {
        const img = await scrapeProductPageImage(it.productUrl, FIRECRAWL_API_KEY);
        if (!img) {
          return json({
            success: false,
            code: "PRODUCT_IMAGE_NOT_FOUND",
            error: "Couldn't extract a product image from that page. Try a different link or upload the garment image.",
          }, 200);
        }
        return json({
          success: true,
          confidence: "high",
          best: { imageUrl: img, title: it.label ?? it.productUrl, sourceDomain: safeHost(it.productUrl), score: 90 },
          candidates: [{ imageUrl: img, title: it.label ?? it.productUrl, sourceDomain: safeHost(it.productUrl), score: 90 }],
        });
      }
      // Product name → multi-query search + scoring.
      const q = (it.label ?? "").trim();
      if (!q) return json({ success: false, code: "PRODUCT_QUERY_EMPTY", error: "Enter a product name." }, 200);
      if (!FIRECRAWL_API_KEY) {
        return json({
          success: false,
          code: "PRODUCT_SEARCH_NOT_CONFIGURED",
          error: "Product-name search needs a search provider. Paste the product page link or upload the garment image.",
        }, 200);
      }
      const scored = await findProductCandidates(q, FIRECRAWL_API_KEY);
      const MIN_CONFIDENCE = 45;
      const top = scored.slice(0, 6);
      if (!top.length || top[0].score < MIN_CONFIDENCE) {
        return json({
          success: false,
          code: "LOW_PRODUCT_MATCH_CONFIDENCE",
          error: "We found similar products but could not confidently identify the exact item. Please paste the product page link or upload the garment image.",
          candidates: top,
        }, 200);
      }
      return json({
        success: true,
        confidence: top[0].score >= 70 ? "high" : "medium",
        best: top[0],
        candidates: top,
      });
    }

    // Resolve pasted product links (Myntra/Ajio/Amazon/Pinterest/Instagram) or
    // plain product names into a usable reference image server-side.
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    for (const it of items) {
      if (it.imageUrl) continue;
      try {
        let img: string | undefined;
        const query = it.label?.trim();

        // If the URL is already a direct image, use it as-is (Pinterest CDN etc.)
        if (it.productUrl && /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(it.productUrl)) {
          img = it.productUrl;
        }

        if (!img && it.productUrl && FIRECRAWL_API_KEY) {
          const fc = await fetch("https://api.firecrawl.dev/v2/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: it.productUrl,
              formats: ["markdown", "html"],
              onlyMainContent: false,
              waitFor: 1500,
            }),
          });
          if (fc.ok) {
            const d = await fc.json();
            const meta = d?.data?.metadata ?? d?.metadata ?? {};
            img = meta.ogImage || meta["og:image"] || meta.twitterImage || meta["twitter:image"] || meta.image;
            const html: string = d?.data?.html ?? d?.html ?? "";
            if (!img && html) img = extractImageFromHtml(html);
          } else {
            console.error("firecrawl scrape error", fc.status, await fc.text());
          }
        }

        if (!img && it.productUrl) {
          // Fallback: fetch the page HTML directly and extract image
          const html = await fetch(it.productUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml",
            },
          }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
          if (html) img = extractImageFromHtml(html);
        }

        // Resolve protocol-relative or root-relative URLs against product page
        if (img && it.productUrl) {
          try { img = new URL(img, it.productUrl).toString(); } catch { /* keep as-is */ }
        }

        if (!img && query) {
          if (!FIRECRAWL_API_KEY) {
            return json({
              success: false,
              code: "PRODUCT_SEARCH_NOT_CONFIGURED",
              error: "Product-name search needs a search provider. Paste the product page link or upload the garment image.",
            }, 400);
          }
          const scored = await findProductCandidates(query, FIRECRAWL_API_KEY);
          const MIN_CONFIDENCE = 45;
          if (!scored.length || scored[0].score < MIN_CONFIDENCE) {
            return json({
              success: false,
              code: "LOW_PRODUCT_MATCH_CONFIDENCE",
              error: "We found similar products but could not confidently identify the exact item. Please paste the product page link or upload the garment image.",
              candidates: scored.slice(0, 6),
            }, 200);
          }
          img = scored[0].imageUrl;
        }

        if (img) it.imageUrl = img;
        else return json({
          success: false,
          code: "PRODUCT_IMAGE_NOT_FOUND",
          error: "Couldn't find a product image. Paste a product page/image link or upload the garment image.",
        }, 404);
      } catch (e) {
        console.error("productUrl fetch failed", e);
        return json({
          success: false,
          code: "PRODUCT_FETCH_FAILED",
          error: "Couldn't read that product. Try a direct product link, image link, or upload the garment image.",
        }, 400);
      }
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
    const primary = enriched[0];
    const isClothes = ["clothes", "outfit"].includes(primary.category);
    const isFootwear = primary.category === "footwear";
    // Accessories = everything else (bag, necklace, earrings, ring, bracelet, watch, sunglasses, hat, scarf)
    const isAccessory = !isClothes && !isFootwear;

    // Per-category model routing:
    //  - clothes/outfit → fal.ai FASHN (best garment fit)
    //  - footwear       → Gemini 3 Pro image (best for full shoe replacement)
    //  - accessories    → Gemini 3.1 Flash image preview / Nano Banana 2 (best targeted edits)
    const accessoryModel = "google/gemini-3.1-flash-image-preview";
    const footwearModel = "google/gemini-3-pro-image-preview";
    const geminiModel = isFootwear ? footwearModel : accessoryModel;

    let mime = "image/png";
    let ext = "png";
    let bytes: Uint8Array | null = null;

    if (FAL_KEY && isClothes && enriched.length === 1 && primary.imageUrl) {
      try {
        const falResp = await fetch("https://fal.run/fal-ai/fashn/tryon/v1.6", {
          method: "POST",
          headers: {
            Authorization: `Key ${FAL_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model_image: signed.signedUrl,
            garment_image: primary.imageUrl,
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

    // Fallback / footwear / accessory path → Gemini image editing
    if (!bytes) {
      console.log("using gemini model", geminiModel, "for category", primary.category);
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: geminiModel,
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

// Try many common patterns to find a product/hero image in raw HTML.
// Covers og:image, twitter:image, link rel=image_src, JSON-LD image, and
// falls back to the first large-looking <img> src.
function extractImageFromHtml(html: string): string | undefined {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeHtml(m[1]);
  }
  // JSON-LD image field
  const ld = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ld?.[1]) {
    try {
      const j = JSON.parse(ld[1].trim());
      const arr = Array.isArray(j) ? j : [j];
      for (const node of arr) {
        const im = node?.image;
        if (typeof im === "string") return decodeHtml(im);
        if (Array.isArray(im) && typeof im[0] === "string") return decodeHtml(im[0]);
        if (im?.url) return decodeHtml(String(im.url));
      }
    } catch { /* ignore */ }
  }
  // First <img> with a plausible product source
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  for (const m of imgs) {
    const src = m[1];
    if (/\.(jpe?g|png|webp|avif)(\?|#|$)/i.test(src) && !/(logo|sprite|icon|placeholder|pixel|blank)/i.test(src)) {
      return decodeHtml(src);
    }
  }
  return undefined;
}

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&#x2F;/g, "/").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

// Normalize a product-name query while preserving brand + model info.
function normalizeQuery(q: string): string {
  return q.replace(/\s+/g, " ").trim().slice(0, 180);
}

const REJECT_HOST_PATTERNS = /(favicon|sprite|logo|placeholder|pixel|tracking|doubleclick|googletag|analytics)/i;
const REJECT_PATH_PATTERNS = /(favicon|sprite|logo|placeholder|blank|pixel|1x1|thumb_?(?:16|24|32|48|64))/i;

// HEAD-check a candidate image. Return true if it looks like a real product image.
async function validateImageCandidate(url: string): Promise<{ ok: boolean; reason?: string; host?: string }> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { ok: false, reason: "invalid-url" }; }
  if (!/^https?:$/.test(parsed.protocol)) return { ok: false, reason: "bad-protocol", host: parsed.hostname };
  if (REJECT_HOST_PATTERNS.test(parsed.hostname) || REJECT_PATH_PATTERNS.test(parsed.pathname)) {
    return { ok: false, reason: "blocklisted-pattern", host: parsed.hostname };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    let head = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" }).catch(() => null);
    clearTimeout(timer);
    // Some CDNs reject HEAD — fall back to a ranged GET.
    if (!head || !head.ok) {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 4000);
      head = await fetch(url, { method: "GET", headers: { Range: "bytes=0-2048" }, signal: c2.signal, redirect: "follow" }).catch(() => null);
      clearTimeout(t2);
    }
    if (!head || !head.ok) return { ok: false, reason: `unreachable-${head?.status ?? "net"}`, host: parsed.hostname };
    const ct = head.headers.get("content-type") ?? "";
    if (!/^image\//i.test(ct)) return { ok: false, reason: `bad-mime-${ct || "none"}`, host: parsed.hostname };
    const len = Number(head.headers.get("content-length") ?? "0");
    if (len && len < 4000) return { ok: false, reason: `too-small-${len}`, host: parsed.hostname };
    return { ok: true, host: parsed.hostname };
  } catch (e) {
    return { ok: false, reason: `error-${(e as Error).message}`, host: parsed.hostname };
  }
}

// ---------- Product-matching pipeline ----------

const CATEGORY_WORDS: Record<string, string[]> = {
  dress: ["dress","gown","frock"],
  top: ["top","tee","t-shirt","tshirt","shirt","blouse","kurta","kurti","tunic","cami","camisole"],
  bottom: ["jeans","pants","trousers","shorts","skirt","leggings","joggers","chinos","palazzo"],
  outerwear: ["jacket","coat","blazer","cardigan","hoodie","sweater","sweatshirt","parka"],
  jumpsuit: ["jumpsuit","romper","playsuit","dungaree"],
  ethnic: ["saree","lehenga","salwar","anarkali","dupatta","sherwani"],
  footwear: ["sneakers","shoes","boots","sandals","heels","flats","loafers","mules","pumps","slippers"],
  bag: ["bag","handbag","clutch","backpack","tote","sling","satchel","wallet","purse"],
  jewelry: ["necklace","earrings","ring","bracelet","bangle","pendant","choker"],
  accessory: ["watch","sunglasses","glasses","hat","cap","scarf","belt","tie"],
};
const COLOR_WORDS = [
  "red","blue","green","yellow","black","white","pink","purple","orange","brown","beige",
  "cream","navy","maroon","burgundy","olive","teal","turquoise","gold","silver","grey","gray",
  "ivory","tan","khaki","mustard","coral","lavender","peach","rose","wine","charcoal","nude",
];
const LENGTH_WORDS = ["mini","midi","maxi","knee-length","ankle-length","cropped","full-length","calf-length","short","long","knee","ankle"];
const SILHOUETTE_WORDS = [
  "a-line","a line","aline","bodycon","fit-and-flare","fit and flare","sheath","shift","wrap",
  "empire","peplum","mermaid","trumpet","column","skater","pencil","straight","flared",
  "bootcut","boot-cut","skinny","slim","relaxed","oversized","tailored","boxy",
  "one-shoulder","one shoulder","off-shoulder","off shoulder","strapless","halter","backless",
  "cut-out","cutout","draped","asymmetric","tiered","ruched","pleated","party",
];
const GENDER_WORDS = ["women","womens","woman","men","mens","man","girl","boy","kids","unisex","ladies","girls","boys"];
const NEGATIVE_CONTEXT = /(related|recommend|you[- ]?may|similar|also[- ]?bought|carousel|thumbnail)/i;
const EDITORIAL_CONTEXT = /(blog|magazine|editorial|lookbook|trends?|review|guide|how[- ]?to)/i;
const REJECT_TITLE = /(logo|banner|icon|favicon|advert|coupon|deal[- ]?of[- ]?the[- ]?day)/i;

interface ParsedQuery {
  raw: string;
  normalized: string;
  tokens: string[];
  brand: string | null;
  brandTokens: string[];
  gender: string | null;
  categoryKey: string | null;
  categoryWords: string[];
  colors: string[];
  lengths: string[];
  silhouettes: string[];
  quoted: string;
}

function parseQuery(q: string): ParsedQuery {
  const normalized = normalizeQuery(q);
  const lower = normalized.toLowerCase();
  const tokens = lower.split(/[^a-z0-9&']+/i).filter(Boolean);

  let categoryKey: string | null = null;
  const categoryWords: string[] = [];
  for (const [key, words] of Object.entries(CATEGORY_WORDS)) {
    for (const w of words) {
      if (lower.includes(w)) {
        if (!categoryKey) categoryKey = key;
        categoryWords.push(w);
      }
    }
  }
  const colors = COLOR_WORDS.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(lower));
  const lengths = LENGTH_WORDS.filter((l) => lower.includes(l));
  const silhouettes = SILHOUETTE_WORDS.filter((s) => lower.includes(s));
  const gender = GENDER_WORDS.find((g) => new RegExp(`\\b${g}\\b`, "i").test(lower)) ?? null;

  // Brand heuristic: leading capitalized words (up to 3) before the first attribute keyword.
  const originalTokens = normalized.split(/\s+/);
  const attributeSet = new Set<string>([
    ...GENDER_WORDS,
    ...LENGTH_WORDS,
    ...COLOR_WORDS,
    ...Object.values(CATEGORY_WORDS).flat(),
  ]);
  const brandTokens: string[] = [];
  for (const t of originalTokens) {
    const low = t.toLowerCase().replace(/[^a-z0-9&']/g, "");
    if (!low) continue;
    if (attributeSet.has(low)) break;
    // Only capitalized-first tokens count as brand (skip "the","by" etc.)
    if (!/^[A-Z0-9&]/.test(t)) break;
    brandTokens.push(t.replace(/[^A-Za-z0-9&']/g, ""));
    if (brandTokens.length >= 3) break;
  }
  const brand = brandTokens.length ? brandTokens.join(" ") : null;

  return {
    raw: q,
    normalized,
    tokens,
    brand,
    brandTokens: brandTokens.map((b) => b.toLowerCase()),
    gender,
    categoryKey,
    categoryWords,
    colors,
    lengths,
    silhouettes,
    quoted: `"${normalized}"`,
  };
}

function buildSearchVariants(p: ParsedQuery): string[] {
  const v: string[] = [];
  v.push(p.quoted);
  v.push(p.normalized);
  if (p.brand) {
    const core = [
      p.brand,
      ...p.colors,
      ...p.lengths,
      ...p.silhouettes,
      ...(p.categoryWords.slice(0, 1)),
    ].filter(Boolean).join(" ");
    if (core) v.push(core);
    if (p.categoryWords[0]) v.push(`${p.brand} ${p.gender ?? ""} ${p.categoryWords[0]}`.replace(/\s+/g, " ").trim());
  }
  // De-dupe preserving order.
  return Array.from(new Set(v)).slice(0, 4);
}

function scoreCandidate(p: ParsedQuery, cand: { title: string; snippet: string; imageUrl: string; sourceDomain: string }): { score: number; reasons: string[] } {
  const t = `${cand.title} ${cand.snippet}`.toLowerCase();
  const url = cand.imageUrl.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Exact / near-exact title.
  const normLower = p.normalized.toLowerCase();
  if (t.includes(normLower)) { score += 40; reasons.push("exact-title"); }
  else {
    const matchedTokens = p.tokens.filter((tok) => tok.length > 2 && t.includes(tok)).length;
    const pct = p.tokens.length ? matchedTokens / p.tokens.length : 0;
    if (pct >= 0.7) { score += 25; reasons.push(`token-match-${Math.round(pct*100)}%`); }
    else if (pct >= 0.4) { score += 10; reasons.push(`token-partial-${Math.round(pct*100)}%`); }
  }

  // Brand.
  if (p.brand) {
    const brandLow = p.brand.toLowerCase();
    const brandHit = t.includes(brandLow) || cand.sourceDomain.includes(brandLow.replace(/\s+/g, ""));
    if (brandHit) { score += 25; reasons.push("brand-match"); }
    // Conflicting brand: another known-ish brand token appears prominently and ours doesn't.
    if (!brandHit) {
      // Look for a "by <brand>" or leading capitalized brand in title that isn't ours.
      const foreign = /\b(zara|h&m|mango|nike|adidas|puma|shein|asos|uniqlo|forever\s?21|only|biba|w for woman|allen solly|tommy|calvin klein|gucci|prada|urbanic|vero moda)\b/i;
      const m = t.match(foreign);
      if (m && !brandLow.includes(m[0].toLowerCase())) { score -= 50; reasons.push(`wrong-brand-${m[0]}`); }
    }
  }

  // Category.
  if (p.categoryWords.length) {
    const catHit = p.categoryWords.some((w) => t.includes(w));
    if (catHit) { score += 15; reasons.push("category-match"); }
    else {
      // Conflicting category: text mentions a *different* category strongly.
      const otherCats = Object.entries(CATEGORY_WORDS)
        .filter(([k]) => k !== p.categoryKey)
        .flatMap(([, ws]) => ws);
      const conflict = otherCats.find((w) => new RegExp(`\\b${w}\\b`, "i").test(t));
      if (conflict) { score -= 50; reasons.push(`wrong-category-${conflict}`); }
    }
  }

  // Length / silhouette.
  if (p.lengths.length && p.lengths.some((l) => t.includes(l))) { score += 10; reasons.push("length-match"); }
  if (p.silhouettes.length && p.silhouettes.some((s) => t.includes(s))) { score += 10; reasons.push("silhouette-match"); }

  // Gender.
  if (p.gender && new RegExp(`\\b${p.gender}\\b`, "i").test(t)) { score += 5; reasons.push("gender-match"); }

  // Color.
  if (p.colors.length) {
    if (p.colors.some((c) => new RegExp(`\\b${c}\\b`, "i").test(t))) { score += 10; reasons.push("color-match"); }
    const otherColor = COLOR_WORDS.find((c) => !p.colors.includes(c) && new RegExp(`\\b${c}\\b`, "i").test(t));
    if (otherColor) { score -= 20; reasons.push(`wrong-color-${otherColor}`); }
    // Floral penalty when query implies solid (no "floral"/"print" tokens).
    if (!/floral|print|pattern/.test(normLower) && /floral|print/.test(t)) { score -= 15; reasons.push("unwanted-print"); }
  }

  // Context penalties.
  if (NEGATIVE_CONTEXT.test(cand.title) || NEGATIVE_CONTEXT.test(url)) { score -= 30; reasons.push("carousel-context"); }
  if (EDITORIAL_CONTEXT.test(cand.title) || EDITORIAL_CONTEXT.test(cand.sourceDomain)) { score -= 20; reasons.push("editorial"); }
  if (REJECT_TITLE.test(cand.title)) { score = -999; reasons.push("logo-or-banner"); }

  return { score, reasons };
}

interface ScoredCandidate {
  imageUrl: string;
  title: string;
  sourceDomain: string;
  score: number;
  reasons?: string[];
}

async function findProductCandidates(query: string, firecrawlKey: string): Promise<ScoredCandidate[]> {
  const parsed = parseQuery(query);
  const variants = buildSearchVariants(parsed);
  console.log("[product-search] parsed:", JSON.stringify({
    brand: parsed.brand, categoryKey: parsed.categoryKey,
    colors: parsed.colors, lengths: parsed.lengths, silhouettes: parsed.silhouettes,
  }));
  console.log("[product-search] variants:", variants);

  type Raw = { imageUrl: string; title: string; snippet: string; sourceDomain: string; source: string };
  const seen = new Set<string>();
  const raws: Raw[] = [];

  for (const q of variants) {
    try {
      const r = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, sources: ["images", "web"], limit: 8 }),
      });
      if (!r.ok) { console.error("[product-search] variant failed", q, r.status); continue; }
      const d = await r.json();
      const payload = d?.data ?? d;
      const imgs: any[] = Array.isArray(payload?.images) ? payload.images : [];
      const webs: any[] = Array.isArray(payload?.web) ? payload.web : Array.isArray(payload?.data) ? payload.data : [];

      for (const it of imgs) {
        const u = it?.imageUrl || it?.url || it?.src;
        if (typeof u !== "string" || seen.has(u)) continue;
        seen.add(u);
        raws.push({
          imageUrl: u,
          title: String(it?.title ?? it?.alt ?? ""),
          snippet: String(it?.description ?? it?.snippet ?? it?.position ?? ""),
          sourceDomain: safeHost(it?.url ?? u),
          source: "image-search",
        });
      }
      for (const row of webs) {
        const meta = row?.metadata ?? {};
        const u = meta.ogImage || meta["og:image"] || meta.twitterImage || meta["twitter:image"] || meta.image;
        if (typeof u !== "string") continue;
        let abs = u;
        try { abs = new URL(u, row?.url).toString(); } catch { /* keep */ }
        if (seen.has(abs)) continue;
        seen.add(abs);
        raws.push({
          imageUrl: abs,
          title: String(row?.title ?? meta.title ?? ""),
          snippet: String(row?.description ?? meta.description ?? ""),
          sourceDomain: safeHost(row?.url ?? abs),
          source: "web-og",
        });
      }
    } catch (e) {
      console.error("[product-search] variant threw", q, (e as Error).message);
    }
  }

  console.log("[product-search] raw candidates:", raws.length);

  // Score first, then validate only the top-N URLs (avoids wasted HEAD calls).
  const scored = raws
    .map((r) => ({ raw: r, ...scoreCandidate(parsed, r) }))
    .sort((a, b) => b.score - a.score);

  console.log("[product-search] top 5 scores:",
    scored.slice(0, 5).map((s) => ({ score: s.score, host: s.raw.sourceDomain, title: s.raw.title.slice(0, 60), reasons: s.reasons })));

  const results: ScoredCandidate[] = [];
  for (const s of scored) {
    if (s.score < 0) continue;
    if (results.length >= 6) break;
    const v = await validateImageCandidate(s.raw.imageUrl);
    if (!v.ok) { console.log("[product-search] validate reject", v.host, v.reason); continue; }
    results.push({
      imageUrl: s.raw.imageUrl,
      title: s.raw.title || s.raw.sourceDomain,
      sourceDomain: s.raw.sourceDomain,
      score: s.score,
      reasons: s.reasons,
    });
  }
  console.log("[product-search] final scored candidates:", results.length,
    results.map((r) => ({ score: r.score, host: r.sourceDomain })));
  return results;
}

function safeHost(u?: string): string {
  if (!u) return "";
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}

async function scrapeProductPageImage(url: string, firecrawlKey?: string): Promise<string | undefined> {
  let img: string | undefined;
  if (firecrawlKey) {
    try {
      const fc = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown", "html"], onlyMainContent: false, waitFor: 1500 }),
      });
      if (fc.ok) {
        const d = await fc.json();
        const meta = d?.data?.metadata ?? d?.metadata ?? {};
        img = meta.ogImage || meta["og:image"] || meta.twitterImage || meta["twitter:image"] || meta.image;
        const html: string = d?.data?.html ?? d?.html ?? "";
        if (!img && html) img = extractImageFromHtml(html);
      }
    } catch { /* ignore */ }
  }
  if (!img) {
    try {
      const html = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
      if (html) img = extractImageFromHtml(html);
    } catch { /* ignore */ }
  }
  if (img) {
    try { img = new URL(img, url).toString(); } catch { /* keep */ }
    const v = await validateImageCandidate(img);
    if (!v.ok) return undefined;
  }
  return img;
}
