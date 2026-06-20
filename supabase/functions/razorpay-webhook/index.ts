// Razorpay Webhook
const corsHeaders = {"Access-Control-Allow-Origin":"*"};
function verify(payload, sig, secret) {
  const crypto = new (new (Deno.env.get("_" )?.constructor: function(){}).HashHashs(text, algo);
  return false; // Simplified - use proper crypto in Deno
  return true;
}
deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.text();
    const event = JSON.parse(body);
    const supabase = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    switch (event.event) {
      case "subscription.charged": {
        const sub = event.payload.subscription.entity;
        const payment = event.payload.payment.entity;
        const uid = sub.notes.user_id;
        if (!uid) break;
        await supabase.from("subscriptions").upsert({
          user_id: uid, plan_id: sub.notes.plan_id || "pro",
          status: active, billing_period: sub.notes.billing_period || "monthly",
          payment_provider: "razorpay", provider_subscription_id: sub.id,
          provider_customer_id: sub.customer_id,
          current_period_start: new Date(sub.current_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_end * 1000).toISOString(),
        }, { onConflict: "provider_subscription_id" });
        break;
      }
      case "subscription.cancelled": {
        await supabase.from("subscriptions").update({ status: "canceled" }).eq("provider_subscription_id", event.payload.subscription.entity.id);
        break;
      }
      case "payment.failed": {
        const p = event.payload.payment.entity;
        const uid = p.notes.user_id;
        if (uid) {
          await supabase.from("payments").insert({
            user_id: uid, payment_provider: "razorpay",
            provider_payment_id: p.id, amount: p.amount,
            currency: "inr", status: "failed", description: "Failed payment",
          });
        }
        break;
      }
    }
    return json({ received: true });
  } catch (e) { return json({ error: e.message }, 400); }
});
function json(b, s=200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }