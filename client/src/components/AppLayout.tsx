import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  Settings,
  Plug,
  LogOut,
  Zap,
  Menu,
  X,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { HoneycombBackground } from "@/components/HoneycombBackground";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/inbox", label: "Inbox", icon: <Inbox size={18} /> },
  { href: "/calendar", label: "Calendar", icon: <CalendarDays size={18} /> },
  { href: "/knowledge", label: "Knowledge", icon: <BookOpen size={18} /> },
  { href: "/chat", label: "My AI", icon: <MessageCircle size={18} /> },
  { href: "/setup", label: "Setup", icon: <Plug size={18} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
];

// IronClaw SVG Logo
export function IronClawLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      aria-label="IronClaw"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Claw base */}
      <path
        d="M20 4 L28 14 L24 18 L20 10 L16 18 L12 14 Z"
        fill="currentColor"
        className="text-primary"
      />
      {/* Three claw tines */}
      <path
        d="M12 18 L8 32 L14 28 L16 36 L20 26 L24 36 L26 28 L32 32 L28 18"
        fill="currentColor"
        className="text-primary"
        opacity="0.85"
      />
      {/* Grip circle */}
      <circle cx="20" cy="18" r="3" fill="hsl(0 0% 4%)" />
      <circle cx="20" cy="18" r="1.5" fill="currentColor" className="text-primary" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar content (shared between desktop and mobile)
// ─────────────────────────────────────────────────────────────

function SidebarContent({
  location,
  authData,
  assistantName,
  onLogout,
  onNavClick,
}: {
  location: string;
  authData: any;
  assistantName: string;
  onLogout: () => void;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <IronClawLogo size={28} />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-foreground tracking-tight">IronClaw</span>
            <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-primary/15 text-primary uppercase tracking-wider leading-none">Beta</span>
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[120px]">{assistantName}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.label.toLowerCase()}`}
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {item.icon}
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-2 border-t border-border pt-4">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <Zap size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {authData?.user?.fullName || "User"}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {authData?.subscription?.plan || "free"} plan
            </div>
          </div>
        </div>
        <Button
          data-testid="button-logout"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut size={15} />
          Sign out
        </Button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// AppLayout
// ─────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const { data: authData } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.hash = "#/login";
    },
    onError: () => {
      toast({ title: "Logout failed", variant: "destructive" });
    },
  });

  const assistantName = authData?.business?.assistantName || "IronClaw";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-border bg-[hsl(var(--sidebar))]">
        <SidebarContent
          location={location}
          authData={authData}
          assistantName={assistantName}
          onLogout={() => logoutMutation.mutate()}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[hsl(var(--sidebar))] border-r border-border transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          type="button"
          className="absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </button>
        <SidebarContent
          location={location}
          authData={authData}
          assistantName={assistantName}
          onLogout={() => logoutMutation.mutate()}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main content */}
      <main className="relative flex-1 overflow-auto bg-background">
        {/* Mobile header bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/90 backdrop-blur-md">
          <button
            type="button"
            data-testid="button-mobile-menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <IronClawLogo size={22} />
          <span className="font-bold text-sm text-foreground tracking-tight">IronClaw</span>
        </div>

        <div className="hidden md:block fixed inset-0 left-60 pointer-events-none">
          <HoneycombBackground variant="app" />
        </div>
        <div className="relative">{children}</div>
      </main>
    </div>
  );
}
