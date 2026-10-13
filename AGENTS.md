# Project Engineering Rules

- Production builds accept either `VITE_SUPABASE_PUBLISHABLE_KEY` or legacy `VITE_SUPABASE_ANON_KEY`; normalize in Vite config because hosting providers use both names.
- Load the application dynamically only after public backend configuration is present, so a missing deployment variable shows a recovery screen instead of crashing before React mounts.
- Use Lovable managed social authentication for Google and return through the same-origin `/auth/callback` route so production and preview redirects share one supported flow.
- Wrap every Edge Function handler with the shared CORS wrapper so preflight is handled first and CORS headers are applied to all responses, including errors.