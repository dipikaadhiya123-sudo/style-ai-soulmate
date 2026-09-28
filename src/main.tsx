import { createRoot } from "react-dom/client";
import RootErrorBoundary from "./components/RootErrorBoundary.tsx";
import "./index.css";

const container = document.getElementById("root");

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function showStartupError(message: string) {
  if (!container) return;
  container.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui;background:#f8f4ef;color:#26211f"><section style="max-width:420px;text-align:center"><h1 style="font-size:22px;margin:0 0 12px">StyleAI is temporarily unavailable</h1><p style="font-size:14px;line-height:1.5;color:#625b57">${message}</p><button onclick="window.location.reload()" style="margin-top:12px;padding:10px 16px;border:0;border-radius:6px;background:#c7432a;color:#fff;font-weight:600">Reload</button></section></main>`;
}

if (!supabaseUrl || !supabaseKey) {
  console.error("StyleAI startup configuration is missing.");
  showStartupError("The app configuration did not load correctly. Please try again shortly.");
} else if (container) {
  import("./App.tsx")
    .then(({ default: App }) => {
      createRoot(container).render(
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>,
      );
    })
    .catch((error: unknown) => {
      console.error("Failed to start app:", error);
      showStartupError("The app could not start. Please reload and try again.");
    });
}
