import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IronClawLogo } from "@/components/AppLayout";
import { ArrowRight, ArrowLeft, CheckCircle, Building2, Settings, MessageSquare } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Step schemas
// ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, "Business name is required"),
  ownerName: z.string().min(1, "Your name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
});

const step2Schema = z.object({
  servicesText: z.string().optional(),
  businessHoursText: z.string().optional(),
  address: z.string().optional(),
});

const step3Schema = z.object({
  assistantName: z.string().min(1, "Give your assistant a name").default("IronClaw"),
  aiInstructions: z.string().optional(),
  telegramChatId: z.string().optional(),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

// ─────────────────────────────────────────────────────────────
// Step indicators
// ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Business Info", icon: <Building2 size={16} /> },
  { label: "Services", icon: <Settings size={16} /> },
  { label: "AI Assistant", icon: <MessageSquare size={16} /> },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-3 mb-10">
      {STEPS.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                  ? "bg-primary/20 text-primary border border-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < current ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span
              className={`text-sm font-medium hidden sm:block ${
                i === current ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-8 ${i < current ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Onboarding Page
// ─────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step1Data, setStep1Data] = useState<Step1>({
    name: "",
    ownerName: "",
    email: "",
    phone: "",
  });
  const [step2Data, setStep2Data] = useState<Step2>({
    servicesText: "",
    businessHoursText: "",
    address: "",
  });

  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: step1Data,
  });

  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: step2Data,
  });

  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { assistantName: "IronClaw", aiInstructions: "", telegramChatId: "" },
  });

  const createBusinessMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/onboarding", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Setup complete!", description: "Your AI assistant is ready." });
      setLocation("/dashboard");
    },
    onError: (err: any) => {
      toast({ title: "Setup failed", description: err.message, variant: "destructive" });
    },
  });

  const handleStep1 = form1.handleSubmit((data) => {
    setStep1Data(data);
    setStep(1);
  });

  const handleStep2 = form2.handleSubmit((data) => {
    setStep2Data(data);
    setStep(2);
  });

  const handleStep3 = form3.handleSubmit((data) => {
    const services = step2Data.servicesText
      ? step2Data.servicesText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      name: step1Data.name,
      ownerName: step1Data.ownerName,
      email: step1Data.email,
      phone: step1Data.phone,
      address: step2Data.address,
      services,
      businessHours: step2Data.businessHoursText
        ? { description: step2Data.businessHoursText }
        : null,
      assistantName: data.assistantName || "IronClaw",
      aiInstructions: data.aiInstructions,
      telegramChatId: data.telegramChatId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    createBusinessMutation.mutate(payload);
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <IronClawLogo size={28} />
          <span className="font-black text-lg tracking-tight text-foreground">IronClaw</span>
        </div>

        <div className="mb-2">
          <h1 className="text-2xl font-black text-foreground">Set up your AI assistant</h1>
          <p className="text-muted-foreground text-sm mt-1">This takes about 2 minutes. You can edit everything later.</p>
        </div>

        <div className="mt-6">
          <StepIndicator current={step} />
        </div>

        <div className="bg-card border border-border rounded-xl p-7 shadow-lg">
          {/* ── Step 1 ── */}
          {step === 0 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Business name *</Label>
                <Input
                  id="name"
                  data-testid="input-business-name"
                  placeholder="Acme Auto Repair"
                  {...form1.register("name")}
                  className="bg-background border-border"
                />
                {form1.formState.errors.name && (
                  <p className="text-xs text-destructive">{form1.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ownerName">Your name *</Label>
                <Input
                  id="ownerName"
                  data-testid="input-owner-name"
                  placeholder="Alex Johnson"
                  {...form1.register("ownerName")}
                  className="bg-background border-border"
                />
                {form1.formState.errors.ownerName && (
                  <p className="text-xs text-destructive">{form1.formState.errors.ownerName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Business email *</Label>
                <Input
                  id="email"
                  data-testid="input-business-email"
                  type="email"
                  placeholder="info@acmeauto.com"
                  {...form1.register("email")}
                  className="bg-background border-border"
                />
                {form1.formState.errors.email && (
                  <p className="text-xs text-destructive">{form1.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  {...form1.register("phone")}
                  className="bg-background border-border"
                />
              </div>

              <Button
                type="submit"
                data-testid="button-step1-next"
                className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
              >
                Continue <ArrowRight size={16} className="ml-2" />
              </Button>
            </form>
          )}

          {/* ── Step 2 ── */}
          {step === 1 && (
            <form onSubmit={handleStep2} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="servicesText">Services you offer</Label>
                <Textarea
                  id="servicesText"
                  data-testid="input-services"
                  placeholder="Oil change, Tire rotation, Brake service, Engine diagnostics"
                  rows={3}
                  {...form2.register("servicesText")}
                  className="bg-background border-border resize-none"
                />
                <p className="text-xs text-muted-foreground">Separate services with commas</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="businessHoursText">Business hours</Label>
                <Input
                  id="businessHoursText"
                  data-testid="input-business-hours"
                  placeholder="Mon–Fri 9am–6pm, Sat 10am–4pm"
                  {...form2.register("businessHoursText")}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  data-testid="input-address"
                  placeholder="123 Main St, Toronto, ON"
                  {...form2.register("address")}
                  className="bg-background border-border"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="button-step2-back"
                  className="flex-1 border-border"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <Button
                  type="submit"
                  data-testid="button-step2-next"
                  className="flex-1 bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
                >
                  Continue <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </form>
          )}

          {/* ── Step 3 ── */}
          {step === 2 && (
            <form onSubmit={handleStep3} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="assistantName">Name your AI assistant *</Label>
                <Input
                  id="assistantName"
                  data-testid="input-assistant-name"
                  placeholder="IronClaw"
                  {...form3.register("assistantName")}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">This is the name your AI will go by (e.g., "Alex from Acme")</p>
                {form3.formState.errors.assistantName && (
                  <p className="text-xs text-destructive">{form3.formState.errors.assistantName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aiInstructions">Custom AI instructions (optional)</Label>
                <Textarea
                  id="aiInstructions"
                  data-testid="input-ai-instructions"
                  placeholder="Always be friendly and professional. Never make appointments outside business hours. Escalate any complaints to me directly..."
                  rows={4}
                  {...form3.register("aiInstructions")}
                  className="bg-background border-border resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telegramChatId">Telegram Chat ID (optional)</Label>
                <Input
                  id="telegramChatId"
                  data-testid="input-telegram-chat-id"
                  placeholder="123456789"
                  {...form3.register("telegramChatId")}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Message <span className="text-primary font-mono">@Bee_Leroux_bot</span> on Telegram to get your Chat ID
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="button-step3-back"
                  className="flex-1 border-border"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <Button
                  type="submit"
                  data-testid="button-step3-finish"
                  className="flex-1 bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
                  disabled={createBusinessMutation.isPending}
                >
                  {createBusinessMutation.isPending ? "Setting up..." : "Launch my AI"}
                  {!createBusinessMutation.isPending && <ArrowRight size={16} className="ml-2" />}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
