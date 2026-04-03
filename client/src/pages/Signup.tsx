import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IronClawLogo } from "@/components/AppLayout";
import { ArrowRight, CheckCircle } from "lucide-react";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });

  const signupMutation = useMutation({
    mutationFn: (data: InsertUser) => apiRequest("POST", "/api/auth/signup", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/onboarding");
    },
    onError: (err: any) => {
      const msg = err.message?.includes("409") ? "Email already registered" : err.message;
      toast({ title: "Signup failed", description: msg, variant: "destructive" });
    },
  });

  const onSubmit = form.handleSubmit((data) => signupMutation.mutate(data));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer mb-2">
              <IronClawLogo size={32} />
              <span className="font-black text-xl tracking-tight text-foreground">IronClaw</span>
            </div>
          </Link>
          <h1 className="text-xl font-bold text-foreground mt-4">Start for free</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your IronClaw account</p>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-xl p-7 shadow-lg">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
              <Input
                id="fullName"
                data-testid="input-full-name"
                type="text"
                placeholder="Alex Johnson"
                autoComplete="name"
                {...form.register("fullName")}
                className="bg-background border-border"
              />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...form.register("email")}
                className="bg-background border-border"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                {...form.register("password")}
                className="bg-background border-border"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-start gap-2 pt-1">
              <CheckCircle size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>

            <Button
              type="submit"
              data-testid="button-signup"
              className="w-full bg-primary text-primary-foreground font-semibold amber-glow hover:bg-primary/90 mt-1"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? "Creating account..." : "Create free account"}
              {!signupMutation.isPending && <ArrowRight size={16} className="ml-2" />}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login">
            <span className="text-primary hover:underline cursor-pointer font-medium">Sign in</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
