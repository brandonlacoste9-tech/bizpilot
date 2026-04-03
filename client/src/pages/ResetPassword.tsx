import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IronClawLogo } from "@/components/AppLayout";
import { HoneycombBackground } from "@/components/HoneycombBackground";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Get token from URL
  const token = new URLSearchParams(window.location.hash.split("?")[1] || "").get("token") || "";

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      if (password !== confirm) throw new Error("Passwords don't match");
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      return res;
    },
    onSuccess: () => setDone(true),
    onError: (err: any) => setError(err.message),
  });

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">
      <HoneycombBackground variant="page" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <IronClawLogo size={32} />
          <span className="font-black text-xl tracking-tight text-foreground mt-2">IronClaw</span>
        </div>

        {done ? (
          <div className="bg-card border border-border rounded-xl p-7 shadow-lg text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-foreground mb-2">Password reset</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Your password has been updated. You can now sign in.
            </p>
            <Link href="/login">
              <Button className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90">
                Sign in <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
          </div>
        ) : !token ? (
          <div className="bg-card border border-border rounded-xl p-7 shadow-lg text-center">
            <h1 className="text-lg font-bold text-foreground mb-2">Invalid link</h1>
            <p className="text-sm text-muted-foreground mb-4">
              This password reset link is invalid or expired. Please request a new one.
            </p>
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full border-border">
                Request new link
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-foreground">Set new password</h1>
              <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-7 shadow-lg">
              <form
                onSubmit={(e) => { e.preventDefault(); setError(""); resetMutation.mutate(); }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
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
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Type it again"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
