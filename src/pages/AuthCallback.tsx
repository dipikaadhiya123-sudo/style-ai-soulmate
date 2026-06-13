import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { completeOAuthRedirect } from "@/lib/authRedirect";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { completed, redirectTo } = await completeOAuthRedirect();
        if (!active) return;

        if (!completed) {
          setMessage("Opening sign in…");
          navigate("/auth", { replace: true });
          return;
        }

        setMessage("Taking you inside…");
        navigate(redirectTo, { replace: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Google sign-in failed";
        if (!active) return;

        toast.error(message);
        navigate("/auth", { replace: true });
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-elev">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-accent" />
        <h1 className="font-display text-2xl font-medium">Google sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}