import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
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

  // ── Telegram Webhook ──────────────────────────────────────

  // POST /api/telegram/webhook
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    try {
      const update = req.body;

      if (update.message) {
        const chatId = update.message.chat?.id?.toString();
        const text = update.message.text;

        if (text === "/start") {
          await sendTelegramMessage(
            chatId,
            `🤖 *IronClaw Bot* connected!\n\nYour chat ID is: \`${chatId}\`\n\nUse this ID in your IronClaw settings to link your business.`
          );
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
// Telegram helper
// ─────────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
