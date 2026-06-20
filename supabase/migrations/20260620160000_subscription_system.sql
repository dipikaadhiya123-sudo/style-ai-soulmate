-- Migration: Subscription & Payment System

CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_monthly_usd integer DEFAULT 0,
  price_yearly_usd integer DEFAULT 0,
  price_monthly_inr integer DEFAULT 0,
  price_yearly_inr integer DEFAULT 0,
  features jsonb DEFAULT '[]',
  ai_generations_per_month integer,
  processing_priority text DEFAULT 'normal',
  premium_models boolean DEFAULT false,
  team_access boolean DEFAULT false,
  commercial_rights boolean DEFAULT false,
  priority_support boolean DEFAULT false,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  razorpay_plan_id_monthly text,
  razorpay_plan_id_yearly text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO plans (id, name, description, price_monthly_usd, price_yearly_usd, price_monthly_inr, price_yearly_inr, features, ai_generations_per_month, processing_priority, premium_models, team_access, commercial_rights, priority_support, sort_order) VALUES
 ('free','Free','Get started',0,0,0,0,'["5 AI try-ons/month","Standard processing","Basic AI models","Community support"]',5,'normal',false,false,false,false,0),
 ('pro','Pro','For fashion enthusiasts',999,7990,49900,39900,'["Unlimited AI try-ons","Faster processing","Premium AI models","Priority support","Remove watermarks"]',NULL,'fast',true,false,false,true,1),
 ('business','Business','For teams & creators',2499,19990,129900,99900,'["Everything in Pro","Team access (5 seats)","Commercial usage rights","Priority support","API access","Custom branding"]',NULL,'fast',true,true,true,true,2) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, features=EXCLUDED.features;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES plans(id),
  status text DEFAULT 'active',
  billing_period text DEFAULT 'monthly',
  payment_provider text NOT NULL,
  provider_subscription_id text UNIQUE,
  provider_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  auto_renew boolean DEFAULT true,
  team_seats integer DEFAULT 1,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX on subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id),
  payment_provider text NOT NULL,
  provider_payment_id text NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  status text DEFAULT 'pending',
  description text,
  invoice_url text,
  invoice_number text,
  billing_reason text,
  metadata jsonb DEFAULT '{}',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX on payments(user_id, created_at);

CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id),
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  reason text,
  status text DEFAULT 'pending',
  provider_refund_id text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans viewable" ON plans FOR SELECT USING (is_active=true);
CREATE POLICY "Users view own subs" ON subscriptions FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Users view own pays" ON payments FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Users view own refunds" ON refunds FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Users create refunds" ON refunds FOR INSERW WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Users view own usage" ON ai_usage FOR SELECT USING (auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id uuid) RETURNS integer AS $$ DECLARE v_limit integer; v_cnt integer; v_mon text; BEGIN v_mon:=to_char(now(),'YYYY-MM'); SELECT p.ai_generations_per_month INTO v_limit FROM subscriptions s JOIN plans p ON s.plan_id=p.id WHERE s.user_id=p_user_id AND s.status IN ('active','trialing') ORDER BY s.created_at DESC LIMIT 1; INSERT INTO ai_usage (user_id, month_year, count) VALUES (p_user_id, v_mon, 1) ON CONFLICT (user_id, month_year) DO UPDATE SET count=ai_usage.count+1 RETURNING count INTO v_cnt; IF v_limit IS NOT NULL AND v_cnt>v_limit THEN RAISE EXCEPTION 'Generation limit reached. Upgrade for unlimited.'; END IF; $_; GRANT EXECUTE ON FUNCTION increment_ai_usage(uuid) TO AUTHENTICATED;