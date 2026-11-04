# Project Engineering Rules

- Production builds accept either `VITE_SUPABASE_PUBLISHABLE_KEY` or legacy `VITE_SUPABASE_ANON_KEY`; normalize in Vite config because hosting providers use both names.
- Load the application dynamically only after public backend configuration is present, so a missing deployment variable shows a recovery screen instead of crashing before React mounts.
- Use Lovable managed social authentication for Google and return through the same-origin `/auth/callback` route so production and preview redirects share one supported flow.
- Wrap every Edge Function handler with the shared CORS wrapper so preflight is handled first and CORS headers are applied to all responses, including errors.
- Keep shared Edge Function modules under `supabase/functions/_shared` because deployment bundles cannot resolve imports from the repository-root `_shared` directory.
- When AI generation hits 429, `tryon-generate` retries once honoring `Retry-After` (capped at 3s), then returns `basicPreview`; the client composes the fallback image itself on a local canvas (zero cost) and never describes it as realistic AI try-on.
- The Android app (Capacitor) bundles the web build locally (`dist`) — no `server.url` — so a Play Store release must be re-synced (`npm run build && npx cap sync android`) after any web change; release signing reads `android/keystore.properties` + `android/styleai-release.keystore`, which are gitignored and must be backed up safely (losing the key blocks future Play Store updates).