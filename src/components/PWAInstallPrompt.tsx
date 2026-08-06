import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share2, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS home-screen detection
    (window.navigator as typeof window.navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show manual instructions on iOS Safari after a short delay
    if (ios) {
      const t = setTimeout(() => setShow(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden">
      <div className="mx-3 mb-[calc(4.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-elev">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-display text-sm font-semibold">Install StyleAI as an app</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIOS
                ? "Tap the share icon, then 'Add to Home Screen' for the app-like experience."
                : "Add StyleAI to your home screen to open it like a native app."}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="p-1 rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {isIOS ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2 flex-1">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
              <span className="text-border">→</span>
              <PlusSquare className="w-4 h-4" />
              <span>Add to Home Screen</span>
            </div>
          ) : (
            <Button size="sm" className="flex-1 bg-gradient-accent text-accent-foreground" onClick={handleInstall}>
              <Download className="w-4 h-4 mr-1.5" />
              Add to home screen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
