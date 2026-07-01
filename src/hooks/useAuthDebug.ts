// Auth Debug - real-time session, user, and auth event tracking
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export default function useAuthDebug() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isEnabled = window.location.search.includes("debug=true");
    setEnabled(isEnabled);
    if (!isEnabled) return;

    const log = (msg: string) => {
      setEvents((prev) => [...prev.slice(-49), `${new Date().toISOString().slice(11, 19)} ${msg}`]);
      console.log(`[AuthDebug] ${msg}`);
    };

    log("Debug enabled");

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) log(`getSession error: ${error.message}`);
      else if (data.session) {
        log(`Session found: ${data.session.user.email}`);
        setSession(data.session);
        setUser(data.session.user);
      } else log("No session");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN") {
        log(`SIGNED_IN ${s?.user.email}`);
        setSession(s);
        setUser(s?.user ?? null);
      } else if (event === "SIGNED_OUT") {
        log("SIGNED_OUT");
        setSession(null);
        setUser(null);
      } else if (event === "INITIAL_SESSION") {
        log("INITIAL_SESSION");
        setSession(s);
        setUser(s?.user ?? null);
      } else {
        log(`Auth event: ${event}`);
      }
    });

    log(`Path: ${window.location.pathname}`);

    return () => sub.subscription.unsubscribe();
  }, []);

  const clearSession = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setEvents((prev) => [...prev, "Session cleared"]);
  };
  return { session, user, events, enabled, clearSession };
}
