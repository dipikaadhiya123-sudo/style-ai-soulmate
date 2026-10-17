import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Public (non-secret) fallbacks so a host that forgets to inject the
  // variables still produces a working build instead of a startup error.
  const FALLBACK_URL = "https://gvbjqgpkaconywgmzbcw.supabase.co";
  const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2YmpxZ3BrYWNvbnl3Z216YmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2Mjk5OTYsImV4cCI6MjA5MzIwNTk5Nn0.Er3to0xM4MgscBZZ2H7Xx0JwphnhQB4vQz8WZyMnZr8";
  const supabaseUrl = env.VITE_SUPABASE_URL || FALLBACK_URL;
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY ||
    (supabaseUrl === FALLBACK_URL ? FALLBACK_KEY : "");

  return ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // Broad Safari/iOS support so older mobile browsers don't fail to parse
    // the bundle and render a blank page.
    target: ["es2019", "safari13", "chrome80", "firefox78"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    // Support Vercel projects that still use the older ANON_KEY variable name.
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  });
});
