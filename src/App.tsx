import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider } from "@/context/DashboardContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { loadCachedBranding } from "@/lib/branding";

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const MetaPage = lazy(() => import("./pages/MetaPage"));
const GoogleAdsPage = lazy(() => import("./pages/GoogleAdsPage"));
const TikTokPage = lazy(() => import("./pages/TikTokPage"));
const SnapchatPage = lazy(() => import("./pages/SnapchatPage"));
const LinkedInPage = lazy(() => import("./pages/LinkedInPage"));
const XPage = lazy(() => import("./pages/XPage"));
const ProgrammaticPage = lazy(() => import("./pages/ProgrammaticPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const TrackingHealthPage = lazy(() => import("./pages/TrackingHealthPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading, isApproved } = useAuth();

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
        <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
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
        </Suspense>
      </AppShell>
    </DashboardProvider>
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Suspense fallback={null}><AuthPage /></Suspense>;
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
