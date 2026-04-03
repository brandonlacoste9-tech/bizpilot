import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { updateBusinessSchema, type UpdateBusiness } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Bot,
  CreditCard,
  MessageSquare,
  CheckCircle,
  Zap,
  Crown,
  ArrowRight,
  Save,
  Mail,
  Phone,
  Copy,
  Check,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary">{icon}</span>
        </div>
        <div>
          <h2 className="font-bold text-base text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Plan card
// ─────────────────────────────────────────────────────────────

const STRIPE_LINKS = {
  starter: "https://buy.stripe.com/9B6fZgfRX2hLd4i95v1Fe0A",
  pro: "https://buy.stripe.com/7sY8wOcFL9Kdc0e1D31Fe0B",
  enterprise: "https://buy.stripe.com/cNieVcbBH2hLfcq0yZ1Fe0z",
};

function PlanInfo({ plan }: { plan: string }) {
  const plans = {
    free: { label: "Free", color: "text-muted-foreground", features: ["Limited emails", "Basic support"] },
    starter: { label: "Starter", color: "text-blue-400", features: ["100 emails/mo", "Telegram control", "Daily briefings"] },
    pro: { label: "Pro", color: "text-primary", features: ["Unlimited emails", "Calendar sync", "Custom AI instructions", "Priority support"] },
    enterprise: { label: "Enterprise", color: "text-purple-400", features: ["Everything in Pro", "Multi-location", "API access", "White-label"] },
  };

  const p = plans[plan as keyof typeof plans] || plans.free;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Crown size={15} className={p.color} />
        <span className={`font-bold text-base ${p.color}`}>{p.label} Plan</span>
      </div>
      <ul className="space-y-1.5 mb-4">
        {p.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle size={13} className="text-primary flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      {plan !== "enterprise" && (
        <div className="space-y-2">
          {plan !== "starter" && plan !== "pro" && (
            <a href={STRIPE_LINKS.starter} target="_blank" rel="noopener noreferrer">
              <Button
                data-testid="button-upgrade-starter"
                variant="outline"
                className="w-full justify-between border-border text-sm"
              >
                Upgrade to Starter — $29/mo <ArrowRight size={14} />
              </Button>
            </a>
          )}
          {plan !== "pro" && (
            <a href={STRIPE_LINKS.pro} target="_blank" rel="noopener noreferrer">
              <Button
                data-testid="button-upgrade-pro"
                className="w-full justify-between bg-primary text-primary-foreground amber-glow hover:bg-primary/90 text-sm"
              >
                Upgrade to Pro — $79/mo <ArrowRight size={14} />
              </Button>
            </a>
          )}
          {plan !== "enterprise" && (
            <a href={STRIPE_LINKS.enterprise} target="_blank" rel="noopener noreferrer">
              <Button
                data-testid="button-upgrade-enterprise"
                variant="outline"
                className="w-full justify-between border-border text-sm"
              >
                Enterprise — $199/mo <ArrowRight size={14} />
              </Button>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings Page
// ─────────────────────────────────────────────────────────────

export default function Settings() {
  const { toast } = useToast();

  const { data: authData, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const business = authData?.business;
  const subscription = authData?.subscription;

  const [copied, setCopied] = useState(false);

  const form = useForm<UpdateBusiness>({
    resolver: zodResolver(updateBusinessSchema),
    defaultValues: {
      name: "",
      ownerName: "",
      email: "",
      phone: "",
      address: "",
      assistantName: "IronClaw",
      aiInstructions: "",
      telegramChatId: "",
      autoReplyEnabled: true,
      emailNotifications: true,
      smsNotifications: true,
    },
  });

  // Populate form when business loads
  useEffect(() => {
    if (business) {
      form.reset({
        name: business.name || "",
        ownerName: business.ownerName || "",
        email: business.email || "",
        phone: business.phone || "",
        address: business.address || "",
        assistantName: business.assistantName || "IronClaw",
        aiInstructions: business.aiInstructions || "",
        telegramChatId: business.telegramChatId || "",
        autoReplyEnabled: business.autoReplyEnabled !== false,
        emailNotifications: business.emailNotifications !== false,
        smsNotifications: business.smsNotifications !== false,
      });
    }
  }, [business, form]);

  const forwardingAddress = business?.id
    ? `inbox-${business.id}@ironclaw.ca`
    : "";

  const handleCopyEmail = () => {
    if (forwardingAddress) {
      navigator.clipboard.writeText(forwardingAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBusiness) => apiRequest("PATCH", "/api/business", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Settings saved", description: "Your changes have been applied." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = form.handleSubmit((data) => updateMutation.mutate(data));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-7 max-w-2xl space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-7 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-black text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your business profile and AI configuration.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Business Profile */}
          <Section
            icon={<Building2 size={18} />}
            title="Business Profile"
            description="Your business information used in AI responses"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Business name</Label>
                  <Input
                    id="name"
                    data-testid="input-settings-business-name"
                    {...form.register("name")}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName">Owner name</Label>
                  <Input
                    id="ownerName"
                    data-testid="input-settings-owner-name"
                    {...form.register("ownerName")}
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Business email</Label>
                  <Input
                    id="email"
                    data-testid="input-settings-email"
                    type="email"
                    {...form.register("email")}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    data-testid="input-settings-phone"
                    {...form.register("phone")}
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  data-testid="input-settings-address"
                  {...form.register("address")}
                  className="bg-background border-border"
                />
              </div>
            </div>
          </Section>

          {/* AI Configuration */}
          <Section
            icon={<Bot size={18} />}
            title="AI Configuration"
            description="Customize how your AI assistant behaves"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="assistantName">Assistant name</Label>
                <Input
                  id="assistantName"
                  data-testid="input-settings-assistant-name"
                  placeholder="IronClaw"
                  {...form.register("assistantName")}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">The name your AI will use when interacting with customers</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aiInstructions">Custom AI instructions</Label>
                <Textarea
                  id="aiInstructions"
                  data-testid="input-settings-ai-instructions"
                  placeholder="Always be professional. Respond in English only. Never quote prices without checking current rate sheet..."
                  {...form.register("aiInstructions")}
                  className="bg-background border-border resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">These instructions guide your AI's behavior and tone</p>
              </div>
            </div>
          </Section>

          {/* Telegram */}
          <Section
            icon={<MessageSquare size={18} />}
            title="Telegram Connection"
            description="Receive daily briefings and approve AI actions on the go"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border">
                <div className={`w-2 h-2 rounded-full ${business?.telegramChatId ? "bg-green-400" : "bg-muted-foreground"}`} />
                <span className="text-sm text-muted-foreground">
                  {business?.telegramChatId ? "Telegram connected" : "Not connected"}
                </span>
                {business?.telegramChatId && (
                  <span className="ml-auto text-xs font-mono text-muted-foreground">{business.telegramChatId}</span>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                <Input
                  id="telegramChatId"
                  data-testid="input-settings-telegram-chat-id"
                  placeholder="123456789"
                  {...form.register("telegramChatId")}
                  className="bg-background border-border"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Message <span className="text-primary font-mono">@Bee_Leroux_bot</span> on Telegram and type{" "}
                <span className="text-primary font-mono">/start</span> to get your Chat ID.
              </p>
            </div>
          </Section>

          {/* Email Forwarding */}
          <Section
            icon={<Mail size={18} />}
            title="Email Forwarding"
            description="Forward inbound emails to your AI assistant"
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Configure your email provider to forward messages to this address. Your AI will automatically process and reply.
              </p>
              {forwardingAddress ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-lg bg-background border border-border font-mono text-xs text-foreground truncate">
                    {forwardingAddress}
                  </div>
                  <Button
                    type="button"
                    data-testid="button-copy-email"
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 border-border"
                    onClick={handleCopyEmail}
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-background border border-border text-xs text-muted-foreground">
                  Complete onboarding to get your forwarding address.
                </div>
              )}
            </div>
          </Section>

          {/* Phone Number */}
          <Section
            icon={<Phone size={18} />}
            title="Phone Number"
            description="Twilio phone number for inbound calls"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border">
                <div className={`w-2 h-2 rounded-full ${business?.twilioPhoneNumber ? "bg-green-400" : "bg-muted-foreground"}`} />
                <span className="text-sm text-muted-foreground font-mono">
                  {business?.twilioPhoneNumber || "Not configured"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Phone call handling requires a Pro or Enterprise plan. Configure your Twilio number in the Vercel environment variables.
              </p>
            </div>
          </Section>

          {/* AI Settings */}
          <Section
            icon={<Zap size={18} />}
            title="AI Settings"
            description="Control auto-reply and notification preferences"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Auto-reply</div>
                  <div className="text-xs text-muted-foreground">Automatically send AI replies to new messages</div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-auto-reply"
                  onClick={() => form.setValue("autoReplyEnabled", !form.watch("autoReplyEnabled"))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.watch("autoReplyEnabled") ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      form.watch("autoReplyEnabled") ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Email notifications</div>
                  <div className="text-xs text-muted-foreground">Receive email alerts for new messages</div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-email-notifications"
                  onClick={() => form.setValue("emailNotifications", !form.watch("emailNotifications"))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.watch("emailNotifications") ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      form.watch("emailNotifications") ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">SMS notifications</div>
                  <div className="text-xs text-muted-foreground">Receive SMS alerts for new messages</div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-sms-notifications"
                  onClick={() => form.setValue("smsNotifications", !form.watch("smsNotifications"))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.watch("smsNotifications") ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      form.watch("smsNotifications") ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </Section>

          {/* Save button */}
          <Button
            type="submit"
            data-testid="button-save-settings"
            className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
            disabled={updateMutation.isPending}
          >
            <Save size={16} className="mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>

        {/* Billing section (separate, no submit) */}
        <div className="mt-5">
          <Section
            icon={<CreditCard size={18} />}
            title="Billing & Plan"
            description="Manage your subscription"
          >
            <PlanInfo plan={subscription?.plan || "free"} />
          </Section>
        </div>

        {/* Account info */}
        <div className="mt-5 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</span>
          </div>
          <div className="text-sm text-foreground">{authData?.user?.fullName}</div>
          <div className="text-xs text-muted-foreground">{authData?.user?.email}</div>
        </div>
      </div>
    </AppLayout>
  );
}
