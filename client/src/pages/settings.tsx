import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Bot,
  Mail,
  MessageCircle,
  Bell,
  Save,
  Clock,
  Wrench,
  HelpCircle,
} from "lucide-react";
import type { Business } from "@shared/schema";

function BusinessProfileTab({ business }: { business: Business }) {
  const [name, setName] = useState(business.name);
  const [ownerName, setOwnerName] = useState(business.ownerName);
  const [email, setEmail] = useState(business.email);
  const [phone, setPhone] = useState(business.phone || "");
  const [address, setAddress] = useState(business.address || "");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/business/${business.id}`, {
        name,
        ownerName,
        email,
        phone: phone || null,
        address: address || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      toast({ title: "Saved", description: "Business profile updated." });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="biz-name" className="text-xs">Business Name</Label>
          <Input id="biz-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-business-name" />
        </div>
        <div>
          <Label htmlFor="biz-owner" className="text-xs">Owner Name</Label>
          <Input id="biz-owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} data-testid="input-owner-name" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="biz-email" className="text-xs">Email</Label>
          <Input id="biz-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-business-email" />
        </div>
        <div>
          <Label htmlFor="biz-phone" className="text-xs">Phone</Label>
          <Input id="biz-phone" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-business-phone" />
        </div>
      </div>
      <div>
        <Label htmlFor="biz-address" className="text-xs">Address</Label>
        <Input id="biz-address" value={address} onChange={(e) => setAddress(e.target.value)} data-testid="input-business-address" />
      </div>

      {/* Business hours (read-only display for now) */}
      {business.businessHours && (
        <div>
          <Label className="text-xs flex items-center gap-1"><Clock className="size-3" /> Business Hours</Label>
          <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {Object.entries(JSON.parse(business.businessHours) as Record<string, string>).map(([day, hours]) => (
              <div key={day} className="text-xs bg-muted rounded-md px-2 py-1.5">
                <span className="font-medium capitalize">{day}:</span>{" "}
                <span className="text-muted-foreground">{hours}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {business.services && (
        <div>
          <Label className="text-xs flex items-center gap-1"><Wrench className="size-3" /> Services</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(JSON.parse(business.services) as string[]).map((service) => (
              <Badge key={service} variant="secondary" className="text-xs" data-testid={`badge-service-${service.replace(/\s/g, "-").toLowerCase()}`}>
                {service}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      {business.faqEntries && (
        <div>
          <Label className="text-xs flex items-center gap-1"><HelpCircle className="size-3" /> FAQ Entries</Label>
          <div className="mt-1 space-y-2">
            {(JSON.parse(business.faqEntries) as { question: string; answer: string }[]).map((faq, i) => (
              <div key={i} className="bg-muted rounded-md p-2.5 text-xs">
                <p className="font-medium">{faq.question}</p>
                <p className="text-muted-foreground mt-0.5">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-save-profile">
        <Save className="size-3.5 mr-1.5" />
        {mutation.isPending ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}

function AISettingsTab({ business }: { business: Business }) {
  const [aiInstructions, setAiInstructions] = useState(business.aiInstructions || "");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/business/${business.id}`, {
        aiInstructions: aiInstructions || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      toast({ title: "Saved", description: "AI instructions updated." });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="ai-instructions" className="text-xs">Custom AI Instructions</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
          Tell BizPilot how to respond on your behalf. Include tone preferences, special policies, or information to always mention.
        </p>
        <Textarea
          id="ai-instructions"
          value={aiInstructions}
          onChange={(e) => setAiInstructions(e.target.value)}
          placeholder="Be friendly and professional. Always mention we are licensed and insured..."
          className="min-h-[120px] text-sm"
          data-testid="input-ai-instructions"
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Auto-Reply Settings</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">Auto-reply to simple inquiries</p>
            <p className="text-[11px] text-muted-foreground">AI will auto-respond to FAQ-type questions.</p>
          </div>
          <Switch defaultChecked data-testid="switch-auto-reply" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">Escalate high-value leads</p>
            <p className="text-[11px] text-muted-foreground">Projects over $5,000 are flagged for your review.</p>
          </div>
          <Switch defaultChecked data-testid="switch-escalate-leads" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">Filter spam automatically</p>
            <p className="text-[11px] text-muted-foreground">AI identifies and hides spam messages.</p>
          </div>
          <Switch defaultChecked data-testid="switch-filter-spam" />
        </div>
      </div>

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-save-ai">
        <Save className="size-3.5 mr-1.5" />
        {mutation.isPending ? "Saving..." : "Save AI Settings"}
      </Button>
    </div>
  );
}

function IntegrationsTab({ business }: { business: Business }) {
  return (
    <div className="space-y-4">
      {/* Telegram */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <MessageCircle className="size-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Telegram Bot</h3>
                <Badge variant="secondary" className="text-[10px] py-0" data-testid="badge-telegram-status">
                  {business.telegramChatId ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Receive briefings and approve responses via Telegram.</p>
              <div className="mt-2">
                <Label htmlFor="telegram-token" className="text-[11px]">Bot Token</Label>
                <Input
                  id="telegram-token"
                  type="password"
                  placeholder="Enter your Telegram bot token"
                  className="mt-0.5"
                  data-testid="input-telegram-token"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Mail className="size-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Email (Gmail)</h3>
                <Badge variant="secondary" className="text-[10px] py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid="badge-email-status">
                  Connected
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Syncing with {business.email}. BizPilot reads and drafts replies to incoming emails.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Bell className="size-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">Notifications</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Configure when and how you get notified.</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Escalation alerts</span>
                  <Switch defaultChecked data-testid="switch-notif-escalation" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Daily morning briefing</span>
                  <Switch defaultChecked data-testid="switch-notif-briefing" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">New lead notifications</span>
                  <Switch defaultChecked data-testid="switch-notif-leads" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["/api/business"],
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground text-sm">No business profile found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your business profile, AI behavior, and integrations.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList data-testid="tabs-settings">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <Building2 className="size-3.5 mr-1.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">
            <Bot className="size-3.5 mr-1.5" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Mail className="size-3.5 mr-1.5" />
            Integrations
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <BusinessProfileTab business={business} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <AISettingsTab business={business} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab business={business} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
