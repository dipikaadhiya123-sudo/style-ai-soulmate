import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import RootErrorBoundary from "./components/RootErrorBoundary.tsx";
import "./index.css";

const container = document.getElementById("root");

if (container) {
  try {
    createRoot(container).render(
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>,
    );
  } catch (error) {
    console.error("Failed to mount app:", error);
    container.innerHTML =
      '<div style="font-family:system-ui;padding:32px;text-align:center"><h1 style="font-size:20px">Something went wrong</h1><p style="color:#666;font-size:14px">Please reload the page.</p></div>';
  }
}
