// Create Checkout - Stripe or Razorpay checkout session
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
    
    const body = await req.json();
    const { planId, billingPeriod, provider, successUrl, cancelUrl, currency, trial } = body;
    
    if (!["pro","business"].includes(planId)) return json({ error: "Invalid plan" }, 400);
    
    const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
    if (!plan) return json({ error: "Plan not found" }, 404);
    
    if (provider === "stripe") {
      const stripe = new (await import("https://esm.sh/stripe@14.0.0?target=deno")).Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
      const priceId = billingPeriod === "yearly" ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        client_reference_id: user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: trial ? { trial_period_days: 7 } : undefined,
        metadata: { user_id: user.id, plan_id: planId, billing_period: billingPeriod },
      });
      return json({ provider: "stripe", checkoutUrl: session.url, sessionId: session.id });
    }
    
    if (provider === "razorpay") {
      const id = Deno.env.get("RAZORPAY_KEY_ID")!;
      const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
      const amount = currency === "inr" ? billing === "yearly" ? plan.price_yearly_inr : plan.price_monthly_inr : billing === "yearly" ? plan.price_yearly_usd : plan.price_monthly_usd;
      const auth = btoa(`${id}:${secret}`);
      const orderResp = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount, currency: currency === "inr" ? "INR" : "USD",
          receipt: `rcpt_${user.id.slice(0,8)},
          notes: { user_id: user.id, plan_id: planId, billing_period: billingPeriod },
        }),
      });
      const order = await orderResp.json();
      return json({ provider: "razorpay", orderId: order.id, amount: order.amount, currency: order.currency, keyId: id });
    }
    return json({ error: "Invalid provider" }, 400);
  } catch (e) { return json({ error: e.message }, 500); }
});

function json(b, s=200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }