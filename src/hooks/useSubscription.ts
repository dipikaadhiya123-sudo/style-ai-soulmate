import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Plan {
  id: string;
  name: string;
  price_monthly_usd: number;
  price_yearly_usd: number;
  price_monthly_inr: number;
  price_yearly_inr: number;
  features: string[];
  ai_generations_per_month: number | null;
  processing_priority: string;
  premium_models: boolean;
  team_access: boolean;
  commercial_rights: boolean;
  priority_support: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  billing_period: string;
  payment_provider: string;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  auto_renew: boolean;
  plan?: Plan;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<{ count: number; limit: number | null } | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    if (!user) return;
    try {
      const { data: p } = await (supabase as any)
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      const planList: Plan[] = p ?? [];
      setPlans(planList);

      const { data: s } = await (supabase as any)
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due", "paused"])
        .order("created_at", { ascending: false })
        .limit(1);

      let activePlan: Plan | undefined;
      if (s && s.length > 0) {
        activePlan = planList.find((x) => x.id === s[0].plan_id) || planList[0];
        setSubscription({ ...s[0], plan: activePlan });
      }

      const mon = new Date().toISOString().slice(0, 7);
      const { data: u } = await (supabase as any)
        .from("ai_usage")
        .select("count")
        .eq("user_id", user.id)
        .eq("month_year", mon);

      const count = u && u.length > 0 ? u[0].count : 0;
      const limit = activePlan?.ai_generations_per_month ?? planList[0]?.ai_generations_per_month ?? null;
      setUsage({ count, limit });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function checkAiUsage(): Promise<{ allowed: boolean; message?: string }> {
    if (!user) return { allowed: false, message: "Please sign in." };
    try {
      const { data, error } = await (supabase as any).rpc("increment_ai_usage", { p_user_id: user.id });
      if (error) {
        if (error.message?.includes("limit")) return { allowed: false, message: error.message };
        return { allowed: false, message: "Failed to check usage" };
      }
      setUsage((prev) => ({ count: data as number, limit: prev?.limit ?? null }));
      return { allowed: true };
    } catch (e: any) {
      return { allowed: false, message: e?.message };
    }
  }

  return { subscription, plans, loading, usage, checkAiUsage, refresh: loadData };
}
