import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Mail,
  CalendarDays,
  MessageSquare,
  Brain,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  ChevronRight,
  Phone,
  Smartphone,
} from "lucide-react";
import { IronClawLogo } from "@/components/AppLayout";
import { HoneycombBackground } from "@/components/HoneycombBackground";

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors group">
      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <span className="text-primary">{icon}</span>
      </div>
      <h3 className="font-bold text-base text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

const STRIPE_LINKS: Record<string, string> = {
  starter: "https://buy.stripe.com/9B6fZgfRX2hLd4i95v1Fe0A",
  pro: "https://buy.stripe.com/7sY8wOcFL9Kdc0e1D31Fe0B",
  enterprise: "https://buy.stripe.com/cNieVcbBH2hLfcq0yZ1Fe0z",
};

function PricingCard({
  name,
  price,
  features,
  highlight,
  cta,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  cta: string;
}) {
  const stripeLink = STRIPE_LINKS[name.toLowerCase()];
  return (
    <div
      className={`relative p-7 rounded-xl border flex flex-col ${
        highlight
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-card"
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
          MOST POPULAR
        </div>
      )}
      <div className="mb-6">
        <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{name}</div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black text-foreground">{price}</span>
          <span className="text-muted-foreground mb-1">/mo</span>
        </div>
      </div>
      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <CheckCircle size={15} className="text-primary mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>
      <a href={stripeLink || "#"} target="_blank" rel="noopener noreferrer">
        <Button
          data-testid={`button-pricing-${name.toLowerCase()}`}
          className={`w-full font-semibold ${
            highlight
              ? "bg-primary text-primary-foreground amber-glow hover:bg-primary/90"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {cta}
        </Button>
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Landing Page
// ─────────────────────────────────────────────────────────────

export default function Landing() {
  const { toast } = useToast();
  const [waitlistEmail, setWaitlistEmail] = useState("");

  const waitlistMutation = useMutation({
    mutationFn: (email: string) =>
      apiRequest("POST", "/api/waitlist", { email }),
    onSuccess: () => {
      toast({ title: "You're on the list!", description: "We'll notify you when IronClaw launches." });
      setWaitlistEmail("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleScrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Single honeycomb layer behind entire page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <HoneycombBackground variant="hero" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background/80" />
      </div>
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IronClawLogo size={26} />
            <span className="font-black text-lg tracking-tight text-foreground">IronClaw</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary uppercase tracking-wider">Beta</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleScrollTo("features")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => handleScrollTo("pricing")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => handleScrollTo("faq")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-login" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button
                size="sm"
                data-testid="link-signup"
                className="bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-8">
            <Zap size={12} />
            AI-powered for small business owners
            <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-primary text-primary-foreground uppercase tracking-wider">Beta</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight">
            Your AI.{" "}
            <span className="text-primary">Your Rules.</span>
            <br />
            Your Business.
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            IronClaw handles your emails, books appointments, and answers customer
            inquiries — so you can run your business, not answer messages all day.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding">
              <Button
                size="lg"
                data-testid="button-hero-cta"
                className="bg-primary text-primary-foreground font-bold amber-glow hover:bg-primary/90 px-8 h-12 text-base"
              >
                Get Started Free
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <button
              onClick={() => handleScrollTo("how-it-works")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              See how it works
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><CheckCircle size={14} className="text-primary" /> No credit card required</span>
            <span className="flex items-center gap-2"><CheckCircle size={14} className="text-primary" /> Setup in 5 minutes</span>
            <span className="flex items-center gap-2"><CheckCircle size={14} className="text-primary" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-24">
        <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Features</div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Your AI handles the busywork
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            IronClaw works 24/7 so you don't have to. Set it up once, then focus on what you do best.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard
            icon={<Mail size={22} />}
            title="Email Handling"
            description="AI reads and categorizes every email, drafts replies, and escalates only what needs your attention."
          />
          <FeatureCard
            icon={<CalendarDays size={22} />}
            title="Calendar Sync"
            description="Automatically books appointments based on your availability. Clients get instant confirmation."
          />
          <FeatureCard
            icon={<Phone size={22} />}
            title="Phone & SMS"
            description="Your AI answers calls, takes messages, and replies to texts instantly. Customers get help 24/7 — even when you're busy."
          />
          <FeatureCard
            icon={<Smartphone size={22} />}
            title="Telegram Control"
            description="Manage your business from your phone. Send voice commands, check stats, reply to customers — all from Telegram."
          />
        </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative py-24 bg-card/60 border-y border-border">
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-primary text-xs font-bold uppercase tracking-widest mb-3">How It Works</div>
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Up and running in minutes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: <Zap size={24} />,
                title: "Sign Up",
                desc: "Create your account in seconds. No credit card needed to start. Your data, your control.",
              },
              {
                step: "02",
                icon: <Shield size={24} />,
                title: "Set Up Your AI",
                desc: "Tell IronClaw about your business, services, and how you want it to respond. Name it anything you like.",
              },
              {
                step: "03",
                icon: <TrendingUp size={24} />,
                title: "Sit Back & Grow",
                desc: "Your AI handles incoming messages, books appointments, and sends you a daily briefing via Telegram.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-7xl font-black text-primary/10 leading-none mb-4 select-none">{step}</div>
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  {icon}
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative py-24">
        <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Pricing</div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <PricingCard
            name="Starter"
            price="$29"
            cta="Start with Starter"
            features={[
              "1 business profile",
              "Up to 100 emails/month",
              "Telegram bot control",
              "Daily briefings",
              "Basic auto-replies",
              "Email support",
            ]}
          />
          <PricingCard
            name="Pro"
            price="$79"
            cta="Go Pro"
            highlight
            features={[
              "Everything in Starter",
              "Unlimited emails & SMS",
              "Dedicated phone number",
              "Public booking page",
              "Custom AI instructions",
              "Smart call routing",
            ]}
          />
          <PricingCard
            name="Enterprise"
            price="$199"
            cta="Contact Sales"
            features={[
              "Everything in Pro",
              "Multi-location support",
              "API access",
              "Custom integrations",
              "Dedicated onboarding",
              "White-label option",
            ]}
          />
        </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative py-24 bg-card/60 border-y border-border">
        <div className="relative max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-primary text-xs font-bold uppercase tracking-widest mb-3">FAQ</div>
            <h2 className="text-3xl md:text-4xl font-black mb-4">Frequently asked questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {[
              {
                q: "How does IronClaw connect to my email?",
                a: "IronClaw integrates with your email provider using OAuth. Setup takes under 2 minutes and never stores your email password. You stay in full control.",
              },
              {
                q: "Can I customize what the AI says?",
                a: "Yes. In the Pro and Enterprise plans, you can write custom instructions for your AI. You can set its tone, what to say, what not to say, and how to handle specific types of requests.",
              },
              {
                q: "How does Telegram control work?",
                a: "Link your Telegram account to IronClaw. Your assistant sends you daily briefings and will ask for approval before taking any action you've flagged as requiring your sign-off.",
              },
              {
                q: "Is my data secure?",
                a: "All data is stored encrypted at rest in a SOC 2 compliant database. We never share your data with third parties, and you can export or delete everything at any time.",
              },
              {
                q: "Can I cancel at any time?",
                a: "Absolutely. No lock-in, no cancellation fees. Cancel your subscription from the settings page with one click.",
              },
              {
                q: "What happens to my data if I cancel?",
                a: "Your data is retained for 30 days after cancellation, giving you time to export everything. After that, it's permanently deleted.",
              },
            ].map(({ q, a }, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-border bg-background rounded-lg px-5"
              >
                <AccordionTrigger className="text-left font-semibold text-sm hover:no-underline">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Waitlist CTA ── */}
      <section className="relative py-24">
        <div className="relative max-w-6xl mx-auto px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Zap size={26} className="text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Ready to put your business on autopilot?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of small business owners using IronClaw. Start free today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              data-testid="input-waitlist-email"
              type="email"
              placeholder="your@email.com"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              className="flex-1 bg-card border-border"
              onKeyDown={(e) => {
                if (e.key === "Enter" && waitlistEmail) {
                  waitlistMutation.mutate(waitlistEmail);
                }
              }}
            />
            <Button
              data-testid="button-join-waitlist"
              className="bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
              onClick={() => waitlistEmail && waitlistMutation.mutate(waitlistEmail)}
              disabled={waitlistMutation.isPending}
            >
              {waitlistMutation.isPending ? "Joining..." : "Join Waitlist"}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs mt-4">Or just <Link href="/onboarding"><span className="text-primary hover:underline cursor-pointer">get started now →</span></Link></p>
        </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <IronClawLogo size={22} />
              <span className="font-black text-base tracking-tight">IronClaw</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
              <Link href="/login"><span className="hover:text-foreground transition-colors cursor-pointer">Sign In</span></Link>
            </div>
            <div className="text-xs text-muted-foreground">
              © 2026 IronClaw. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
