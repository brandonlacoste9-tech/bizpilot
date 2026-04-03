import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppLayout } from "@/components/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCalendarEventSchema, type InsertCalendarEvent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Calendar as CalIcon,
} from "lucide-react";
import type { CalendarEvent } from "@shared/schema";
import { format, parseISO } from "date-fns";

// ─────────────────────────────────────────────────────────────
// Event Card
// ─────────────────────────────────────────────────────────────

function EventCard({
  event,
  onDelete,
}: {
  event: CalendarEvent;
  onDelete: () => void;
}) {
  const start = parseISO(event.startTime);
  const end = parseISO(event.endTime);
  const isToday = format(start, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div
      data-testid={`event-card-${event.id}`}
      className={`p-5 rounded-xl border ${
        isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isToday && (
            <div className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Today</div>
          )}
          <h3 className="font-bold text-base text-foreground mb-1">{event.title}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <CalendarDays size={13} className="flex-shrink-0" />
            <span>{format(start, "MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={13} className="flex-shrink-0" />
            <span>
              {format(start, "h:mm a")} — {format(end, "h:mm a")}
            </span>
          </div>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-2">{event.description}</p>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {event.attendees.map((a, i) => (
                <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                  {a.name || a.email}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button
          data-testid={`button-delete-event-${event.id}`}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Add Event Form
// ─────────────────────────────────────────────────────────────

function AddEventDialog({ onAdded }: { onAdded: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = format(tomorrow, "yyyy-MM-dd'T'HH:mm");
  const defaultEndDate = format(new Date(tomorrow.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");

  const form = useForm<InsertCalendarEvent>({
    resolver: zodResolver(insertCalendarEventSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: defaultDate,
      endTime: defaultEndDate,
      status: "confirmed",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCalendarEvent) =>
      apiRequest("POST", "/api/calendar/events", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event added" });
      setOpen(false);
      form.reset();
      onAdded();
    },
    onError: (err: any) => {
      toast({ title: "Failed to add event", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="button-add-event"
          className="bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
        >
          <Plus size={16} className="mr-2" /> Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Add New Event</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              data-testid="input-event-title"
              placeholder="Client meeting"
              {...form.register("title")}
              className="bg-background border-border"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              data-testid="input-event-description"
              placeholder="Optional notes..."
              {...form.register("description")}
              className="bg-background border-border resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start *</Label>
              <Input
                id="startTime"
                data-testid="input-event-start"
                type="datetime-local"
                {...form.register("startTime")}
                className="bg-background border-border"
              />
              {form.formState.errors.startTime && (
                <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End *</Label>
              <Input
                id="endTime"
                data-testid="input-event-end"
                type="datetime-local"
                {...form.register("endTime")}
                className="bg-background border-border"
              />
            </div>
          </div>

          <Button
            type="submit"
            data-testid="button-submit-event"
            className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Calendar Page
// ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/calendar/events/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete event", description: err.message, variant: "destructive" });
    },
  });

  // Group events by date
  const grouped: Record<string, CalendarEvent[]> = {};
  (events || []).forEach((e) => {
    const dateKey = format(parseISO(e.startTime), "MMMM d, yyyy");
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(e);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Upcoming (next 7 days)
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = (events || []).filter((e) => {
    const start = parseISO(e.startTime);
    return start >= now && start <= in7Days;
  });

  return (
    <AppLayout>
      <div className="p-7 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-black text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {events?.length ?? 0} event{events?.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>
          <AddEventDialog onAdded={() => forceUpdate((n) => n + 1)} />
        </div>

        {/* Upcoming strip */}
        {upcomingEvents.length > 0 && (
          <div className="mb-8 p-5 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-primary" />
              <span className="text-sm font-bold text-primary">Next 7 days</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {upcomingEvents.slice(0, 4).map((e) => (
                <div key={e.id} className="flex items-center gap-3 text-sm">
                  <div className="text-center w-10 flex-shrink-0">
                    <div className="text-lg font-black text-primary leading-none">
                      {format(parseISO(e.startTime), "d")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(e.startTime), "MMM")}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(e.startTime), "h:mm a")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full event list */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ))}
          </div>
        ) : !events?.length ? (
          <div className="py-16 text-center">
            <CalIcon size={40} className="text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No events yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first appointment or event to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  {dateKey}
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {grouped[dateKey].map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      onDelete={() => deleteMutation.mutate(e.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
