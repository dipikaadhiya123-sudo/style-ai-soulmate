import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/useTheme";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Eager: Landing, Auth, AuthCallback, NotFound — critical first-paint routes.
// Lazy: everything else — only loaded when the user navigates to them.
//
// After a new deploy, an old cached index can reference chunk files that no
// longer exist. That rejects the dynamic import and leaves a blank screen, so
// we retry once and then force a single hard reload to pick up fresh assets.
const RELOAD_KEY = "chunk-reload-attempted";

function lazyPage<T extends { default: React.ComponentType<unknown> }>(
  factory: () => Promise<T>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (error) {
      try {
        return await factory();
      } catch (retryError) {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}

const Onboarding = lazyPage(() => import("./pages/Onboarding"));

const Studio = lazyPage(() => import("./pages/Studio"));
const Stylist = lazyPage(() => import("./pages/Stylist"));
const TryOn = lazyPage(() => import("./pages/TryOn"));
const Lookbook = lazyPage(() => import("./pages/Lookbook"));
const MyLooks = lazyPage(() => import("./pages/MyLooks"));
const Chat = lazyPage(() => import("./pages/Chat"));
const Profile = lazyPage(() => import("./pages/Profile"));
const SharedOutfit = lazyPage(() => import("./pages/SharedOutfit"));
const SharedLook = lazyPage(() => import("./pages/SharedLook"));
const Wishlist = lazyPage(() => import("./pages/Wishlist"));
const SubscriptionPage = lazyPage(() => import("./pages/subscription/SubscriptionPage"));
const PaymentHistory = lazyPage(() => import("./pages/PaymentHistory"));
const AdminRevenue = lazyPage(() => import("./pages/AdminRevenue"));
const PrivacyPolicy = lazyPage(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazyPage(() => import("./pages/legal/TermsOfService"));
const RefundPolicy = lazyPage(() => import("./pages/legal/RefundPolicy"));
const CookiePolicy = lazyPage(() => import("./pages/legal/CookiePolicy"));
const CommunityGuidelines = lazyPage(() => import("./pages/legal/CommunityGuidelines"));
const ContentModerationPolicy = lazyPage(() => import("./pages/legal/ContentModerationPolicy"));
const CopyrightPolicy = lazyPage(() => import("./pages/legal/CopyrightPolicy"));
const ContactUs = lazyPage(() => import("./pages/legal/ContactUs"));
const AboutUs = lazyPage(() => import("./pages/legal/AboutUs"));

const queryClient = new QueryClient();

function ThemeBoot() {
  useTheme();
  return null;
}

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeBoot />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/index" element={<Navigate to="/" replace />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/outfit/:slug" element={<Suspense fallback={<PageFallback />}><SharedOutfit /></Suspense>} />
          <Route path="/look/:slug" element={<Suspense fallback={<PageFallback />}><SharedLook /></Suspense>} />
          <Route path="/subscription" element={<Suspense fallback={<PageFallback />}><SubscriptionPage /></Suspense>} />
          <Route path="/payment-history" element={<Suspense fallback={<PageFallback />}><PaymentHistory /></Suspense>} />
          <Route path="/admin/revenue" element={<Suspense fallback={<PageFallback />}><AdminRevenue /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<PageFallback />}><PrivacyPolicy /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<PageFallback />}><TermsOfService /></Suspense>} />
          <Route path="/refunds" element={<Suspense fallback={<PageFallback />}><RefundPolicy /></Suspense>} />
          <Route path="/cookies" element={<Suspense fallback={<PageFallback />}><CookiePolicy /></Suspense>} />
          <Route path="/guidelines" element={<Suspense fallback={<PageFallback />}><CommunityGuidelines /></Suspense>} />
          <Route path="/moderation" element={<Suspense fallback={<PageFallback />}><ContentModerationPolicy /></Suspense>} />
          <Route path="/copyright" element={<Suspense fallback={<PageFallback />}><CopyrightPolicy /></Suspense>} />
          <Route path="/contact" element={<Suspense fallback={<PageFallback />}><ContactUs /></Suspense>} />
          <Route path="/about" element={<Suspense fallback={<PageFallback />}><AboutUs /></Suspense>} />
          <Route element={<AppLayout />}>
            <Route path="/onboarding" element={<Suspense fallback={<PageFallback />}><Onboarding /></Suspense>} />
            <Route path="/studio" element={<Suspense fallback={<PageFallback />}><Studio /></Suspense>} />
            <Route path="/stylist" element={<Suspense fallback={<PageFallback />}><Stylist /></Suspense>} />
            <Route path="/tryon" element={<Suspense fallback={<PageFallback />}><TryOn /></Suspense>} />
            <Route path="/lookbook" element={<Suspense fallback={<PageFallback />}><Lookbook /></Suspense>} />
            <Route path="/looks" element={<Suspense fallback={<PageFallback />}><MyLooks /></Suspense>} />
            <Route path="/chat" element={<Suspense fallback={<PageFallback />}><Chat /></Suspense>} />
            <Route path="/wishlist" element={<Suspense fallback={<PageFallback />}><Wishlist /></Suspense>} />
            <Route path="/profile" element={<Suspense fallback={<PageFallback />}><Profile /></Suspense>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
