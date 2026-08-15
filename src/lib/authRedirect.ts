import { supabase } from "@/integrations/supabase/client";

const DEFAULT_REDIRECT = "/stylist";

const APP_ROUTES = new Set([
  "/onboarding",
  "/studio",
  "/stylist",
  "/tryon",
  "/lookbook",
  "/looks",
  "/chat",
  "/wishlist",
  "/profile",
  "/subscription",
  "/payment-history",
]);

const AUTH_PARAM_KEYS = new Set([
  "access_token",
  "refresh_token",
  "expires_at",
  "expires_in",
  "token_type",
  "type",
  "code",
  "error",
  "error_code",
  "error_description",
]);

export function getSafeAuthRedirect(rawRedirect?: string | null) {
  if (!rawRedirect) return DEFAULT_REDIRECT;

  try {
    const redirect = decodeURIComponent(rawRedirect);
    if (!redirect.startsWith("/") || redirect.startsWith("//") || redirect.startsWith("/auth")) {
      return DEFAULT_REDIRECT;
    }

    const pathname = redirect.split(/[?#]/, 1)[0];
    if (!APP_ROUTES.has(pathname)) return DEFAULT_REDIRECT;

    return redirect;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

export function rememberAuthRedirect(redirectPath: string) {
  try {
    sessionStorage.setItem("postAuthRedirect", getSafeAuthRedirect(redirectPath));
  } catch {
    // Storage can be unavailable in private browsing; the callback has a safe default.
  }
}

export function consumeAuthRedirect(fallback?: string | null) {
  let storedRedirect: string | null = null;
  try {
    storedRedirect = sessionStorage.getItem("postAuthRedirect");
    sessionStorage.removeItem("postAuthRedirect");
  } catch {
    // Use the callback query parameter or the safe default.
  }
  return getSafeAuthRedirect(storedRedirect ?? fallback);
}

export function getAuthRedirectFromSearch(search: string) {
  return getSafeAuthRedirect(new URLSearchParams(search).get("redirect"));
}

export function buildAuthCallbackUrl(redirectPath: string) {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("redirect", getSafeAuthRedirect(redirectPath));
  return callbackUrl.toString();
}

function getOAuthParams() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });

  return params;
}

export async function completeOAuthRedirect() {
  const params = getOAuthParams();
  const redirectTo = getSafeAuthRedirect(params.get("redirect"));
  const errorDescription = params.get("error_description") ?? params.get("error");

  if (errorDescription) throw new Error(errorDescription);

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const code = params.get("code");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return { completed: true, redirectTo };
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return { completed: true, redirectTo };
  }

  return { completed: false, redirectTo };
}

export function stripOAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  let changed = Boolean(url.hash);
  url.hash = "";

  AUTH_PARAM_KEYS.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (changed) {
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }
}