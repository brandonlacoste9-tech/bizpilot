import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  BotMessageSquare,
  AlertTriangle,
  CalendarDays,
  Mail,
  Calendar,
  Send,
  ArrowRight,
} from "lucide-react";
import type { ActivityLog, CalendarEvent } from "@shared/schema";

interface DashboardStats {
  totalConversations: number;
  newConversations: number;
  autoReplied: number;
  escalated: number;
  upcomingAppointments: number;
}

const activityIconMap: Record<string, typeof Mail> = {
  email_received: Mail,
  email_replied: BotMessageSquare,
  escalation: AlertTriangle,
  appointment_booked: CalendarDays,
  briefing: Send,
};

const activityColorMap: Record<string, string> = {
  email_received: "text-blue-500",
  email_replied: "text-emerald-500",
  escalation: "text-amber-500",
  appointment_booked: "text-indigo-500",
  briefing: "text-purple-500",
};

function StatsCards({ stats, isLoading }: { stats?: DashboardStats; isLoading: boolean }) {
  const items = [
    { label: "Total Conversations", value: stats?.totalConversations, icon: MessageSquare, color: "text-primary" },
    { label: "Auto-Replied", value: stats?.autoReplied, icon: BotMessageSquare, color: "text-emerald-500" },
    { label: "Escalated", value: stats?.escalated, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Upcoming Appts", value: stats?.upcomingAppointments, icon: CalendarDays, color: "text-indigo-500" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} data-testid={`stat-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 mt-1" />
                ) : (
                  <p className="text-xl font-semibold mt-0.5">{item.value ?? 0}</p>
                )}
              </div>
              <item.icon className={`size-5 ${item.color} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityFeed({ activities, isLoading }: { activities?: ActivityLog[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BotMessageSquare className="size-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No activity yet. Your AI assistant will log actions here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const Icon = activityIconMap[activity.type] || Mail;
        const color = activityColorMap[activity.type] || "text-muted-foreground";
        return (
          <div key={activity.id} className="flex gap-3 items-start py-2.5 px-1" data-testid={`activity-item-${activity.id}`}>
            <div className={`size-7 rounded-full flex items-center justify-center shrink-0 bg-muted ${color}`}>
              <Icon className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{activity.title}</p>
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UpcomingEvents({ events, isLoading }: { events?: CalendarEvent[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const upcoming = events?.filter((e) => new Date(e.startTime) >= new Date()).slice(0, 3);

  if (!upcoming?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No upcoming appointments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {upcoming.map((event) => (
        <div key={event.id} className="py-2.5 px-1" data-testid={`event-item-${event.id}`}>
          <p className="text-sm font-medium leading-tight">{event.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(event.startTime), "EEE, MMM d 'at' h:mm a")}
            {" — "}
            {format(new Date(event.endTime), "h:mm a")}
          </p>
          {event.status && (
            <Badge variant="secondary" className="mt-1 text-[10px] py-0 px-1.5" data-testid={`event-status-${event.id}`}>
              {event.status}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your AI assistant is managing your business communications.</p>
      </div>

      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/inbox">
          <Button variant="outline" size="sm" data-testid="button-check-emails">
            <Mail className="size-3.5 mr-1.5" />
            Check Inbox
          </Button>
        </Link>
        <Link href="/calendar">
          <Button variant="outline" size="sm" data-testid="button-view-calendar">
            <Calendar className="size-3.5 mr-1.5" />
            View Calendar
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* Activity Feed */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              <Link href="/inbox">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" data-testid="link-view-all-activity">
                  View all <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ActivityFeed activities={activity} isLoading={activityLoading} />
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Upcoming</CardTitle>
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" data-testid="link-view-all-events">
                  View all <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <UpcomingEvents events={events} isLoading={eventsLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Status indicators */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5" data-testid="status-email">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Email Sync Active</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="status-telegram">
              <span className="size-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">Telegram Bot — Not Connected</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="status-ai">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">AI Assistant Online</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
