import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";
import twilio from "twilio";
import { storage } from "./storage.js";
import {
  insertUserSchema,
  loginSchema,
  insertBusinessSchema,
  updateBusinessSchema,
  insertConversationSchema,
  updateConversationSchema,
  insertMessageSchema,
  insertCalendarEventSchema,
  updateCalendarEventSchema,
  insertWaitlistSchema,
} from "../shared/schema.js";
import type { Business, Subscription } from "../shared/schema.js";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const JWT_SECRET =
  process.env.JWT_SECRET || "ironclaw_jwt_secret_2026_production";

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  "8742735228:AAEgtHawWmQKFzt66lknioB2XI6DzNad4UI";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

// Stripe price → plan mapping
const PRICE_TO_PLAN: Record<string, "starter" | "pro" | "enterprise"> = {
  price_1TIA3YCzqBvMqSYF67NepaPf: "starter",
  price_1TIA3YCzqBvMqSYFsQHfqwM0: "pro",
  price_1TIA3YCzqBvMqSYFaRQrcLMW: "enterprise",
};

// Multer for multipart/form-data (SendGrid inbound)
const upload = multer({ storage: multer.memoryStorage() });

// Twilio TwiML
const VoiceResponse = twilio.twiml.VoiceResponse;

// ─────────────────────────────────────────────────────────────
// Auth middleware
// ─────────────────────────────────────────────────────────────

interface AuthRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.ironclaw_token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

// ─────────────────────────────────────────────────────────────
// AI Processing Pipeline
// ─────────────────────────────────────────────────────────────

async function processWithAI(
  business: Business,
  _conversation: any,
  userMessage: string
): Promise<{ reply: string; category: string; shouldEscalate: boolean }> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return {
      reply: `Thank you for reaching out to ${business.name}! We've received your message and will get back to you shortly.`,
      category: "inquiry",
      shouldEscalate: false,
    };
  }

  const services = business.services?.join(", ") || "various services";
  const faq = business.faqEntries
    ?.map((f: { question: string; answer: string }) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n") || "";
  const hours = business.businessHours
    ? JSON.stringify(business.businessHours)
    : "Regular business hours";
  const assistantName = business.assistantName || "IronClaw";

  const systemPrompt = `You are ${assistantName}, the AI assistant for ${business.name}.

Business Information:
- Services: ${services}
- Business Hours: ${hours}
${faq ? `\nFrequently Asked Questions:\n${faq}` : ""}
${business.aiInstructions ? `\nSpecial Instructions:\n${business.aiInstructions}` : ""}

Your job is to assist customers professionally. Always be helpful, concise, and friendly.
After your reply, on a new line output JSON: {"category":"inquiry|booking|complaint|spam|other","shouldEscalate":true|false}
Escalate if: complaint, unclear intent, or if the instructions say so.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
      }),
    });

    const data: any = await response.json();
    const content: string = data.choices?.[0]?.message?.content || "";

    // Parse out JSON metadata from the end of the response
    const jsonMatch = content.match(/\{[^}]*"category"[^}]*\}/);
    let category = "inquiry";
    let shouldEscalate = false;
    let reply = content;

    if (jsonMatch) {
      try {
        const meta = JSON.parse(jsonMatch[0]);
        category = meta.category || "inquiry";
        shouldEscalate = !!meta.shouldEscalate;
        reply = content.replace(jsonMatch[0], "").trim();
      } catch {
        // ignore parse errors, use raw content
      }
    }

    return { reply, category, shouldEscalate };
  } catch (err) {
    console.error("OpenAI error:", err);
    return {
      reply: `Thank you for contacting ${business.name}. We'll be in touch shortly.`,
      category: "inquiry",
      shouldEscalate: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Email Outbound (SendGrid)
// ─────────────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  fromName: string,
  fromEmail: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  if (!SENDGRID_API_KEY) {
    console.log(`[sendEmail] SENDGRID_API_KEY not set. Would send to ${to}: ${subject}`);
    return;
  }

  try {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [
          {
            type: "text/html",
            value: `${htmlBody}<br><br><small style="color:#999">Powered by IronClaw</small>`,
          },
        ],
      }),
    });
  } catch (err) {
    console.error("SendGrid error:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Plan enforcement
// ─────────────────────────────────────────────────────────────

async function checkPlanLimits(
  businessId: string,
  plan: string
): Promise<{ allowed: boolean; reason: string }> {
  const planStr = plan || "free";

  if (planStr === "enterprise") {
    return { allowed: true, reason: "" };
  }

  if (planStr === "pro") {
    return { allowed: true, reason: "" };
  }

  // Starter: 100 emails/month, no phone
  // Free: 10 emails/month, no phone
  const limit = planStr === "starter" ? 100 : 10;
  const count = await storage.getConversationCountThisMonth(businessId);

  if (count >= limit) {
    return {
      allowed: false,
      reason: `Monthly conversation limit reached (${limit} on ${planStr} plan). Please upgrade.`,
    };
  }

  return { allowed: true, reason: "" };
}

// ─────────────────────────────────────────────────────────────
// Route registration
// ─────────────────────────────────────────────────────────────

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  // ── Auth ─────────────────────────────────────────────────

  // POST /api/auth/signup
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { email, password, fullName } = parsed.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser(email, passwordHash, fullName);

      // Create free subscription
      await storage.createSubscription(user.id, "free");

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("ironclaw_token", token, COOKIE_OPTIONS);

      return res.status(201).json({
        user: { id: user.id, email: user.email, fullName: user.fullName },
      });
    } catch (err: any) {
      console.error("Signup error:", err);
      return res.status(500).json({ message: err.message || "Signup failed" });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("ironclaw_token", token, COOKIE_OPTIONS);

      return res.json({
        user: { id: user.id, email: user.email, fullName: user.fullName },
      });
    } catch (err: any) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie("ironclaw_token", { path: "/" });
    return res.json({ message: "Logged out" });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const subscription = await storage.getSubscriptionByUserId(user.id);
      const business = await storage.getBusinessByUserId(user.id);

      return res.json({
        user: { id: user.id, email: user.email, fullName: user.fullName },
        subscription,
        business,
        hasCompletedOnboarding: !!business,
      });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ── Business ─────────────────────────────────────────────

  // GET /api/business
  app.get("/api/business", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });
      return res.json(business);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  // PATCH /api/business
  app.patch("/api/business", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const parsed = updateBusinessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const updated = await storage.updateBusiness(business.id, parsed.data);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update business" });
    }
  });

  // POST /api/onboarding
  app.post("/api/onboarding", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const existing = await storage.getBusinessByUserId(req.userId!);
      if (existing) {
        return res.status(409).json({ message: "Business already created" });
      }

      const parsed = insertBusinessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const business = await storage.createBusiness(req.userId!, parsed.data);

      await storage.createActivityLog(business.id, {
        type: "system",
        title: "Business profile created",
        description: `Welcome to IronClaw! Your assistant ${business.assistantName} is ready.`,
      });

      return res.status(201).json(business);
    } catch (err: any) {
      console.error("Onboarding error:", err);
      return res.status(500).json({ message: err.message || "Onboarding failed" });
    }
  });

  // ── Conversations ─────────────────────────────────────────

  // GET /api/conversations
  app.get("/api/conversations", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const status = String(req.query.status || "") || undefined;
      const category = String(req.query.category || "") || undefined;
      const conversations = await storage.listConversations(business.id, { status, category });
      return res.json(conversations);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // GET /api/conversations/:id
  app.get("/api/conversations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const conversation = await storage.getConversation(String(req.params.id), business.id);
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });

      const messages = await storage.listMessagesByConversation(conversation.id);
      return res.json({ conversation, messages });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // POST /api/conversations
  app.post("/api/conversations", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const parsed = insertConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const conversation = await storage.createConversation(business.id, parsed.data);
      return res.status(201).json(conversation);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // PATCH /api/conversations/:id
  app.patch("/api/conversations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const parsed = updateConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const updated = await storage.updateConversation(String(req.params.id), business.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Conversation not found" });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  // POST /api/conversations/:id/reply
  app.post("/api/conversations/:id/reply", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const conversation = await storage.getConversation(String(req.params.id), business.id);
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });

      const parsed = insertMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const message = await storage.createMessage(
        conversation.id,
        parsed.data.role,
        parsed.data.content
      );

      // Update conversation status
      await storage.updateConversation(String(req.params.id), business.id, {
        status: "in_progress",
        ownerAction: "replied",
      });

      await storage.createActivityLog(business.id, {
        type: "reply",
        title: "Reply sent",
        description: `Replied to conversation: ${conversation.subject || "No subject"}`,
      });

      return res.status(201).json(message);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to send reply" });
    }
  });

  // ── Calendar ──────────────────────────────────────────────

  // GET /api/calendar/events
  app.get("/api/calendar/events", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const from = req.query.from ? String(req.query.from) : undefined;
      const to = req.query.to ? String(req.query.to) : undefined;
      const events = await storage.listCalendarEvents(business.id, from, to);
      return res.json(events);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // POST /api/calendar/events
  app.post("/api/calendar/events", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const parsed = insertCalendarEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const event = await storage.createCalendarEvent(business.id, parsed.data);

      await storage.createActivityLog(business.id, {
        type: "calendar",
        title: "Event added",
        description: `New event: ${event.title}`,
      });

      return res.status(201).json(event);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to create event" });
    }
  });

  // PATCH /api/calendar/events/:id
  app.patch("/api/calendar/events/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });

      const parsed = updateCalendarEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const updated = await storage.updateCalendarEvent(String(req.params.id), business.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Event not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update event" });
    }
  });

  // DELETE /api/calendar/events/:id
  app.delete("/api/calendar/events/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });
      await storage.deleteCalendarEvent(String(req.params.id), business.id);
      return res.json({ message: "Event deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ── Activity ──────────────────────────────────────────────

  // GET /api/activity
  app.get("/api/activity", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) return res.status(404).json({ message: "No business found" });
      const activity = await storage.listActivityLog(business.id);
      return res.json(activity);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // ── Stats ─────────────────────────────────────────────────

  // GET /api/stats
  app.get("/api/stats", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business) {
        return res.json({
          totalConversations: 0,
          newConversations: 0,
          autoReplied: 0,
          escalated: 0,
          upcomingAppointments: 0,
          phoneCalls: 0,
        });
      }
      const stats = await storage.getStats(business.id);
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ── Waitlist ──────────────────────────────────────────────

  // POST /api/waitlist
  app.post("/api/waitlist", async (req: Request, res: Response) => {
    try {
      const parsed = insertWaitlistSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const entry = await storage.addToWaitlist(
        parsed.data.email,
        parsed.data.name,
        parsed.data.businessType
      );
      return res.status(201).json({ message: "Added to waitlist!", entry });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  // ── Stripe Webhook ────────────────────────────────────────

  // POST /api/stripe/webhook
  // NOTE: No requireAuth — this is called by Stripe directly
  // TODO: Add Stripe signature verification using req.rawBody and STRIPE_WEBHOOK_SECRET
  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
  });

  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    try {
      const event = req.body;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const customerEmail =
          session.customer_email ||
          session.customer_details?.email;

        // Stripe payment links pass price_id in metadata (we set this),
        // or we can check subscription items
        let priceId =
          session.metadata?.price_id ||
          session.line_items?.data?.[0]?.price?.id;

        // If no priceId yet but subscription exists, Stripe will send
        // customer.subscription.created which we also handle below.
        // For payment links, we map the subscription to extract the price.
        if (!priceId && session.subscription) {
          // We'll rely on subscription.updated event for price detection
          console.log(`[stripe] checkout completed, no line_items — deferring to subscription event`);
        }

        if (customerEmail && priceId) {
          const plan = PRICE_TO_PLAN[priceId];
          if (plan) {
            const user = await storage.getUserByEmail(customerEmail);
            if (user) {
              await storage.updateSubscriptionByUserId(user.id, {
                plan,
                status: "active",
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
              });
              console.log(`[stripe] ✓ upgraded ${customerEmail} → ${plan}`);
            } else {
              console.log(`[stripe] user not found for ${customerEmail}`);
            }
          }
        } else if (customerEmail && session.subscription) {
          // Still link the Stripe IDs even without price mapping
          const user = await storage.getUserByEmail(customerEmail);
          if (user) {
            await storage.updateSubscriptionByUserId(user.id, {
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
            });
            console.log(`[stripe] linked Stripe IDs for ${customerEmail}`);
          }
        }
      }

      if (
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.created"
      ) {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;
        const status = sub.status === "active" ? "active" : sub.status;

        if (sub.id) {
          const existing = await storage.getSubscriptionByStripeSubscriptionId(sub.id);
          if (existing && plan) {
            await storage.updateSubscription(existing.id, { plan, status });
            console.log(`[stripe] ✓ subscription.updated: ${sub.id} → ${plan} (${status})`);
          } else if (!existing) {
            console.log(`[stripe] subscription ${sub.id} not linked to any user yet`);
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        const existing = await storage.getSubscriptionByStripeSubscriptionId(sub.id);
        if (existing) {
          await storage.updateSubscription(existing.id, {
            plan: "free",
            status: "canceled",
          });
          console.log(`[stripe] ✓ subscription.deleted: ${sub.id} → free`);
        } else {
          console.log(`[stripe] subscription.deleted: ${sub.id} — not found in DB`);
        }
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error("Stripe webhook error:", err);
      return res.status(400).json({ message: "Webhook processing failed" });
    }
  });

  // ── Email Inbound ─────────────────────────────────────────

  // POST /api/email/inbound
  // NOTE: No requireAuth — called by SendGrid Inbound Parse
  app.post(
    "/api/email/inbound",
    upload.any(),
    async (req: Request, res: Response) => {
      try {
        const fields = req.body as Record<string, string>;
        const from = fields.from || "";
        const to = fields.to || "";
        const subject = fields.subject || "(no subject)";
        const text = fields.text || fields.html || "";

        // Extract businessId from "inbox-{uuid}@parse.ironclaw.ca"
        const toMatch = to.match(/inbox-([a-f0-9-]{36})@/i);
        if (!toMatch) {
          console.warn("[email/inbound] Could not extract businessId from:", to);
          return res.status(200).json({ ok: false, reason: "no businessId" });
        }
        const businessId = toMatch[1];

        // Look up business directly by ID
        // We query conversations to find the business — simpler: use supabase directly
        // For now we use a getBusinessByForwardingEmail fallback or direct DB call
        // Let's use a direct approach: find business by ID via supabase
        const { supabase } = await import("./storage.js");
        const { data: bizRow } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .single();

        if (!bizRow) {
          console.warn("[email/inbound] Business not found:", businessId);
          return res.status(200).json({ ok: false, reason: "business not found" });
        }

        // Parse sender name/email from "Name <email@example.com>"
        const fromMatch = from.match(/^(.+?)\s*<(.+?)>/) || ["", "", from];
        const contactName = fromMatch[1]?.trim() || from;
        const contactEmail = fromMatch[2]?.trim() || from;

        // Get subscription for plan enforcement
        const subscription = await storage.getSubscriptionByUserId(bizRow.user_id);
        const planCheck = await checkPlanLimits(bizRow.id, subscription?.plan || "free");

        if (!planCheck.allowed) {
          console.log(`[email/inbound] Plan limit reached for business ${bizRow.id}: ${planCheck.reason}`);
          return res.status(200).json({ ok: false, reason: planCheck.reason });
        }

        // Create conversation
        const conversation = await storage.createConversation(bizRow.id, {
          source: "email",
          contactName,
          contactEmail,
          subject,
          status: "new",
        });

        // Create initial user message
        await storage.createMessage(conversation.id, "user", text);

        // Run AI processing
        const aiResult = await processWithAI(
          {
            id: bizRow.id,
            userId: bizRow.user_id,
            name: bizRow.name,
            ownerName: bizRow.owner_name,
            email: bizRow.email,
            phone: bizRow.phone,
            address: bizRow.address,
            businessHours: bizRow.business_hours,
            services: bizRow.services,
            faqEntries: bizRow.faq_entries,
            timezone: bizRow.timezone,
            aiInstructions: bizRow.ai_instructions,
            assistantName: bizRow.assistant_name || "IronClaw",
            telegramChatId: bizRow.telegram_chat_id,
            twilioPhoneNumber: bizRow.twilio_phone_number,
            forwardingEmail: bizRow.forwarding_email,
            emailNotifications: bizRow.email_notifications,
            smsNotifications: bizRow.sms_notifications,
            autoReplyEnabled: bizRow.auto_reply_enabled,
            isActive: bizRow.is_active,
            createdAt: bizRow.created_at,
            updatedAt: bizRow.updated_at,
          },
          conversation,
          text
        );

        // Update conversation with AI result
        await storage.updateConversation(conversation.id, bizRow.id, {
          category: aiResult.category as any,
          summary: aiResult.reply.substring(0, 200),
          aiResponse: aiResult.reply,
          status: aiResult.shouldEscalate ? "escalated" : "new",
        });

        // Auto-reply if enabled
        const autoReplyEnabled = bizRow.auto_reply_enabled !== false;
        if (autoReplyEnabled && aiResult.reply) {
          await storage.createMessage(conversation.id, "assistant", aiResult.reply);

          const assistantName = bizRow.assistant_name || "IronClaw";
          const fromEmail = `${assistantName.toLowerCase().replace(/\s+/g, "")}@ironclaw.ca`;
          await sendEmail(
            contactEmail,
            assistantName,
            fromEmail,
            `Re: ${subject}`,
            `<p>${aiResult.reply.replace(/\n/g, "<br>")}</p>`
          );

          await storage.updateConversation(conversation.id, bizRow.id, {
            status: "in_progress",
          });
        }

        // Notify via Telegram
        if (bizRow.telegram_chat_id) {
          await sendTelegramMessage(
            bizRow.telegram_chat_id,
            `📧 New email from *${contactName}*: ${subject}`
          );
        }

        // Log activity
        await storage.createActivityLog(bizRow.id, {
          type: "email",
          title: "Email received",
          description: `From ${contactName}: ${subject}`,
        });

        return res.status(200).json({ ok: true });
      } catch (err: any) {
        console.error("Email inbound error:", err);
        return res.status(200).json({ ok: false, error: err.message });
      }
    }
  );

  // ── Twilio Voice ──────────────────────────────────────────

  // POST /api/twilio/voice
  // NOTE: No requireAuth — called by Twilio
  app.post("/api/twilio/voice", async (req: Request, res: Response) => {
    try {
      const calledNumber = req.body.Called || req.body.To || "";
      const fromNumber = req.body.From || "";

      // Look up business by Twilio phone number
      const business = await storage.getBusinessByTwilioNumber(calledNumber);

      const businessName = business?.name || "our business";
      const assistantName = business?.assistantName || "IronClaw";

      const twiml = new VoiceResponse();

      twiml.say(
        { voice: "Polly.Amy" },
        `Thank you for calling ${businessName}. Our AI assistant ${assistantName} is here to help. Please leave your name, phone number, and a brief message after the beep, and we'll get back to you shortly.`
      );

      const record = twiml.record({
        maxLength: 120,
        transcribe: true,
        transcribeCallback: "/api/twilio/transcription",
        recordingStatusCallback: "/api/twilio/recording-status",
      });
      void record;

      twiml.say({ voice: "Polly.Amy" }, "We didn't receive a recording. Goodbye.");

      res.set("Content-Type", "text/xml");
      return res.send(twiml.toString());
    } catch (err: any) {
      console.error("Twilio voice error:", err);
      const twiml = new VoiceResponse();
      twiml.say("Sorry, there was an error. Please try again later.");
      res.set("Content-Type", "text/xml");
      return res.send(twiml.toString());
    }
  });

  // POST /api/twilio/transcription
  // NOTE: No requireAuth — called by Twilio
  app.post("/api/twilio/transcription", async (req: Request, res: Response) => {
    try {
      const callSid = req.body.CallSid || "";
      const fromNumber = req.body.From || req.body.Caller || "";
      const toNumber = req.body.To || req.body.Called || "";
      const transcriptionText = req.body.TranscriptionText || "";

      // Look up business by Twilio number
      const business = await storage.getBusinessByTwilioNumber(toNumber);
      if (!business) {
        console.warn("[twilio/transcription] Business not found for number:", toNumber);
        return res.status(200).send("OK");
      }

      // Create or update phone call record
      let phoneCall = await storage.getPhoneCallByCallSid(callSid);
      if (!phoneCall) {
        phoneCall = await storage.createPhoneCall(business.id, {
          callSid,
          fromNumber,
          toNumber,
          status: "completed",
          duration: 0,
          transcription: transcriptionText,
        });
      } else {
        phoneCall = await storage.updatePhoneCall(phoneCall.id, {
          transcription: transcriptionText,
        }) || phoneCall;
      }

      // Run AI to summarize the call
      let aiSummary = transcriptionText;
      if (transcriptionText) {
        const aiResult = await processWithAI(
          business,
          null,
          `Voicemail transcription: "${transcriptionText}". Caller number: ${fromNumber}. Please summarize this voicemail and identify the caller's intent.`
        );
        aiSummary = aiResult.reply;

        // Update phone call with AI summary
        if (phoneCall) {
          await storage.updatePhoneCall(phoneCall.id, { aiSummary: aiResult.reply });
        }

        // Create conversation for the phone call
        const conversation = await storage.createConversation(business.id, {
          source: "phone",
          contactPhone: fromNumber,
          subject: `Phone call from ${fromNumber}`,
          status: aiResult.shouldEscalate ? "escalated" : "new",
          category: aiResult.category as any,
          summary: aiResult.reply.substring(0, 200),
          aiResponse: aiResult.reply,
        });

        await storage.createMessage(
          conversation.id,
          "user",
          transcriptionText || `[Voicemail from ${fromNumber}]`
        );
      }

      // Notify via Telegram
      if (business.telegramChatId) {
        await sendTelegramMessage(
          business.telegramChatId,
          `📞 Missed call from *${fromNumber}*:\n${aiSummary.substring(0, 200)}`
        );
      }

      // Log activity
      await storage.createActivityLog(business.id, {
        type: "phone",
        title: "Missed call received",
        description: `From ${fromNumber}: ${aiSummary.substring(0, 100)}`,
      });

      return res.status(200).send("OK");
    } catch (err: any) {
      console.error("Twilio transcription error:", err);
      return res.status(200).send("OK");
    }
  });

  // POST /api/twilio/recording-status
  // NOTE: No requireAuth — called by Twilio
  app.post("/api/twilio/recording-status", async (req: Request, res: Response) => {
    try {
      const callSid = req.body.CallSid || "";
      const recordingUrl = req.body.RecordingUrl || "";
      const duration = parseInt(req.body.RecordingDuration || "0", 10);

      const phoneCall = await storage.getPhoneCallByCallSid(callSid);
      if (phoneCall) {
        await storage.updatePhoneCall(phoneCall.id, {
          recordingUrl,
          duration,
          status: "completed",
        });
      }

      return res.status(200).send("OK");
    } catch (err: any) {
      console.error("Twilio recording-status error:", err);
      return res.status(200).send("OK");
    }
  });

  // ── Telegram Webhook ──────────────────────────────────────

  // POST /api/telegram/webhook
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    try {
      const update = req.body;

      if (update.message) {
        const chatId = update.message.chat?.id?.toString();
        const text = (update.message.text || "").trim();

        if (text === "/start") {
          await sendTelegramMessage(
            chatId,
            `🤖 *IronClaw Bot* connected!\n\nYour chat ID is: \`${chatId}\`\n\nUse this ID in your IronClaw settings to link your business.`
          );
        } else if (text === "/help") {
          await sendTelegramMessage(
            chatId,
            `🤖 *IronClaw Commands*\n\n` +
            `/start — Connect your account\n` +
            `/status — View business stats\n` +
            `/inbox — Latest 5 conversations\n` +
            `/reply {id} {message} — Reply to a conversation\n` +
            `/pause — Disable auto-replies\n` +
            `/resume — Enable auto-replies\n` +
            `/help — Show this help`
          );
        } else if (text === "/status") {
          // Find business by telegram chat ID
          const business = await getBusinessByTelegramChatId(chatId);
          if (!business) {
            await sendTelegramMessage(chatId, "❌ No business linked to this chat. Update your Chat ID in settings.");
          } else {
            const stats = await storage.getStats(business.id);
            await sendTelegramMessage(
              chatId,
              `📊 *${business.name} Status*\n\n` +
              `💬 Total conversations: ${stats.totalConversations}\n` +
              `🆕 New (unread): ${stats.newConversations}\n` +
              `🤖 Auto-replied: ${stats.autoReplied}\n` +
              `⚠️ Escalated: ${stats.escalated}\n` +
              `📅 Upcoming appointments: ${stats.upcomingAppointments}\n` +
              `📞 Phone calls: ${stats.phoneCalls ?? 0}`
            );
          }
        } else if (text === "/inbox") {
          const business = await getBusinessByTelegramChatId(chatId);
          if (!business) {
            await sendTelegramMessage(chatId, "❌ No business linked to this chat.");
          } else {
            const conversations = await storage.listConversations(business.id);
            const latest = conversations.slice(0, 5);
            if (!latest.length) {
              await sendTelegramMessage(chatId, "📭 No conversations yet.");
            } else {
              const lines = latest.map((c) => {
                const shortId = c.id.substring(0, 8);
                const contact = c.contactName || c.contactEmail || c.contactPhone || "Unknown";
                const src = c.source === "email" ? "📧" : c.source === "phone" ? "📞" : "💬";
                return `${src} \`${shortId}\` — *${contact}* (${c.status})\n  ${c.subject || "No subject"}`;
              });
              await sendTelegramMessage(
                chatId,
                `📬 *Latest Conversations:*\n\n${lines.join("\n\n")}\n\nUse /reply {id} {message} to respond.`
              );
            }
          }
        } else if (text.startsWith("/reply ")) {
          const business = await getBusinessByTelegramChatId(chatId);
          if (!business) {
            await sendTelegramMessage(chatId, "❌ No business linked to this chat.");
          } else {
            // /reply {shortId} {message}
            const parts = text.slice(7).trim();
            const spaceIdx = parts.indexOf(" ");
            if (spaceIdx === -1) {
              await sendTelegramMessage(chatId, "❌ Usage: /reply {id} {message}");
            } else {
              const shortId = parts.substring(0, spaceIdx);
              const replyMsg = parts.substring(spaceIdx + 1);

              // Find conversation by short ID
              const conversations = await storage.listConversations(business.id);
              const conversation = conversations.find((c) => c.id.startsWith(shortId));

              if (!conversation) {
                await sendTelegramMessage(chatId, `❌ No conversation found with ID starting with \`${shortId}\``);
              } else {
                await storage.createMessage(conversation.id, "assistant", replyMsg);
                await storage.updateConversation(conversation.id, business.id, {
                  status: "in_progress",
                  ownerAction: "replied_via_telegram",
                });

                // Send email reply if conversation is from email
                if (conversation.source === "email" && conversation.contactEmail) {
                  const assistantName = business.assistantName || "IronClaw";
                  const fromEmail = `${assistantName.toLowerCase().replace(/\s+/g, "")}@ironclaw.ca`;
                  await sendEmail(
                    conversation.contactEmail,
                    assistantName,
                    fromEmail,
                    `Re: ${conversation.subject || "Your inquiry"}`,
                    `<p>${replyMsg.replace(/\n/g, "<br>")}</p>`
                  );
                }

                await sendTelegramMessage(chatId, `✅ Reply sent to *${conversation.contactName || conversation.contactEmail || "customer"}*`);
              }
            }
          }
        } else if (text === "/pause") {
          const business = await getBusinessByTelegramChatId(chatId);
          if (!business) {
            await sendTelegramMessage(chatId, "❌ No business linked to this chat.");
          } else {
            await storage.updateBusiness(business.id, { autoReplyEnabled: false });
            await sendTelegramMessage(chatId, "⏸️ Auto-replies *paused*. New messages will be queued for your review.");
          }
        } else if (text === "/resume") {
          const business = await getBusinessByTelegramChatId(chatId);
          if (!business) {
            await sendTelegramMessage(chatId, "❌ No business linked to this chat.");
          } else {
            await storage.updateBusiness(business.id, { autoReplyEnabled: true });
            await sendTelegramMessage(chatId, "▶️ Auto-replies *resumed*. Your AI assistant is back on duty.");
          }
        }
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("Telegram webhook error:", err);
      return res.json({ ok: false });
    }
  });

  // POST /api/telegram/notify — send a message to a business's telegram
  app.post("/api/telegram/notify", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const business = await storage.getBusinessByUserId(req.userId!);
      if (!business?.telegramChatId) {
        return res.status(400).json({ message: "No Telegram chat ID configured" });
      }

      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message is required" });

      await sendTelegramMessage(business.telegramChatId, message);
      return res.json({ message: "Notification sent" });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to send Telegram notification" });
    }
  });

  return httpServer;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

async function getBusinessByTelegramChatId(chatId: string): Promise<Business | null> {
  const { supabase } = await import("./storage.js");
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .single();
  if (error || !data) return null;

  // Return a properly mapped business
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    ownerName: data.owner_name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    businessHours: data.business_hours,
    services: data.services,
    faqEntries: data.faq_entries,
    timezone: data.timezone,
    aiInstructions: data.ai_instructions,
    assistantName: data.assistant_name || "IronClaw",
    telegramChatId: data.telegram_chat_id,
    twilioPhoneNumber: data.twilio_phone_number,
    forwardingEmail: data.forwarding_email,
    emailNotifications: data.email_notifications,
    smsNotifications: data.sms_notifications,
    autoReplyEnabled: data.auto_reply_enabled,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
