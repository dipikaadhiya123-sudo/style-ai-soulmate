// Billing Portal - Stripe Customer Portal
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const {createClient} = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;
    const { data: sub } = await supabase.from("subscriptions").select("provider_customer_id").eq("user_id", user.id).eq("payment_provider","stripe").maybeSingle();
    if (!sub?.provider_customer_id) return json({ error: "No Stripe customer found" }, 404);
    const stripe = new (await import("https://esm.sh/stripe@14.0.0?target=deno")).Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const body = await req.json();
    const portal = await stripe.billingPortal.sessions.create({ customer: sub.provider_customer_id, return_url: body.returnUrl });
    return json({
      url: portal.url
    });
  } catch (e) { return json({ error: e.message }, 500); }
});
function json(b, s=200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }