import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const profileEnsuredFor = new Set<string>();

async function ensureUserProfile(user: User) {
  if (!user?.id || profileEnsuredFor.has(user.id)) return;
  profileEnsuredFor.add(user.id);

  try {
    const metadata = user.user_metadata ?? {};
    const fullName =
      metadata.full_name ??
      metadata.name ??
      metadata.display_name ??
      user.email?.split("@")[0] ??
      "User";

    // Only update columns that exist in the profiles table.
    // The handle_new_user trigger creates the row on signup; this fills in
    // the display name from OAuth metadata if the trigger used a fallback.
    const { error } = await (supabase as any).from("profiles").upsert(
      {
        id: user.id,
        display_name: fullName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: false }
    );

    if (error) {
      console.warn("[useAuth] Failed to upsert profile:", error.message);
      profileEnsuredFor.delete(user.id);
    }
  } catch (err) {
    console.warn("[useAuth] ensureUserProfile error:", err);
    profileEnsuredFor.delete(user.id);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const newUser = session?.user || null;
      setUser(newUser);
      setLoading(false);
      if (session?.user) void ensureUserProfile(session.user);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user || null;
      setUser(sessionUser);
      setLoading(false);
      if (sessionUser) void ensureUserProfile(sessionUser);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  return { user, loading };
}