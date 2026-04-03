import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  CalendarDays,
  Bot,
  AlertTriangle,
  Inbox,
  Plus,
  Clock,
  CheckCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Stats, ActivityLog } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className="bg-card border border-border rounded-xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || "bg-primary/10"}`}>
          <span className="text-primary">{icon}</span>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="text-3xl font-black text-foreground">{value}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity Item
// ─────────────────────────────────────────────────────────────

function ActivityItem({ item }: { item: ActivityLog }) {
  const icons: Record<string, React.ReactNode> = {
    system: <Zap size={14} className="text-primary" />,
    reply: <MessageSquare size={14} className="text-blue-400" />,
    calendar: <CalendarDays size={14} className="text-green-400" />,
    email: <Inbox size={14} className="text-amber-400" />,
    escalation: <AlertTriangle size={14} className="text-red-400" />,
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
        {icons[item.type] || <Zap size={14} className="text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{item.title}</div>
        {item.description && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</div>
        )}
      </div>
      <div className="text-xs text-muted-foreground flex-shrink-0">
        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard Page
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: authData } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
  });

  const assistantName = authData?.business?.assistantName || "IronClaw";
  const userName = authData?.user?.fullName?.split(" ")[0] || "there";

  return (
    <AppLayout>
      <div className="p-7 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium">LIVE</span>
          </div>
          <h1 className="text-xl font-black text-foreground">
            Your assistant{" "}
            <span className="text-primary">{assistantName}</span>{" "}
            is on duty
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Good to see you, {userName}. Here's what's happening.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total"
            value={stats?.totalConversations ?? 0}
            icon={<MessageSquare size={16} />}
            loading={statsLoading}
          />
          <StatCard
            label="New"
            value={stats?.newConversations ?? 0}
            icon={<Inbox size={16} />}
            accent="bg-blue-500/10"
            loading={statsLoading}
          />
          <StatCard
            label="Auto-replied"
            value={stats?.autoReplied ?? 0}
            icon={<Bot size={16} />}
            accent="bg-green-500/10"
            loading={statsLoading}
          />
          <StatCard
            label="Escalated"
            value={stats?.escalated ?? 0}
            icon={<AlertTriangle size={16} />}
            accent="bg-red-500/10"
            loading={statsLoading}
          />
          <StatCard
            label="Upcoming"
            value={stats?.upcomingAppointments ?? 0}
            icon={<CalendarDays size={16} />}
            accent="bg-amber-500/10"
            loading={statsLoading}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-foreground">Recent Activity</h2>
              <Clock size={16} className="text-muted-foreground" />
            </div>
            {activityLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <Skeleton className="w-7 h-7 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !activity?.length ? (
              <div className="py-10 text-center">
                <TrendingUp size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No activity yet. Your AI will start logging actions here.</p>
              </div>
            ) : (
              <div>
                {activity.slice(0, 8).map((item) => (
                  <ActivityItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-bold text-base text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-2.5">
                <Link href="/inbox">
                  <Button
                    data-testid="button-go-inbox"
                    variant="outline"
                    className="w-full justify-start gap-2.5 border-border text-sm"
                  >
                    <Inbox size={15} />
                    View Inbox
                    {(stats?.newConversations ?? 0) > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-bold">
                        {stats!.newConversations}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link href="/calendar">
                  <Button
                    data-testid="button-go-calendar"
                    variant="outline"
                    className="w-full justify-start gap-2.5 border-border text-sm"
                  >
                    <Plus size={15} />
                    Add Appointment
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button
                    data-testid="button-go-settings"
                    variant="outline"
                    className="w-full justify-start gap-2.5 border-border text-sm"
                  >
                    <CheckCircle size={15} />
                    Configure Assistant
                  </Button>
                </Link>
              </div>
            </div>

            {/* Plan card */}
            <div className="bg-primary/8 border border-primary/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={15} className="text-primary" />
                <span className="text-sm font-bold text-foreground capitalize">
                  {authData?.subscription?.plan || "free"} plan
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Upgrade to Pro for unlimited emails and custom AI instructions.
              </p>
              <Link href="/settings">
                <Button
                  data-testid="button-upgrade"
                  size="sm"
                  className="w-full bg-primary text-primary-foreground text-xs font-semibold amber-glow hover:bg-primary/90"
                >
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
