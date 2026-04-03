import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IronClawLogo } from "@/components/AppLayout";
import { HoneycombBackground } from "@/components/HoneycombBackground";
import {
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays } from "date-fns";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface BusinessInfo {
  id: string;
  name: string;
  ownerName: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  services: Array<{ name: string; description?: string; price?: string }>;
  assistantName: string;
}

interface Slot {
  date: string;
  time: string;
  available: boolean;
}

// ─────────────────────────────────────────────────────────────
// Booking Page (Public)
// ─────────────────────────────────────────────────────────────

export default function Book() {
  const [, params] = useRoute("/book/:id");
  const businessId = params?.id;

  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Booking state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [step, setStep] = useState<"select" | "details" | "confirmed">("select");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  // Fetch business and slots
  useEffect(() => {
    if (!businessId) return;
    (async () => {
      try {
        const [bizRes, slotsRes] = await Promise.all([
          fetch(`/api/public/business/${businessId}`),
          fetch(`/api/public/business/${businessId}/slots`),
        ]);
        if (!bizRes.ok) throw new Error("Business not found");
        const bizData = await bizRes.json();
        const slotsData = await slotsRes.json();
        setBusiness(bizData);
        setSlots(slotsData.slots || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId]);

  // Get unique dates from slots
  const dates = [...new Set(slots.filter((s) => s.available).map((s) => s.date))];
  const timesForDate = slots.filter((s) => s.date === selectedDate && s.available);

  const handleBook = async () => {
    if (!formData.name || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/business/${businessId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          notes: formData.notes,
          date: selectedDate,
          time: selectedTime,
        }),
      });
      if (!res.ok) throw new Error("Booking failed");
      setStep("confirmed");
    } catch {
      setError("Failed to book. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">
        <HoneycombBackground variant="page" />
        <div className="relative text-center">
          <IronClawLogo size={32} />
          <h1 className="text-xl font-bold text-foreground mt-4">Business not found</h1>
          <p className="text-sm text-muted-foreground mt-2">This booking link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <HoneycombBackground variant="page" />

      <div className="relative max-w-lg mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <IronClawLogo size={28} />
          <h1 className="text-xl font-black text-foreground mt-3">{business.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Book an appointment</p>
          {business.address && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <MapPin size={11} /> {business.address}
            </p>
          )}
        </div>

        {/* Confirmed */}
        {step === "confirmed" ? (
          <div className="bg-card border border-green-500/20 rounded-xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">You're booked!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your appointment with {business.name} is confirmed.
            </p>
            <div className="inline-flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
              <CalendarDays size={16} className="text-primary" />
              <div className="text-left">
                <div className="text-sm font-semibold text-foreground">
                  {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
                </div>
                <div className="text-xs text-muted-foreground">{selectedTime}</div>
              </div>
            </div>
            {business.phone && (
              <p className="text-xs text-muted-foreground mt-4">
                Questions? Call <span className="text-primary font-mono">{business.phone}</span>
              </p>
            )}
          </div>
        ) : step === "details" ? (
          /* Contact details form */
          <div className="bg-card border border-border rounded-xl p-6">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft size={14} /> Back to time selection
            </button>

            <div className="mb-5">
              <div className="text-sm font-bold text-foreground">Your details</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(selectedDate), "EEEE, MMMM d")} at {selectedTime}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Your name *</Label>
                <Input
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  placeholder="What do you need help with?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-background border-border resize-none"
                  rows={2}
                />
              </div>
              <Button
                onClick={handleBook}
                disabled={!formData.name || submitting}
                className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
              >
                {submitting ? "Booking..." : "Confirm Appointment"}
              </Button>
            </div>
          </div>
        ) : (
          /* Date + time selection */
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-sm font-bold text-foreground mb-4">Pick a date and time</div>

            {/* Date pills */}
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                  className={cn(
                    "flex flex-col items-center px-3 py-2 rounded-lg border transition-colors flex-shrink-0 min-w-[4rem]",
                    selectedDate === d
                      ? "bg-primary/15 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <span className="text-[10px] uppercase font-medium">{format(parseISO(d), "EEE")}</span>
                  <span className="text-lg font-black leading-tight">{format(parseISO(d), "d")}</span>
                  <span className="text-[10px]">{format(parseISO(d), "MMM")}</span>
                </button>
              ))}
            </div>

            {/* Time grid */}
            {selectedDate && (
              <div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock size={12} />
                  Available times for {format(parseISO(selectedDate), "EEEE, MMM d")}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timesForDate.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() => setSelectedTime(s.time)}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                        selectedTime === s.time
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {s.time.replace(/^0/, "")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!selectedDate && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Select a date above to see available times
              </div>
            )}

            {selectedDate && selectedTime && (
              <Button
                onClick={() => setStep("details")}
                className="w-full mt-4 bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
              >
                Continue <ArrowRight size={14} className="ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Business info */}
        {business.businessHours && step !== "confirmed" && (
          <div className="mt-4 p-4 rounded-xl bg-card/50 border border-border">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
              <Clock size={12} /> Business Hours
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{business.businessHours}</p>
          </div>
        )}

        {/* Powered by */}
        <div className="mt-6 text-center">
          <a href="https://ironclaw.ca" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Powered by <IronClawLogo size={12} /> IronClaw
          </a>
        </div>
      </div>
    </div>
  );
}
