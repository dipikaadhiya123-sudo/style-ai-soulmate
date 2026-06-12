import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind ?? "");
    const slug = String(body.slug ?? "").trim();

    if (!/^[-a-zA-Z0-9_]{6,80}$/.test(slug)) return json({ error: "Invalid link" }, 400);
    if (kind !== "look" && kind !== "outfit") return json({ error: "Invalid type" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (kind === "outfit") {
      const { data, error } = await admin
        .from("outfits")
        .select("share_slug, occasion, title, items, style_score, score_breakdown, rationale, suggestions, created_at")
        .eq("saved", true)
        .eq("share_slug", slug)
        .maybeSingle();

      if (error) throw error;
      return json({ outfit: data ?? null });
    }

    const { data, error } = await admin
      .from("looks")
      .select("share_slug, item_label, category, description, highlights, result_image_path, photo_path, created_at")
      .eq("saved", true)
      .eq("share_slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ look: null });

    const { data: photo } = await admin.storage.from("tryon-photos").createSignedUrl(data.photo_path, 3600);
    const { data: result } = data.result_image_path
      ? await admin.storage.from("tryon-results").createSignedUrl(data.result_image_path, 3600)
      : { data: null };

    return json({
      look: data,
      photoUrl: photo?.signedUrl ?? null,
      resultUrl: result?.signedUrl ?? null,
    });
  } catch (error) {
    console.error(error);
    return json({ error: "Couldn't open shared link" }, 500);
  }
});