import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Studio from "./pages/Studio";
import Stylist from "./pages/Stylist";
import TryOn from "./pages/TryOn";
import Lookbook from "./pages/Lookbook";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import SharedOutfit from "./pages/SharedOutfit";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/AppLayout";

const queryClient = new QueryClient();

function ThemeBoot() {
  useTheme(); // initializes theme on mount
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
          <Route path="/outfit/:slug" element={<SharedOutfit />} />
          <Route element={<AppLayout />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/stylist" element={<Stylist />} />
            <Route path="/tryon" element={<TryOn />} />
            <Route path="/lookbook" element={<Lookbook />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
