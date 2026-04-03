import { Switch, Route, Router, useLocation, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Inbox from "@/pages/Inbox";
import CalendarPage from "@/pages/Calendar";
import Settings from "@/pages/Settings";
import Setup from "@/pages/Setup";
import NotFound from "@/pages/not-found";
import { UpgradeWall } from "@/components/UpgradeWall";

// ─────────────────────────────────────────────────────────────
// Auth guard
// ─────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/onboarding"];
const APP_ROUTES = ["/dashboard", "/inbox", "/calendar", "/settings", "/setup"];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const { data: authData, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    retry: false,
    // Don't throw on 401 — just return null
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
  });

  const isAuthenticated = !!authData?.user;
  const isPublicRoute = PUBLIC_ROUTES.includes(location);
  const isAppRoute = APP_ROUTES.some((r) => location.startsWith(r));

  if (isLoading) {
    // Minimal loading screen — don't flash to wrong page
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Authenticated user on login/signup → send to dashboard
  if (isAuthenticated && (location === "/login" || location === "/signup")) {
    return <Redirect to="/dashboard" />;
  }

  // Unauthenticated user on app page → send to onboarding (not login)
  if (!isAuthenticated && isAppRoute) {
    return <Redirect to="/onboarding" />;
  }

  // Free user at limit → show upgrade wall (except on settings so they can manage account)
  const atLimit = authData?.atLimit === true;
  const plan = authData?.subscription?.plan || "free";
  if (atLimit && plan === "free" && isAppRoute && location !== "/settings") {
    return <UpgradeWall />;
  }

  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────

function AppRouter() {
  return (
    <AuthGuard>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/settings" component={Settings} />
        <Route path="/setup" component={Setup} />
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
