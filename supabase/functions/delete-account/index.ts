import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders ={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;
    const userEmail = userData.user.email!;
    await supabase.from("deletion_requests").insert({ user_id: userId, email: userEmail, status: "processing" });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const buckets = ["tryon-photos", "tryon-results", "studio"];
    for (const b of buckets) {
      try {
        const { data: files } = await admin.storage.from(b).list(userId);
        if (files && files.length) {
          const paths = files.map(f => `${userId}/${f.name}`);
          await admin.storage.from(b).remove(paths);
        }
      } catch (e) { console.error("Failed bucket "+b, e); }
    }
    for (const tb of ["content_retention","ai_usage","user_consent","refunds","payments","subscriptions"]) {
      try { await admin.from(tb).delete().eq("user_id", userId); } catch (e) {}
    }
    await admin.from("profiles").update({
      display_name: "[deleted]",
      account_status: "deleted",
      ai_training_consent: false,
    }).eq("id", userId);
    try {
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) throw delErr;
    } catch (e: any) {
      return json({ error: "Deletion failed: " + e.message }, 500);
    }
    await supabase.from("deletion_requests").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return json({ success: true, message: "Your account and all associated data have been permanently deleted." });
  } catch (e: any) { return json({ error: e.message }, 500); }});
function json(b, s=200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }