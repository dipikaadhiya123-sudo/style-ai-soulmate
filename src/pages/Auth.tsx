import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { buildAuthCallbackUrl, getAuthRedirectFromSearch } from "@/lib/authRedirect";

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const redirectTo = getAuthRedirectFromSearch(location.search);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirectTo, { replace: true });
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: buildAuthCallbackUrl(redirectTo),
      });
      if (result.error) throw result.error;
      if (!result.redirected) navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Google sign-in failed"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="container h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="inline-block w-7 h-7 rounded-md bg-gradient-accent" />
          StyleAI
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-elev"
        >
          <h1 className="font-display text-3xl font-medium mb-1.5">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-7">
            {mode === "signin" ? "Sign in to continue styling." : "Start your styling journey."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-5"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.5 6 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.5 7 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.3 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.9 36 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">or</span></div>
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-accent text-accent-foreground border-0 hover:opacity-95">
              {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="text-sm text-muted-foreground text-center mt-6">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-accent font-medium hover:underline"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
