import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
deno.serve(async () => {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: deleted, error } = await admin.rpc("cleanup_expired_content");
    if (error) {
      return new Response(JSON.stringify({ error: error.message, deleted: 0 }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, deleted }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});