import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  Circle,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ChannelStatus {
  connected: boolean;
  label: string;
  detail?: string;
}

// ─────────────────────────────────────────────────────────────
// Step component
// ─────────────────────────────────────────────────────────────

function SetupStep({
  number,
  title,
  children,
  done,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
            done
              ? "bg-green-500/20 text-green-400"
              : "bg-primary/15 text-primary"
          )}
        >
          {done ? <CheckCircle size={14} /> : number}
        </div>
        <div className="flex-1 w-px bg-border mt-2" />
      </div>
      <div className="pb-6 flex-1">
        <div className={cn("text-sm font-semibold mb-2", done ? "text-green-400" : "text-foreground")}>
          {title}
        </div>
        <div className="text-sm text-muted-foreground space-y-2">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Channel card
// ─────────────────────────────────────────────────────────────

function ChannelCard({
  icon,
  title,
  description,
  status,
  children,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: ChannelStatus;
  children: React.ReactNode;
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState(!status.connected);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", accentColor)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={cn("w-2 h-2 rounded-full", status.connected ? "bg-green-400" : "bg-amber-400 animate-pulse")} />
          <span className={cn("text-xs font-medium", status.connected ? "text-green-400" : "text-amber-400")}>
            {status.label}
          </span>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-border p-5">{children}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Copyable code block
// ─────────────────────────────────────────────────────────────

function CopyBlock({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      {label && <div className="text-xs font-medium text-muted-foreground">{label}</div>}
      <div className="flex items-center gap-2">
        <div className="flex-1 p-2.5 rounded-lg bg-background border border-border font-mono text-xs text-foreground truncate">
          {value}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-shrink-0 border-border"
          onClick={handleCopy}
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Setup Page
// ─────────────────────────────────────────────────────────────

export default function Setup() {
  const { toast } = useToast();

  const { data: authData, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const business = authData?.business;
  const subscription = authData?.subscription;
  const plan = subscription?.plan || "free";

  const forwardingAddress = business?.id ? `inbox-${business.id}@ironclaw.ca` : "";
  const telegramDeepLink = business?.id ? `https://t.me/Bee_Leroux_bot?start=${business.id}` : "";
  const twilioNumber = business?.twilioPhoneNumber;

  const emailConnected = !!forwardingAddress;
  const telegramConnected = !!business?.telegramChatId;
  const phoneConnected = !!twilioNumber;

  const allConnected = emailConnected && telegramConnected && phoneConnected;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-7 max-w-2xl">
          <div className="h-8 w-48 bg-secondary rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!business) {
    return (
      <AppLayout>
        <div className="p-7 max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Zap size={32} className="text-primary mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Complete Onboarding First</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Set up your business profile before connecting channels.
            </p>
            <a href="/#/onboarding">
              <Button className="bg-primary text-primary-foreground amber-glow hover:bg-primary/90">
                Start Onboarding <ArrowRight size={14} className="ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-7 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-black text-foreground">Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your channels so your AI assistant can handle emails, calls, and messages.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">
              {allConnected ? "All channels connected" : "Setup progress"}
            </span>
            <span className="text-xs text-muted-foreground">
              {[emailConnected, telegramConnected, phoneConnected].filter(Boolean).length}/3 channels
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary rounded-full h-1.5 transition-all duration-500"
              style={{
                width: `${([emailConnected, telegramConnected, phoneConnected].filter(Boolean).length / 3) * 100}%`,
              }}
            />
          </div>
          {allConnected && (
            <div className="flex items-center gap-2 mt-3 text-green-400 text-sm">
              <Shield size={14} />
              <span className="font-medium">Your AI assistant is fully operational.</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* ── Email Channel ── */}
          <ChannelCard
            icon={<Mail size={20} className="text-blue-400" />}
            title="Email"
            description="AI reads, replies, and logs every email automatically"
            status={{
              connected: emailConnected,
              label: emailConnected ? "Ready" : "Setup needed",
            }}
            accentColor="bg-blue-500/10"
          >
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Forward your business emails to this address. Your AI will process them, write a reply using your
                business context, and send it automatically.
              </p>

              <CopyBlock value={forwardingAddress} label="Your AI email address" />

              <div className="bg-background rounded-lg border border-border p-4 space-y-3">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wide">How to set up forwarding</div>
                <SetupStep number={1} title="Open your email settings" done={false}>
                  <p>Go to your email provider's forwarding settings:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <a
                      href="https://support.google.com/mail/answer/10957?hl=en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Gmail <ExternalLink size={10} />
                    </a>
                    <a
                      href="https://support.microsoft.com/en-us/office/turn-on-automatic-forwarding-in-outlook-7f2670a1-7fff-4475-8a3c-5822d63b0c8e"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Outlook <ExternalLink size={10} />
                    </a>
                    <a
                      href="https://support.yahoo.com/kb/SLN22028.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Yahoo <ExternalLink size={10} />
                    </a>
                  </div>
                </SetupStep>
                <SetupStep number={2} title="Paste your AI email address" done={false}>
                  <p>Copy the address above and paste it as the forwarding destination.</p>
                </SetupStep>
                <SetupStep number={3} title="Done!" done={false}>
                  <p>
                    New emails will appear in your{" "}
                    <a href="/#/inbox" className="text-primary hover:underline">
                      Inbox
                    </a>{" "}
                    with AI-generated responses.
                  </p>
                </SetupStep>
              </div>
            </div>
          </ChannelCard>

          {/* ── Telegram Channel ── */}
          <ChannelCard
            icon={<MessageSquare size={20} className="text-sky-400" />}
            title="Telegram"
            description="Get instant notifications and control your AI on the go"
            status={{
              connected: telegramConnected,
              label: telegramConnected ? "Connected" : "Not connected",
              detail: telegramConnected ? `Chat ID: ${business.telegramChatId}` : undefined,
            }}
            accentColor="bg-sky-500/10"
          >
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Connect Telegram to get real-time alerts for new emails, phone calls, and escalations.
                You can also reply to customers, pause auto-replies, and check stats — all from Telegram.
              </p>

              {telegramConnected ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-green-400">Telegram connected</div>
                    <div className="text-xs text-muted-foreground">
                      Chat ID: <span className="font-mono">{business.telegramChatId}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-background rounded-lg border border-border p-4 space-y-3">
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wide">One-click connect</div>
                  <SetupStep number={1} title="Open the bot in Telegram" done={false}>
                    <p>Click the button below — it opens directly in Telegram and auto-links your business.</p>
                    <a
                      href={telegramDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2"
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#2AABEE] text-white hover:bg-[#229ED9] font-semibold"
                      >
                        <MessageSquare size={14} className="mr-2" />
                        Connect Telegram
                        <ExternalLink size={12} className="ml-2" />
                      </Button>
                    </a>
                  </SetupStep>
                  <SetupStep number={2} title='Tap "Start" in Telegram' done={false}>
                    <p>
                      When the bot opens, tap <strong>Start</strong>. It will automatically link your business
                      to this Telegram chat.
                    </p>
                  </SetupStep>
                  <SetupStep number={3} title="Refresh this page" done={false}>
                    <p>Come back here and refresh — the status will update to "Connected".</p>
                  </SetupStep>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <strong>Available commands:</strong>{" "}
                <span className="font-mono text-primary">/status</span>{" "}
                <span className="font-mono text-primary">/inbox</span>{" "}
                <span className="font-mono text-primary">/reply</span>{" "}
                <span className="font-mono text-primary">/pause</span>{" "}
                <span className="font-mono text-primary">/resume</span>{" "}
                <span className="font-mono text-primary">/help</span>
              </div>
            </div>
          </ChannelCard>

          {/* ── Phone Channel ── */}
          <ChannelCard
            icon={<Phone size={20} className="text-emerald-400" />}
            title="Phone Calls"
            description="AI answers calls, takes messages, transcribes voicemails"
            status={{
              connected: phoneConnected,
              label: phoneConnected ? "Active" : plan === "free" || plan === "starter" ? "Pro plan required" : "Not configured",
            }}
            accentColor="bg-emerald-500/10"
          >
            <div className="space-y-4">
              {phoneConnected ? (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-green-400">Phone active</div>
                      <div className="text-xs text-muted-foreground font-mono">{twilioNumber}</div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground">
                    When someone calls this number, your AI assistant answers, takes a message,
                    records and transcribes the call, and notifies you via Telegram.
                  </p>
                </>
              ) : plan === "free" || plan === "starter" ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    Phone call handling is available on the <strong>Pro</strong> plan and above.
                    Your AI will answer calls, take messages, record and transcribe voicemails,
                    and notify you instantly via Telegram.
                  </p>
                  <a href="https://buy.stripe.com/7sY8wOcFL9Kdc0e1D31Fe0B" target="_blank" rel="noopener noreferrer">
                    <Button
                      type="button"
                      className="bg-primary text-primary-foreground amber-glow hover:bg-primary/90"
                    >
                      Upgrade to Pro — $79/mo <ArrowRight size={14} className="ml-2" />
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    Your plan includes phone call handling. A dedicated phone number will be
                    assigned to your business. Contact support or check back shortly.
                  </p>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <Circle size={8} className="animate-pulse fill-current" />
                      <span className="font-medium">Phone number being provisioned</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your dedicated business number will be assigned within 24 hours.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ChannelCard>
        </div>

        {/* Tip */}
        <div className="mt-6 p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-start gap-3">
            <Zap size={16} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-foreground mb-1">Need help?</div>
              <p className="text-xs text-muted-foreground">
                If you use{" "}
                <a
                  href="https://perplexity.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Perplexity Comet
                </a>
                , just ask it to help you set up email forwarding — it can walk you through the
                exact steps for your email provider in seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
