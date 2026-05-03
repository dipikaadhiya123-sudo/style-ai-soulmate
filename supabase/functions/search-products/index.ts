// Search product/clothing images via Openverse (no API key required).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, category } = (await req.json().catch(() => ({}))) ?? {};
    const q = String(query ?? "").trim();
    if (!q) return json({ results: [] });

    const tag = category ? ` ${category}` : "";
    const url =
      `https://api.openverse.org/v1/images/?` +
      new URLSearchParams({
        q: `${q}${tag} product`,
        page_size: "18",
        license_type: "all",
        mature: "false",
      });

    const r = await fetch(url, { headers: { "User-Agent": "Lovable-TryOn/1.0" } });
    if (!r.ok) {
      console.error("Openverse error", r.status, await r.text());
      return json({ results: [] });
    }
    const data = await r.json();
    const results = (data.results ?? [])
      .filter((it: any) => it.thumbnail || it.url)
      .map((it: any) => ({
        id: it.id,
        title: it.title ?? q,
        thumbnail: it.thumbnail ?? it.url,
        url: it.url,
        source: it.source ?? null,
        creator: it.creator ?? null,
      }));

    return json({ results });
  } catch (e) {
    console.error(e);
    return json({ results: [], error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
