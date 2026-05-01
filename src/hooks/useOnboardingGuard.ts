import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Routes user to /onboarding on first sign-in (when profile.onboarded is false).
 * Used inside AppLayout via a wrapper.
 */
export function useOnboardingGuard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    if (location.pathname === "/onboarding") return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .maybeSingle();
      if (data && !data.onboarded) {
        navigate("/onboarding", { replace: true });
      }
    })();
  }, [user, location.pathname, navigate]);
}
