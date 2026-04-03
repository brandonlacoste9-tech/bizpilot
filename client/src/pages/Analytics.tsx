import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Mail,
  Phone,
  MessageSquare,
  Zap,
  BarChart3,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  subtitle,
  icon,
  trend,
  accent,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent || "bg-primary/10")}>
          <span className="text-primary">{icon}</span>
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-black text-foreground">{value}</div>
      {subtitle && (
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" && <TrendingUp size={12} className="text-green-400" />}
          {trend === "down" && <TrendingDown size={12} className="text-red-400" />}
          <span className={cn(
            "text-xs",
            trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"
          )}>
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mini bar chart (pure CSS, no library needed)
// ─────────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-[2px] h-32 md:h-40">
      {data.map((d, i) => {
        const height = (d.count / max) * 100;
        const isToday = i === data.length - 1;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group relative"
          >
            <div
              className={cn(
                "w-full rounded-t transition-all",
                isToday ? "bg-primary" : d.count > 0 ? "bg-primary/40" : "bg-border/40",
                "group-hover:bg-primary/70"
              )}
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-1 hidden group-hover:block">
              <div className="bg-card border border-border rounded px-2 py-1 text-[10px] text-foreground whitespace-nowrap shadow-lg">
                {d.date.slice(5)}: {d.count}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Channel breakdown bar
// ─────────────────────────────────────────────────────────────

function ChannelBar({ channels }: { channels: Record<string, number> }) {
  const total = Object.values(channels).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <div className="text-sm text-muted-foreground text-center py-4">No data yet</div>;
  }

  const items = [
    { key: "email", label: "Email", color: "bg-blue-400", icon: <Mail size={13} /> },
    { key: "sms", label: "SMS", color: "bg-emerald-400", icon: <MessageSquare size={13} /> },
    { key: "phone", label: "Phone", color: "bg-purple-400", icon: <Phone size={13} /> },
    { key: "other", label: "Other", color: "bg-muted-foreground", icon: <Zap size={13} /> },
  ].filter((item) => channels[item.key] > 0);

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="flex rounded-full h-3 overflow-hidden">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn(item.color, "transition-all")}
            style={{ width: `${(channels[item.key] / total) * 100}%` }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full", item.color)} />
            {item.icon}
            <span>{item.label}: {channels[item.key]}</span>
            <span className="text-muted-foreground/50">({Math.round((channels[item.key] / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Analytics Page
// ─────────────────────────────────────────────────────────────

export default function Analytics() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/analytics"],
  });

  const monthChange = data?.totalLastMonth > 0
    ? Math.round(((data.totalThisMonth - data.totalLastMonth) / data.totalLastMonth) * 100)
    : null;

  return (
    <AppLayout>
      <div className="p-4 md:p-7 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg md:text-xl font-black text-foreground">Analytics</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            How your AI assistant is performing over the last 30 days
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <Skeleton className="h-60 rounded-xl" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPICard
                label="This Month"
                value={data?.totalThisMonth ?? 0}
                subtitle={
                  monthChange !== null
                    ? `${monthChange >= 0 ? "+" : ""}${monthChange}% vs last month`
                    : "First month"
                }
                trend={monthChange !== null ? (monthChange >= 0 ? "up" : "down") : "neutral"}
                icon={<BarChart3 size={16} />}
              />
              <KPICard
                label="Total (30 days)"
                value={data?.totalConversations ?? 0}
                subtitle="conversations"
                icon={<MessageSquare size={16} />}
              />
              <KPICard
                label="AI Auto-Reply Rate"
                value={`${data?.autoReplyRate ?? 0}%`}
                subtitle="handled automatically"
                icon={<Bot size={16} />}
                accent="bg-green-500/10"
              />
              <KPICard
                label="Escalated"
                value={data?.escalatedCount ?? 0}
                subtitle="needed your attention"
                icon={<AlertTriangle size={16} />}
                accent="bg-red-500/10"
              />
            </div>

            {/* Message Volume Chart */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-sm text-foreground">Message Volume</h2>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
                <BarChart3 size={16} className="text-muted-foreground" />
              </div>
              {data?.dailyVolume?.length > 0 ? (
                <MiniBarChart data={data.dailyVolume} />
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  No data yet. Send a test message to see your first data point.
                </div>
              )}
            </div>

            {/* Channel Breakdown */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-sm text-foreground">Channel Breakdown</h2>
                  <p className="text-xs text-muted-foreground">Where your conversations come from</p>
                </div>
              </div>
              <ChannelBar channels={data?.channelBreakdown || {}} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
