// Cancel Subscription
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
    const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).in("status",["active","trialing","past_due"]).maybeSingle();
    if (!sub) return json({ error: "No active subscription" }, 404);
    const body = await req.json();
    if (sub.payment_provider === "stripe") {
      const stripe = new (await import("https://esm.sh/stripe@14.0.0?target=deno")).Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
      if (body.cancelImmediately) {
        await stripe.subscriptions.cancel(sub.provider_subscription_id);
      } else {
        await stripe.subscriptions.update(sub.provider_subscription_id, { cancel_at_period_end: true });
      }
    } else if (sub.payment_provider === "razorpay") {
      const id = Deno.env.get("RAZORPAY_KEY_ID")!;
      const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
      const auth = btoa(`${id}:${secret}`);
      await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.provider_subscription_id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}` },
        body: JSON.stringify(body.cancelImmediately ? { cancel_at_cycle_end: 0 } : { cancel_at_cycle_end: 1 }),
      });
    }
    await supabase.from("subscriptions").update({ status: body.cancelImmediately ? "canceled" : "active", canceled_at: new Date().toISOString(), cancel_at_period_end: !body.cancelImmediately, auto_renew: false }).eq("id", sub.id);
    return json({ success: true, message: body.cancelImmediately ? "Canceled immediately" : "Will cancel at period end" });
  } catch (e) { return json({ error: e.message }, 500); }
});
function json(b, s=200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }