import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/useTheme";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Studio from "./pages/Studio";
import Stylist from "./pages/Stylist";
import TryOn from "./pages/TryOn";
import Lookbook from "./pages/Lookbook";
import MyLooks from "./pages/MyLooks";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import SharedOutfit from "./pages/SharedOutfit";
import SharedLook from "./pages/SharedLook";
import Wishlist from "./pages/Wishlist";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/AppLayout";
import SubscriptionPage from "./pages/subscription/SubscriptionPage";
import PaymentHistory from "./pages/PaymentHistory";
import AdminRevenue from "./pages/AdminRevenue";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import RefundPolicy from "./pages/legal/RefundPolicy";
import CookiePolicy from "./pages/legal/CookiePolicy";
import CommunityGuidelines from "./pages/legal/CommunityGuidelines";
import ContentModerationPolicy from "./pages/legal/ContentModerationPolicy";
import CopyrightPolicy from "./pages/legal/CopyrightPolicy";
import ContactUs from "./pages/legal/ContactUs";
import AboutUs from "./pages/legal/AboutUs";

const queryClient = new QueryClient();

function ThemeBoot() {
  useTheme();
  return null;
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
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/outfit/:slug" element={<SharedOutfit />} />
          <Route path="/look/:slug" element={<SharedLook />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/payment-history" element={<PaymentHistory />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/refunds" element={<RefundPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/guidelines" element={<CommunityGuidelines />} />
          <Route path="/moderation" element={<ContentModerationPolicy />} />
          <Route path="/copyright" element={<CopyrightPolicy />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/about" element={<AboutUs />} />
          <Route element={<AppLayout />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/stylist" element={<Stylist />} />
            <Route path="/tryon" element={<TryOn />} />
            <Route path="/lookbook" element={<Lookbook />} />
            <Route path="/looks" element={<MyLooks />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;