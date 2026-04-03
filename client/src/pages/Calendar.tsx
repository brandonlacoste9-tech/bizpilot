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
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Plus,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { CalendarEvent } from "@shared/schema";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addHours,
} from "date-fns";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Add Event Dialog
// ─────────────────────────────────────────────────────────────

function AddEventDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}) {
  const { toast } = useToast();

  const baseDate = defaultDate || addHours(new Date(), 24);
  const startStr = format(baseDate, "yyyy-MM-dd") + "T09:00";
  const endStr = format(baseDate, "yyyy-MM-dd") + "T10:00";

  const form = useForm<InsertCalendarEvent>({
    resolver: zodResolver(insertCalendarEventSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: startStr,
      endTime: endStr,
      status: "confirmed",
    },
  });

  // Reset form when date changes
  const key = defaultDate?.toISOString() || "default";

  const createMutation = useMutation({
    mutationFn: (data: InsertCalendarEvent) =>
      apiRequest("POST", "/api/calendar/events", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event added" });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Failed to add event", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {defaultDate ? `Add Event — ${format(defaultDate, "MMMM d, yyyy")}` : "Add New Event"}
          </DialogTitle>
        </DialogHeader>
        <form
          key={key}
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
                defaultValue={startStr}
                {...form.register("startTime")}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End *</Label>
              <Input
                id="endTime"
                data-testid="input-event-end"
                type="datetime-local"
                defaultValue={endStr}
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
// Day cell in calendar grid
// ─────────────────────────────────────────────────────────────

function DayCell({
  date,
  currentMonth,
  events,
  selected,
  onSelect,
}: {
  date: Date;
  currentMonth: Date;
  events: CalendarEvent[];
  selected: boolean;
  onSelect: (date: Date) => void;
}) {
  const inMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const dayEvents = events.filter((e) => isSameDay(parseISO(e.startTime), date));
  const hasEvents = dayEvents.length > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={cn(
        "relative flex flex-col items-center justify-start p-1 md:p-2 min-h-[3rem] md:min-h-[5rem] rounded-lg transition-colors text-sm",
        !inMonth && "opacity-30",
        today && !selected && "bg-primary/10",
        selected && "bg-primary/20 ring-1 ring-primary",
        !today && !selected && inMonth && "hover:bg-secondary/60",
      )}
    >
      <span
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold",
          today && "bg-primary text-primary-foreground",
          !today && inMonth && "text-foreground",
          !today && !inMonth && "text-muted-foreground",
        )}
      >
        {format(date, "d")}
      </span>

      {/* Event dots / pills */}
      {hasEvents && (
        <div className="mt-1 flex flex-col gap-0.5 w-full px-0.5">
          {dayEvents.slice(0, 2).map((e) => (
            <div
              key={e.id}
              className="hidden md:block text-[10px] leading-tight truncate px-1 py-0.5 rounded bg-primary/15 text-primary font-medium"
            >
              {format(parseISO(e.startTime), "h:mma")} {e.title}
            </div>
          ))}
          {/* Mobile: just dots */}
          <div className="md:hidden flex justify-center gap-0.5 mt-0.5">
            {dayEvents.slice(0, 3).map((e) => (
              <div key={e.id} className="w-1.5 h-1.5 rounded-full bg-primary" />
            ))}
          </div>
          {dayEvents.length > 2 && (
            <div className="hidden md:block text-[10px] text-muted-foreground text-center">
              +{dayEvents.length - 2} more
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Day detail panel (shows events for selected day)
// ─────────────────────────────────────────────────────────────

function DayDetail({
  date,
  events,
  onDelete,
  onClose,
}: {
  date: Date;
  events: CalendarEvent[];
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const dayEvents = events
    .filter((e) => isSameDay(parseISO(e.startTime), date))
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-foreground">
            {format(date, "EEEE, MMMM d")}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <X size={15} />
        </button>
      </div>

      {!dayEvents.length ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No events on this day. Tap "Add Event" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border"
            >
              <div className="w-1 h-full min-h-[2.5rem] rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{e.title}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Clock size={11} />
                  {format(parseISO(e.startTime), "h:mm a")} — {format(parseISO(e.endTime), "h:mm a")}
                </div>
                {e.description && (
                  <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
                )}
                {e.attendees && e.attendees.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {e.attendees.map((a: any, i: number) => (
                      <span key={i} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">
                        {a.name || a.email}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive flex-shrink-0 h-7 w-7 p-0"
                onClick={() => onDelete(e.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Calendar Page
// ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogDate, setAddDialogDate] = useState<Date | undefined>(undefined);

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

  // Build calendar grid days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = (date?: Date) => {
    setAddDialogDate(date || selectedDate || undefined);
    setAddDialogOpen(true);
  };

  // Upcoming events (next 7 days)
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = (events || [])
    .filter((e) => {
      const s = parseISO(e.startTime);
      return s >= now && s <= in7;
    })
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

  return (
    <AppLayout>
      <div className="p-4 md:p-7 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {events?.length ?? 0} event{events?.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>
          <Button
            data-testid="button-add-event"
            onClick={() => handleAddEvent()}
            className="bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
          >
            <Plus size={16} className="mr-2" /> Add Event
          </Button>
        </div>

        {/* Upcoming strip */}
        {upcoming.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Coming up</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {upcoming.slice(0, 5).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/60 border border-border flex-shrink-0 min-w-[180px]"
                >
                  <div className="text-center w-9 flex-shrink-0">
                    <div className="text-base font-black text-primary leading-none">
                      {format(parseISO(e.startTime), "d")}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {format(parseISO(e.startTime), "MMM")}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-foreground truncate">{e.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(parseISO(e.startTime), "h:mm a")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar grid */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Month nav */}
                <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="text-sm font-bold text-foreground">
                    {format(currentMonth, "MMMM yyyy")}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Day of week headers */}
                <div className="grid grid-cols-7 border-b border-border">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center text-[10px] md:text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wide">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7">
                  {calDays.map((day) => (
                    <DayCell
                      key={day.toISOString()}
                      date={day}
                      currentMonth={currentMonth}
                      events={events || []}
                      selected={!!selectedDate && isSameDay(day, selectedDate)}
                      onSelect={handleDaySelect}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right panel: day detail */}
            <div className="lg:col-span-1">
              {selectedDate ? (
                <div className="space-y-3">
                  <DayDetail
                    date={selectedDate}
                    events={events || []}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onClose={() => setSelectedDate(null)}
                  />
                  <Button
                    onClick={() => handleAddEvent(selectedDate)}
                    variant="outline"
                    className="w-full border-border text-sm"
                  >
                    <Plus size={14} className="mr-2" />
                    Add event on {format(selectedDate, "MMM d")}
                  </Button>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-6 text-center">
                  <CalendarDays size={32} className="text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Tap a day to see events</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Or tap "Add Event" to create one.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Event Dialog */}
      <AddEventDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultDate={addDialogDate}
      />
    </AppLayout>
  );
}
