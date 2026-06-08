// Permanently delete the authenticated user and all their stored photos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKETS = ["user-photos", "tryon-photos", "tryon-results"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) ?? {};
    const mode: "photos" | "account" = body.mode === "account" ? "account" : "photos";

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Wipe all files under <userId>/ in each bucket
    for (const bucket of BUCKETS) {
      const { data: list } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (list && list.length) {
        const paths = list.map((f) => `${userId}/${f.name}`);
        await admin.storage.from(bucket).remove(paths);
      }
    }

    if (mode === "account") {
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) {
        console.error("deleteUser err", delErr);
        return json({ error: "Failed to delete account" }, 500);
      }
    }

    return json({ ok: true, mode });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
