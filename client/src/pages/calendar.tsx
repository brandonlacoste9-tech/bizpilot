import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import type { CalendarEvent } from "@shared/schema";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm

function WeekView({ events, weekStart }: { events: CalendarEvent[]; weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
          <div className="p-2" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-l ${isToday(day) ? "bg-primary/5" : ""}`}
            >
              <p className="text-[10px] text-muted-foreground font-medium uppercase">
                {format(day, "EEE")}
              </p>
              <p className={`text-sm font-semibold ${isToday(day) ? "text-primary" : ""}`}>
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="h-14 p-1 text-[10px] text-muted-foreground text-right pr-2 border-b">
                {hour > 12 ? `${hour - 12}PM` : hour === 12 ? "12PM" : `${hour}AM`}
              </div>
              {days.map((day) => {
                const dayEvents = events.filter((e) => {
                  const start = parseISO(e.startTime);
                  return isSameDay(start, day) && start.getHours() === hour;
                });
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`h-14 border-l border-b relative ${isToday(day) ? "bg-primary/[0.02]" : ""}`}
                  >
                    {dayEvents.map((event) => {
                      const start = parseISO(event.startTime);
                      const end = parseISO(event.endTime);
                      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      const heightMultiplier = Math.max(1, Math.min(durationHours, 5));
                      return (
                        <div
                          key={event.id}
                          className="absolute inset-x-0.5 top-0.5 bg-primary/10 border border-primary/20 rounded-sm px-1.5 py-0.5 overflow-hidden z-10 cursor-default"
                          style={{ height: `calc(${heightMultiplier * 100}% - 4px)` }}
                          data-testid={`calendar-event-${event.id}`}
                        >
                          <p className="text-[10px] font-medium text-primary truncate">{event.title}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {format(start, "h:mm a")} — {format(end, "h:mm a")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewEventDialog({ businessId }: { businessId: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();
      const res = await apiRequest("POST", "/api/calendar/events", {
        businessId,
        title,
        description: description || null,
        startTime: startISO,
        endTime: endISO,
        status: "confirmed",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      toast({ title: "Event created", description: "New appointment has been added." });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-new-event">
          <Plus className="size-3.5 mr-1.5" />
          New Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label htmlFor="event-title" className="text-xs">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Panel inspection — J. Smith"
              data-testid="input-event-title"
            />
          </div>
          <div>
            <Label htmlFor="event-description" className="text-xs">Description</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about the appointment..."
              className="min-h-[60px] resize-none"
              data-testid="input-event-description"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="event-date" className="text-xs">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-event-date"
              />
            </div>
            <div>
              <Label htmlFor="event-start" className="text-xs">Start</Label>
              <Input
                id="event-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-testid="input-event-start"
              />
            </div>
            <div>
              <Label htmlFor="event-end" className="text-xs">End</Label>
              <Input
                id="event-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-testid="input-event-end"
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => title.trim() && mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            data-testid="button-save-event"
          >
            {mutation.isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const { data: business } = useQuery<{ id: number }>({
    queryKey: ["/api/business"],
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 pb-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-calendar-title">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Week of {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setWeekStart((w) => subWeeks(w, 1))}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            data-testid="button-today"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            data-testid="button-next-week"
          >
            <ChevronRight className="size-4" />
          </Button>
          {business?.id && <NewEventDialog businessId={business.id} />}
        </div>
      </div>

      {/* Event summary cards */}
      <div className="px-4 md:px-6 py-3">
        <div className="flex flex-wrap gap-2">
          {!isLoading && events?.filter((e) => new Date(e.startTime) >= new Date()).slice(0, 3).map((event) => (
            <Card key={event.id} className="flex-1 min-w-[200px]">
              <CardContent className="p-3">
                <p className="text-xs font-medium truncate">{event.title}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                  <Clock className="size-3" />
                  <span>{format(parseISO(event.startTime), "EEE, MMM d · h:mm a")}</span>
                </div>
                {event.attendees && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                    <Users className="size-3" />
                    <span>{JSON.parse(event.attendees).length} attendee(s)</span>
                  </div>
                )}
                <Badge variant="secondary" className="mt-1.5 text-[10px] py-0 px-1.5">
                  {event.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!events || events.filter((e) => new Date(e.startTime) >= new Date()).length === 0) && (
            <p className="text-sm text-muted-foreground py-2">No upcoming events.</p>
          )}
        </div>
      </div>

      {/* Week grid */}
      <div className="flex-1 px-4 md:px-6 pb-4 overflow-hidden">
        <Card className="h-full overflow-hidden">
          <CardContent className="p-0 h-full overflow-auto">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <WeekView events={events || []} weekStart={weekStart} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
