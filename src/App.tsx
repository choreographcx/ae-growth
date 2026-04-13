import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider } from "@/context/DashboardContext";
import { AppShell } from "@/components/layout/AppShell";
import OverviewPage from "./pages/OverviewPage";
import MetaPage from "./pages/MetaPage";
import GoogleAdsPage from "./pages/GoogleAdsPage";
import TikTokPage from "./pages/TikTokPage";
import SnapchatPage from "./pages/SnapchatPage";
import LinkedInPage from "./pages/LinkedInPage";
import XPage from "./pages/XPage";
import ProgrammaticPage from "./pages/ProgrammaticPage";
import AdminPage from "./pages/AdminPage";
import TrackingHealthPage from "./pages/TrackingHealthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/meta" element={<MetaPage />} />
              <Route path="/google" element={<GoogleAdsPage />} />
              <Route path="/tiktok" element={<TikTokPage />} />
              <Route path="/snapchat" element={<SnapchatPage />} />
              <Route path="/linkedin" element={<LinkedInPage />} />
              <Route path="/x" element={<XPage />} />
              <Route path="/programmatic" element={<ProgrammaticPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/tracking-health" element={<TrackingHealthPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </DashboardProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
