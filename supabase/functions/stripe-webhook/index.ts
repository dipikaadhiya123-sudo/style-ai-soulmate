// Stripe Webhook
const corsHeaders = {"Access-Control-Allow-Origin":"*"};
deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return json({ error: "Missing signature" }, 400);
    const body = await req.text();
    const stripe = new (await import("https://esm.sh/stripe@14.0.0?target=deno")).Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
    const supabase = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const uid = s.client_reference_id;
        if (!uid) break;
        const sub = await stripe.subscriptions.retrieve(s.subscription);
        const [pId, period] = (sub.items.data[0].price.lookup_key || "free_monthly").split("_");
        await supabase.from("subscriptions").upsert({
          user_id: uid, plan_id: pId, status: sub.status, billing_period: period || "monthly",
          payment_provider: "stripe", provider_subscription_id: s.subscription,
          provider_customer_id: s.customer,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          auto_renew: !sub.cancel_at_period_end,
        }, { onConflict: "provider_subscription_id" });
        await supabase.from("payments").insert({
          user_id: uid, payment_provider: "stripe", provider_payment_id: s.payment_intent,
          amount: sub.items.data[0].price.unit_amount, currency: sub.currency,
          status: "completed", description: `Subscription: ${pId} (${period})`,
          billing_reason: "subscription_create", paid_at: new Date().toISOString(),
        });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        await supabase.from("subscriptions").update({
          status: sub.status, cancel_at_period_end: sub.cancel_at_period_end,
          auto_renew: !sub.cancel_at_period_end,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("provider_subscription_id", sub.id);
        break;
      }
      case "customer.subscription.deleted": {
        await supabase.from("subscriptions").update({ status: "canceled" }).eq("provider_subscription_id", event.data.object.id);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object;
        await supabase.from("subscriptions").update({ status: "past_due" }).eq("provider_subscription_id", inv.subscription);
        break;
      }
    }
    return json({ received: true });
  } catch (e) { return json({ error: e.message }, 400); }
});
function json(b, s=200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }