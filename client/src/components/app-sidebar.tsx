import { Home, Inbox, Calendar, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Conversation } from "@shared/schema";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Settings", url: "/settings", icon: Settings },
];

function BizPilotLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BizPilot logo"
    >
      {/* Compass / navigation shape */}
      <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <path
        d="M14 4L18 12L14 24L10 12Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M4 14L12 10L24 14L12 18Z"
        fill="currentColor"
        opacity="0.5"
      />
      <circle cx="14" cy="14" r="2" fill="currentColor" />
    </svg>
  );
}

export function AppSidebar() {
  const [location] = useLocation();

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const newCount = conversations?.filter((c) => c.status === "new" || c.status === "escalated").length ?? 0;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="text-primary">
            <BizPilotLogo />
          </div>
          <span className="text-base font-semibold tracking-tight" style={{ fontFamily: "'General Sans', sans-serif" }}>
            BizPilot
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.title === "Inbox" && newCount > 0 && (
                      <SidebarMenuBadge data-testid="badge-inbox-count">{newCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          AI-powered assistant
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
