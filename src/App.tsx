import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider } from "@/context/DashboardContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { loadCachedBranding } from "@/lib/branding";
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
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Tuned for an analytics dashboard backed by BigQuery RPCs:
// keep results fresh for 5 min, cache for 30 min, no aggressive refetches.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function ProtectedRoutes() {
  const { user, loading, isApproved, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isApproved) {
    const branding = loadCachedBranding();
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 max-w-md text-center">
          {branding?.logoUrl && (
            <img
              src={branding.logoUrl}
              alt="Logo"
              className="h-10 w-auto object-contain mx-auto mb-4"
            />
          )}
          <h2 className="text-xl font-bold text-card-foreground mb-2">Account Pending Approval</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your account is awaiting approval from an administrator. You'll be able to access the dashboard once approved.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:underline"
          >
            Refresh to check status
          </button>
        </div>
      </div>
    );
  }

  return (
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
          <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
          <Route path="/tracking-health" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </DashboardProvider>
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthGuard />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
