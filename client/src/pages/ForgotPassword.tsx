import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IronClawLogo } from "@/components/AppLayout";
import { HoneycombBackground } from "@/components/HoneycombBackground";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
    },
    onSuccess: () => setSent(true),
    onError: () => setSent(true), // Don't reveal if email exists
  });

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">
      <HoneycombBackground variant="page" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer mb-2">
              <IronClawLogo size={32} />
              <span className="font-black text-xl tracking-tight text-foreground">IronClaw</span>
            </div>
          </Link>
        </div>

        {sent ? (
          <div className="bg-card border border-border rounded-xl p-7 shadow-lg text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground mb-4">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full border-border">
                <ArrowLeft size={14} className="mr-2" /> Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-foreground">Forgot your password?</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send a reset link</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-7 shadow-lg">
              <form
                onSubmit={(e) => { e.preventDefault(); resetMutation.mutate(); }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-border"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
                  disabled={resetMutation.isPending || !email}
                >
                  {resetMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link href="/login">
                <span className="text-primary hover:underline cursor-pointer font-medium flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Back to sign in
                </span>
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
