import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IronClawLogo } from "@/components/AppLayout";
import { HoneycombBackground } from "@/components/HoneycombBackground";
import {
  CheckCircle,
  ArrowRight,
  Lock,
  Zap,
  Crown,
} from "lucide-react";

const STRIPE_LINKS: Record<string, string> = {
  starter: "https://buy.stripe.com/9B6fZgfRX2hLd4i95v1Fe0A",
  pro: "https://buy.stripe.com/7sY8wOcFL9Kdc0e1D31Fe0B",
  enterprise: "https://buy.stripe.com/cNieVcbBH2hLfcq0yZ1Fe0z",
};

interface UpgradeWallProps {
  onComplete?: () => void;
}

export function UpgradeWall({ onComplete }: UpgradeWallProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"password" | "plan">("password");

  const setPasswordMutation = useMutation({
    mutationFn: async (pwd: string) => {
      await apiRequest("POST", "/api/auth/set-password", { password: pwd });
    },
    onSuccess: () => {
      toast({ title: "Password set", description: "You can now sign in anytime." });
      setStep("plan");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setPasswordMutation.mutate(password);
  };

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">
      <HoneycombBackground variant="page" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <IronClawLogo size={32} />
          <h1 className="text-xl font-bold text-foreground mt-4">
            {step === "password" ? "You've been crushing it" : "Choose your plan"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {step === "password"
              ? "You've used all your free messages this month. Set a password to secure your account, then pick a plan to keep going."
              : "Your password is set. Now choose a plan to unlock unlimited power."}
          </p>
        </div>

        {step === "password" ? (
          <div className="bg-card border border-border rounded-xl p-7 shadow-lg">
            <div className="flex items-center gap-2 mb-5">
              <Lock size={16} className="text-primary" />
              <span className="text-sm font-bold text-foreground">Secure your account</span>
            </div>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Type it again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
                disabled={setPasswordMutation.isPending}
              >
                {setPasswordMutation.isPending ? "Setting..." : "Set Password & Continue"}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Starter */}
            <a href={STRIPE_LINKS.starter} target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-foreground">Starter</div>
                  <div className="text-lg font-black text-foreground">$29<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
                </div>
                <ul className="space-y-1">
                  {["100 emails/month", "Telegram control", "Daily briefings"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle size={12} className="text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </a>

            {/* Pro — highlighted */}
            <a href={STRIPE_LINKS.pro} target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-primary/5 border border-primary rounded-xl p-5 cursor-pointer relative">
                <div className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  RECOMMENDED
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown size={14} className="text-primary" />
                    <span className="text-sm font-bold text-foreground">Pro</span>
                  </div>
                  <div className="text-lg font-black text-foreground">$79<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
                </div>
                <ul className="space-y-1">
                  {["Unlimited emails", "Phone call handling", "Calendar sync", "Custom AI instructions"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle size={12} className="text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </a>

            {/* Enterprise */}
            <a href={STRIPE_LINKS.enterprise} target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-foreground">Enterprise</div>
                  <div className="text-lg font-black text-foreground">$199<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
                </div>
                <ul className="space-y-1">
                  {["Everything in Pro", "Multi-location", "API access", "White-label option"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle size={12} className="text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
