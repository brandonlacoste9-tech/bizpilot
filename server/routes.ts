import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, seedDatabase } from "./storage";
import { insertBusinessSchema, insertConversationSchema, insertMessageSchema, insertCalendarEventSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed on startup
  seedDatabase();

  // ── Business ──────────────────────────────────────────
  app.get("/api/business", (_req, res) => {
    const business = storage.getBusiness();
    if (!business) {
      return res.status(404).json({ message: "No business profile found" });
    }
    res.json(business);
  });

  app.post("/api/business", (req, res) => {
    const parsed = insertBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });
    }
    const business = storage.createBusiness(parsed.data);
    res.status(201).json(business);
  });

  app.patch("/api/business/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const business = storage.updateBusiness(id, req.body);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  });

  // ── Conversations ─────────────────────────────────────
  app.get("/api/conversations", (req, res) => {
    const filters: { status?: string; category?: string } = {};
    if (typeof req.query.status === "string") filters.status = req.query.status;
    if (typeof req.query.category === "string") filters.category = req.query.category;
    const convos = storage.listConversations(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(convos);
  });

  app.get("/api/conversations/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const conversation = storage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const msgs = storage.listMessages(id);
    res.json({ ...conversation, messages: msgs });
  });

  app.patch("/api/conversations/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const conversation = storage.updateConversation(id, req.body);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  });

  app.post("/api/conversations/:id/reply", (req, res) => {
    const id = parseInt(req.params.id);
    const conversation = storage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const message = storage.createMessage({
      conversationId: id,
      role: "owner",
      content: req.body.content,
      createdAt: new Date().toISOString(),
    });
    storage.updateConversation(id, { status: "resolved", ownerAction: "approved" });
    storage.createActivity({
      businessId: conversation.businessId,
      type: "email_replied",
      title: `Owner replied to ${conversation.contactName}`,
      description: req.body.content.substring(0, 100),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(message);
  });

  // ── Calendar ──────────────────────────────────────────
  app.get("/api/calendar/events", (req, res) => {
    const startDate = typeof req.query.start === "string" ? req.query.start : undefined;
    const endDate = typeof req.query.end === "string" ? req.query.end : undefined;
    const events = storage.listCalendarEvents(startDate, endDate);
    res.json(events);
  });

  app.post("/api/calendar/events", (req, res) => {
    const parsed = insertCalendarEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });
    }
    const event = storage.createCalendarEvent(parsed.data);
    // Log activity
    const biz = storage.getBusiness();
    if (biz) {
      storage.createActivity({
        businessId: biz.id,
        type: "appointment_booked",
        title: `New appointment: ${parsed.data.title}`,
        description: `Scheduled for ${parsed.data.startTime}`,
        createdAt: new Date().toISOString(),
      });
    }
    res.status(201).json(event);
  });

  app.get("/api/calendar/availability", (_req, res) => {
    // Simplified availability — return business hours minus booked slots
    const events = storage.listCalendarEvents();
    res.json({ available: true, bookedSlots: events.length });
  });

  // ── Activity Feed ─────────────────────────────────────
  app.get("/api/activity", (req, res) => {
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit) : 20;
    const activity = storage.listActivity(limit);
    res.json(activity);
  });

  // ── Dashboard Stats ───────────────────────────────────
  app.get("/api/stats", (_req, res) => {
    const stats = storage.getStats();
    res.json(stats);
  });

  // ── Telegram Webhook (placeholder) ────────────────────
  app.post("/api/telegram/webhook", (req, res) => {
    // Placeholder for Telegram bot integration
    res.json({ ok: true });
  });

  // ── Email Processing (simulated) ──────────────────────
  app.post("/api/email/process", (req, res) => {
    const biz = storage.getBusiness();
    if (!biz) {
      return res.status(400).json({ message: "No business configured" });
    }
    const conversation = storage.createConversation({
      businessId: biz.id,
      source: "email",
      contactName: req.body.from_name || "Unknown",
      contactEmail: req.body.from_email,
      subject: req.body.subject,
      status: "new",
      category: "lead",
      summary: req.body.body?.substring(0, 200),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (req.body.body) {
      storage.createMessage({
        conversationId: conversation.id,
        role: "customer",
        content: req.body.body,
        createdAt: new Date().toISOString(),
      });
    }
    storage.createActivity({
      businessId: biz.id,
      type: "email_received",
      title: `New email from ${req.body.from_name || req.body.from_email}`,
      description: `Subject: ${req.body.subject}`,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(conversation);
  });

  app.get("/api/email/inbox", (_req, res) => {
    const convos = storage.listConversations();
    const emails = convos.filter((c) => c.source === "email");
    res.json(emails);
  });

  return httpServer;
}
