import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase,
  HelpCircle,
  FileText,
  Plus,
  Trash2,
  Save,
  DollarSign,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ServiceEntry {
  name: string;
  description: string;
  price: string;
}

interface FAQEntry {
  question: string;
  answer: string;
}

// ─────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 md:p-5 text-left hover:bg-secondary/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">{title}</span>
            {count !== undefined && count > 0 && (
              <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">{count}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {expanded && <div className="border-t border-border p-4 md:p-5">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Service card
// ─────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onChange,
  onDelete,
}: {
  service: ServiceEntry;
  onChange: (s: ServiceEntry) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 md:p-4 rounded-lg bg-background border border-border space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <Input
            placeholder="Service name (e.g. Emergency Plumbing)"
            value={service.name}
            onChange={(e) => onChange({ ...service, name: e.target.value })}
            className="bg-card border-border text-sm font-medium"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Price (e.g. $150/hr, Free estimate)"
              value={service.price}
              onChange={(e) => onChange({ ...service, price: e.target.value })}
              className="bg-card border-border text-xs"
            />
          </div>
          <Textarea
            placeholder="Description — what's included, how it works, any details the AI should know..."
            value={service.description}
            onChange={(e) => onChange({ ...service, description: e.target.value })}
            className="bg-card border-border resize-none text-xs"
            rows={2}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8 p-0"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FAQ card
// ─────────────────────────────────────────────────────────────

function FAQCard({
  faq,
  onChange,
  onDelete,
}: {
  faq: FAQEntry;
  onChange: (f: FAQEntry) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 md:p-4 rounded-lg bg-background border border-border space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <Input
            placeholder="Question (e.g. Do you offer free estimates?)"
            value={faq.question}
            onChange={(e) => onChange({ ...faq, question: e.target.value })}
            className="bg-card border-border text-sm font-medium"
          />
          <Textarea
            placeholder="Answer — the AI will use this exact response when customers ask this question"
            value={faq.answer}
            onChange={(e) => onChange({ ...faq, answer: e.target.value })}
            className="bg-card border-border resize-none text-xs"
            rows={2}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8 p-0"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Knowledge Base Page
// ─────────────────────────────────────────────────────────────

export default function Knowledge() {
  const { toast } = useToast();

  const { data: authData, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const business = authData?.business;

  // Local state for editing
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [businessHoursText, setBusinessHoursText] = useState("");
  const [policies, setPolicies] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Populate from business data
  useEffect(() => {
    if (business && !initialized) {
      // Parse services — stored as strings, may contain JSON-encoded rich entries
      const rawServices = business.services || [];
      const parsedServices: ServiceEntry[] = rawServices.map((s: string) => {
        try {
          const parsed = JSON.parse(s);
          if (parsed.name) return parsed;
        } catch {}
        return { name: s, description: "", price: "" };
      });
      setServices(parsedServices.length ? parsedServices : [{ name: "", description: "", price: "" }]);

      // Parse FAQs
      const rawFaqs = business.faqEntries || [];
      setFaqs(rawFaqs.length ? rawFaqs : [{ question: "", answer: "" }]);

      // Business hours
      const hours = business.businessHours;
      setBusinessHoursText(
        typeof hours === "string" ? hours :
        hours?.description ? hours.description :
        hours ? JSON.stringify(hours) : ""
      );

      // Policies from AI instructions (we'll split them: first part is AI behavior, second is policies)
      setPolicies(business.aiInstructions || "");

      setInitialized(true);
    }
  }, [business, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Serialize services as JSON strings for rich data
      const serializedServices = services
        .filter((s) => s.name.trim())
        .map((s) => JSON.stringify({ name: s.name.trim(), description: s.description.trim(), price: s.price.trim() }));

      const serializedFaqs = faqs.filter((f) => f.question.trim() && f.answer.trim());

      await apiRequest("PATCH", "/api/business", {
        services: serializedServices,
        faqEntries: serializedFaqs,
        businessHours: businessHoursText.trim() ? { description: businessHoursText.trim() } : null,
        aiInstructions: policies.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Knowledge base saved", description: "Your AI will use this information when responding to customers." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  // Add/remove helpers
  const addService = () => setServices([...services, { name: "", description: "", price: "" }]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
  const updateService = (i: number, s: ServiceEntry) => {
    const copy = [...services];
    copy[i] = s;
    setServices(copy);
  };

  const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
  const removeFaq = (i: number) => setFaqs(faqs.filter((_, idx) => idx !== i));
  const updateFaq = (i: number, f: FAQEntry) => {
    const copy = [...faqs];
    copy[i] = f;
    setFaqs(copy);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-7 max-w-2xl">
          <div className="h-8 w-48 bg-secondary rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!business) {
    return (
      <AppLayout>
        <div className="p-4 md:p-7 max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Sparkles size={32} className="text-primary mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Complete Onboarding First</h2>
            <p className="text-sm text-muted-foreground">Set up your business profile before adding knowledge.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const serviceCount = services.filter((s) => s.name.trim()).length;
  const faqCount = faqs.filter((f) => f.question.trim()).length;

  return (
    <AppLayout>
      <div className="p-4 md:p-7 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg md:text-xl font-black text-foreground">Knowledge Base</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            The more your AI knows about your business, the better it can help your customers.
          </p>
        </div>

        {/* AI context tip */}
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles size={16} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-foreground mb-1">How this works</div>
              <p className="text-xs text-muted-foreground">
                Everything you add here gets fed directly to your AI assistant. When a customer asks about pricing,
                hours, services, or policies — the AI already knows the answer. The more detail you provide, the
                more accurate and helpful your AI becomes.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* ── Services ── */}
          <Section
            icon={<Briefcase size={18} />}
            title="Services & Pricing"
            description="What you offer and how much it costs"
            count={serviceCount}
          >
            <div className="space-y-3">
              {services.map((s, i) => (
                <ServiceCard
                  key={i}
                  service={s}
                  onChange={(updated) => updateService(i, updated)}
                  onDelete={() => removeService(i)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed border-border text-muted-foreground hover:text-foreground"
                onClick={addService}
              >
                <Plus size={14} className="mr-2" />
                Add Service
              </Button>
            </div>
          </Section>

          {/* ── Business Hours ── */}
          <Section
            icon={<Clock size={18} />}
            title="Business Hours"
            description="When you're open — the AI will tell customers your availability"
          >
            <Textarea
              placeholder={"Monday – Friday: 9am – 6pm\nSaturday: 10am – 4pm\nSunday: Closed\n\nHoliday hours may vary. Emergency service available 24/7 for an extra fee."}
              value={businessHoursText}
              onChange={(e) => setBusinessHoursText(e.target.value)}
              className="bg-background border-border resize-none text-sm"
              rows={4}
            />
          </Section>

          {/* ── FAQs ── */}
          <Section
            icon={<HelpCircle size={18} />}
            title="Frequently Asked Questions"
            description="Common questions and your preferred answers"
            count={faqCount}
          >
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <FAQCard
                  key={i}
                  faq={f}
                  onChange={(updated) => updateFaq(i, updated)}
                  onDelete={() => removeFaq(i)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed border-border text-muted-foreground hover:text-foreground"
                onClick={addFaq}
              >
                <Plus size={14} className="mr-2" />
                Add FAQ
              </Button>
            </div>
          </Section>

          {/* ── Policies & AI Instructions ── */}
          <Section
            icon={<FileText size={18} />}
            title="Policies & AI Instructions"
            description="Cancellation policy, payment methods, service area, or any custom instructions"
          >
            <Textarea
              placeholder={"Write anything you want the AI to know and follow. For example:\n\n• We accept cash, credit cards, and e-transfer\n• Free estimates on all jobs\n• 30-day warranty on all work\n• We serve the Greater Montreal area\n• Never quote exact prices — always say 'starting from' and suggest booking a consultation\n• Be friendly and professional at all times\n• If someone asks about emergency service, tell them to call us directly"}
              value={policies}
              onChange={(e) => setPolicies(e.target.value)}
              className="bg-background border-border resize-none text-sm"
              rows={8}
            />
            <p className="text-xs text-muted-foreground mt-2">
              This is your AI's rulebook. Be specific — the AI follows these instructions for every conversation.
            </p>
          </Section>

          {/* Save button */}
          <Button
            onClick={() => saveMutation.mutate()}
            className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
            disabled={saveMutation.isPending}
          >
            <Save size={16} className="mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Knowledge Base"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
