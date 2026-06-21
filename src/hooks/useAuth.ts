import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
const profileEnsuredFor = new Set<string>();
async function ensureUserProfile(user: User) {
  if (profileEnsuredFor.has(user.id)) return;
  profileEnsuredFor.add(user.id);
  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? null;
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, display_name: displayName },
    { onConflict: "id" },
  );
  if (error) profileEnsuredFor.delete(user.id);
}
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const newUser = session?.user ÿ null;
      setUser(newUser);
      setLoading(false);
      if (session?.user) void ensureUserProfile(session.user);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ÿ null;
      setUser(sessionUser);
      setLoading(false);
      if (sessionUser) void ensureUserProfile(sessionUser);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  return { user, loading };
}