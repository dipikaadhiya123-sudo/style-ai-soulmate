
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthRedirect } from "@/lib/authRedirect";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in\u2026");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let replaced = false;

    function replaceUrl() {
      if (replaced) return;
      try {
        const url = new URL(window.location.href);
        url.hash = "";
        const keys = ["code","access_token","refresh_token","expires_at","expires_in","token_type","type","error","error_code","error_description","redirect"];
        let changed = false;
        keys.forEach(k => { if (url.searchParams.has(k)) { url.searchParams.delete(k); changed = true; } });
        if (changed || window.location.hash) {
          window.history.replaceState(null, "", `${url.pathname}${url.search}`);
          replaced = true;
        }
      } catch (_e) { /* ignore */ }
    }

    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const hash = window.location.hash.replace(/^#/, "");
        const hp = new URLSearchParams(hash);
        hp.forEach((v, k) => { if (!sp.has(k) || v) sp.set(k, v); });

        const code = sp.get("code");
        const accessToken = sp.get("access_token");
        const refreshToken = sp.get("refresh_token");
        const errorDesc = sp.get("error_description") ?? sp.get("error");
        const redirectRaw = sp.get("redirect");

        if (errorDesc) throw new Error(errorDesc);
        const redirectTo = consumeAuthRedirect(redirectRaw);

        setMessage("Verifying your identity\u2026");

        if (code) {
          setMessage("Exchanging code for session…");

          const { error: exchangeErr } =
          await supabase.auth.exchangeCodeForSession(code);

          console.log("Exchange Error:", exchangeErr);

          const { data, error: sessionError } =
          await supabase.auth.getSession();

          console.log("Session:", data.session);
          console.log("Session Error:", sessionError);

        if (exchangeErr) throw exchangeErr;
          const { data } = await supabase.auth.getSession();
        } else if (accessToken && refreshToken) {
          setMessage("Setting up your session\u2026");
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionErr) throw sessionErr;
        } else {
          setMessage("No sign-in data found. Redirecting\u2026");
          setTimeout(() => navigate("/auth", { replace: true }), 500);
          return;
        }

        if (!active) return;
        replaceUrl();
        replaced = true;
        setMessage("Taking you inside\u2026");
        setTimeout(() => {
          if (active) navigate(redirectTo, { replace: true });
        }, 300);
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Google sign-in failed";
        setError(msg);
        toast.error(msg);
        replaceUrl();
        setTimeout(() => navigate("/auth", { replace: true }), 1500);
      }
    })();

    return () => { active = false; };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-elev">
        {error ? (
          <>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <h1 className="font-display text-xl font-medium">Sign-in Failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <p className="mt-4 text-xs text-muted-foreground">Redirecting to login\u2026</p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-accent" />
            <h1 className="font-display text-2xl font-medium">Google sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
