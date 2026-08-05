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
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Studio = lazy(() => import("./pages/Studio"));
const Stylist = lazy(() => import("./pages/Stylist"));
const TryOn = lazy(() => import("./pages/TryOn"));
const Lookbook = lazy(() => import("./pages/Lookbook"));
const MyLooks = lazy(() => import("./pages/MyLooks"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const SharedOutfit = lazy(() => import("./pages/SharedOutfit"));
const SharedLook = lazy(() => import("./pages/SharedLook"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const SubscriptionPage = lazy(() => import("./pages/subscription/SubscriptionPage"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const AdminRevenue = lazy(() => import("./pages/AdminRevenue"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));
const CommunityGuidelines = lazy(() => import("./pages/legal/CommunityGuidelines"));
const ContentModerationPolicy = lazy(() => import("./pages/legal/ContentModerationPolicy"));
const CopyrightPolicy = lazy(() => import("./pages/legal/CopyrightPolicy"));
const ContactUs = lazy(() => import("./pages/legal/ContactUs"));
const AboutUs = lazy(() => import("./pages/legal/AboutUs"));

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
