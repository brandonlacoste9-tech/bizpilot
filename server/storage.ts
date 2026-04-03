import {
  type Business, type InsertBusiness, businesses,
  type Conversation, type InsertConversation, conversations,
  type Message, type InsertMessage, messages,
  type CalendarEvent, type InsertCalendarEvent, calendarEvents,
  type ActivityLog, type InsertActivityLog, activityLog,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    business_hours TEXT,
    services TEXT,
    faq_entries TEXT,
    telegram_chat_id TEXT,
    timezone TEXT DEFAULT 'America/Toronto',
    ai_instructions TEXT,
    is_active INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    external_id TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    subject TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    category TEXT,
    summary TEXT,
    ai_response TEXT,
    owner_action TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    external_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    attendees TEXT,
    status TEXT DEFAULT 'confirmed'
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  // Business
  getBusiness(): Business | undefined;
  createBusiness(data: InsertBusiness): Business;
  updateBusiness(id: number, data: Partial<InsertBusiness>): Business | undefined;

  // Conversations
  listConversations(filters?: { status?: string; category?: string }): Conversation[];
  getConversation(id: number): Conversation | undefined;
  createConversation(data: InsertConversation): Conversation;
  updateConversation(id: number, data: Partial<InsertConversation>): Conversation | undefined;

  // Messages
  listMessages(conversationId: number): Message[];
  createMessage(data: InsertMessage): Message;

  // Calendar events
  listCalendarEvents(startDate?: string, endDate?: string): CalendarEvent[];
  createCalendarEvent(data: InsertCalendarEvent): CalendarEvent;
  updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): CalendarEvent | undefined;
  deleteCalendarEvent(id: number): void;

  // Activity log
  listActivity(limit?: number): ActivityLog[];
  createActivity(data: InsertActivityLog): ActivityLog;

  // Stats
  getStats(): {
    totalConversations: number;
    newConversations: number;
    autoReplied: number;
    escalated: number;
    upcomingAppointments: number;
  };
}

export class DatabaseStorage implements IStorage {
  getBusiness(): Business | undefined {
    return db.select().from(businesses).limit(1).get();
  }

  createBusiness(data: InsertBusiness): Business {
    return db.insert(businesses).values(data).returning().get();
  }

  updateBusiness(id: number, data: Partial<InsertBusiness>): Business | undefined {
    return db.update(businesses).set(data).where(eq(businesses.id, id)).returning().get();
  }

  listConversations(filters?: { status?: string; category?: string }): Conversation[] {
    let query = db.select().from(conversations);
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(conversations.status, filters.status));
    }
    if (filters?.category) {
      conditions.push(eq(conversations.category, filters.category));
    }
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(conversations.createdAt)).all();
    }
    return query.orderBy(desc(conversations.createdAt)).all();
  }

  getConversation(id: number): Conversation | undefined {
    return db.select().from(conversations).where(eq(conversations.id, id)).get();
  }

  createConversation(data: InsertConversation): Conversation {
    return db.insert(conversations).values(data).returning().get();
  }

  updateConversation(id: number, data: Partial<InsertConversation>): Conversation | undefined {
    return db.update(conversations).set({
      ...data,
      updatedAt: new Date().toISOString(),
    }).where(eq(conversations.id, id)).returning().get();
  }

  listMessages(conversationId: number): Message[] {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .all();
  }

  createMessage(data: InsertMessage): Message {
    return db.insert(messages).values(data).returning().get();
  }

  listCalendarEvents(startDate?: string, endDate?: string): CalendarEvent[] {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(calendarEvents.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(calendarEvents.startTime, endDate));
    }
    if (conditions.length > 0) {
      return db.select().from(calendarEvents).where(and(...conditions)).orderBy(calendarEvents.startTime).all();
    }
    return db.select().from(calendarEvents).orderBy(calendarEvents.startTime).all();
  }

  createCalendarEvent(data: InsertCalendarEvent): CalendarEvent {
    return db.insert(calendarEvents).values(data).returning().get();
  }

  updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): CalendarEvent | undefined {
    return db.update(calendarEvents).set(data).where(eq(calendarEvents.id, id)).returning().get();
  }

  deleteCalendarEvent(id: number): void {
    db.delete(calendarEvents).where(eq(calendarEvents.id, id)).run();
  }

  listActivity(limit: number = 20): ActivityLog[] {
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit).all();
  }

  createActivity(data: InsertActivityLog): ActivityLog {
    return db.insert(activityLog).values(data).returning().get();
  }

  getStats(): {
    totalConversations: number;
    newConversations: number;
    autoReplied: number;
    escalated: number;
    upcomingAppointments: number;
  } {
    const today = new Date().toISOString().split("T")[0];
    const total = db.select({ count: sql<number>`count(*)` }).from(conversations).get();
    const newC = db.select({ count: sql<number>`count(*)` }).from(conversations).where(eq(conversations.status, "new")).get();
    const auto = db.select({ count: sql<number>`count(*)` }).from(conversations).where(eq(conversations.status, "auto_replied")).get();
    const esc = db.select({ count: sql<number>`count(*)` }).from(conversations).where(eq(conversations.status, "escalated")).get();
    const upcoming = db.select({ count: sql<number>`count(*)` }).from(calendarEvents).where(gte(calendarEvents.startTime, today)).get();

    return {
      totalConversations: total?.count ?? 0,
      newConversations: newC?.count ?? 0,
      autoReplied: auto?.count ?? 0,
      escalated: esc?.count ?? 0,
      upcomingAppointments: upcoming?.count ?? 0,
    };
  }
}

export const storage = new DatabaseStorage();

// Seed data function
export function seedDatabase() {
  const existingBusiness = storage.getBusiness();
  if (existingBusiness) return; // Already seeded

  const now = new Date();
  const today = now.toISOString();

  // Create demo business
  const biz = storage.createBusiness({
    name: "Bright Spark Electric",
    ownerName: "Marcus Thompson",
    email: "marcus@brightsparkelectric.com",
    phone: "(416) 555-0192",
    address: "47 King St W, Toronto, ON M5H 1J8",
    businessHours: JSON.stringify({
      mon: "8:00 AM - 5:00 PM",
      tue: "8:00 AM - 5:00 PM",
      wed: "8:00 AM - 5:00 PM",
      thu: "8:00 AM - 5:00 PM",
      fri: "8:00 AM - 4:00 PM",
      sat: "Closed",
      sun: "Closed",
    }),
    services: JSON.stringify([
      "Residential Wiring",
      "Panel Upgrades",
      "EV Charger Installation",
      "Lighting Design",
      "Emergency Repairs",
      "Commercial Electrical",
    ]),
    faqEntries: JSON.stringify([
      { question: "What areas do you serve?", answer: "We serve the Greater Toronto Area including Mississauga, Brampton, and Markham." },
      { question: "Do you offer free estimates?", answer: "Yes, we offer free estimates for all residential projects over $500." },
      { question: "Are you licensed?", answer: "Yes, we are fully licensed (ESA/ECRA #7012345) and insured." },
    ]),
    timezone: "America/Toronto",
    aiInstructions: "Be friendly and professional. Always mention we are licensed and insured. For emergency calls, prioritize scheduling within 24 hours.",
    isActive: true,
  });

  // Seed conversations
  const convos = [
    {
      businessId: biz.id,
      source: "email",
      contactName: "Sarah Chen",
      contactEmail: "sarah.chen@gmail.com",
      subject: "EV Charger Installation Quote",
      status: "auto_replied",
      category: "lead",
      summary: "Homeowner interested in Level 2 EV charger installation for a Tesla Model Y. Has a 200A panel.",
      aiResponse: "Hi Sarah, thanks for reaching out! We'd love to help you with your EV charger installation. With a 200A panel, you should be all set for a Level 2 charger. I'd like to schedule a free on-site assessment — are you available this week?",
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      source: "email",
      contactName: "David Park",
      contactEmail: "dpark@parkdesign.ca",
      subject: "Commercial Lighting Retrofit",
      status: "escalated",
      category: "lead",
      summary: "Interior designer needs commercial lighting retrofit for a restaurant. Budget around $15K. Urgent timeline.",
      aiResponse: "Hi David, this sounds like an exciting project! Commercial lighting retrofits are one of our specialties. Given the scope and your timeline, I think Marcus should speak with you directly. He'll reach out within a few hours.",
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      source: "email",
      contactName: "Lisa Wong",
      contactEmail: "lwong@outlook.com",
      subject: "Flickering Lights in Kitchen",
      status: "new",
      category: "support",
      summary: "Customer reports flickering lights in the kitchen, started after a storm. Possible loose connection or panel issue.",
      createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      source: "telegram",
      contactName: "James Miller",
      contactPhone: "+14165550173",
      subject: "Panel Upgrade Follow-up",
      status: "resolved",
      category: "scheduling",
      summary: "Follow-up on panel upgrade job. Customer confirmed the Tuesday 9 AM appointment.",
      aiResponse: "Great, James! I've confirmed your panel upgrade appointment for Tuesday at 9 AM. Marcus will be there with the crew. See you then!",
      ownerAction: "approved",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      source: "email",
      contactName: "Mike Johnson",
      contactEmail: "mikej@hotmail.com",
      subject: "Hot Tub Wiring",
      status: "auto_replied",
      category: "lead",
      summary: "Needs a dedicated 240V circuit for a new hot tub installation. House built in 2005.",
      aiResponse: "Hi Mike! A dedicated 240V circuit for a hot tub is a common project we handle. We'll need to check your panel capacity first. Would you be available for a quick assessment this week? The estimate visit is free!",
      createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      source: "email",
      contactName: "Promo Bot",
      contactEmail: "noreply@spamcorp.xyz",
      subject: "URGENT: Claim your free business listing!!!",
      status: "resolved",
      category: "spam",
      summary: "Spam email offering free business listing. Auto-filtered.",
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ];

  convos.forEach((c) => {
    const conv = storage.createConversation(c);
    // Add messages for each conversation
    if (c.contactName === "Sarah Chen") {
      storage.createMessage({ conversationId: conv.id, role: "customer", content: "Hi, I recently bought a Tesla Model Y and I'm looking to get a Level 2 EV charger installed at home. My house has a 200A panel. Could you give me a quote?", createdAt: c.createdAt });
      storage.createMessage({ conversationId: conv.id, role: "ai", content: c.aiResponse!, createdAt: new Date(new Date(c.createdAt).getTime() + 5 * 60 * 1000).toISOString() });
    } else if (c.contactName === "David Park") {
      storage.createMessage({ conversationId: conv.id, role: "customer", content: "I'm an interior designer working on a restaurant renovation in Liberty Village. We need to retrofit all the lighting — about 2,500 sq ft. Budget is around $15K. Can you start within 2 weeks?", createdAt: c.createdAt });
      storage.createMessage({ conversationId: conv.id, role: "ai", content: c.aiResponse!, createdAt: new Date(new Date(c.createdAt).getTime() + 3 * 60 * 1000).toISOString() });
    } else if (c.contactName === "Lisa Wong") {
      storage.createMessage({ conversationId: conv.id, role: "customer", content: "Hi, my kitchen lights started flickering after the storm last night. It's happening in all three fixtures. Should I be worried?", createdAt: c.createdAt });
    } else if (c.contactName === "James Miller") {
      storage.createMessage({ conversationId: conv.id, role: "customer", content: "Hey, just confirming the Tuesday 9 AM appointment for the panel upgrade. We'll have the basement cleared.", createdAt: c.createdAt });
      storage.createMessage({ conversationId: conv.id, role: "ai", content: c.aiResponse!, createdAt: new Date(new Date(c.createdAt).getTime() + 2 * 60 * 1000).toISOString() });
    } else if (c.contactName === "Mike Johnson") {
      storage.createMessage({ conversationId: conv.id, role: "customer", content: "Hi there, I just bought a hot tub and need a dedicated 240V line run to my backyard. House was built in 2005. What would this cost?", createdAt: c.createdAt });
      storage.createMessage({ conversationId: conv.id, role: "ai", content: c.aiResponse!, createdAt: new Date(new Date(c.createdAt).getTime() + 4 * 60 * 1000).toISOString() });
    }
  });

  // Seed calendar events — use explicit date strings for consistent display
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];
  const dayAfterDate = new Date(now);
  dayAfterDate.setDate(dayAfterDate.getDate() + 2);
  const dayAfterStr = dayAfterDate.toISOString().split("T")[0];
  const nextWeekDate = new Date(now);
  nextWeekDate.setDate(nextWeekDate.getDate() + 5);
  const nextWeekStr = nextWeekDate.toISOString().split("T")[0];

  storage.createCalendarEvent({
    businessId: biz.id,
    title: "EV Charger Assessment — Sarah Chen",
    description: "On-site assessment for Level 2 EV charger installation. 200A panel. Tesla Model Y.",
    startTime: `${tomorrowStr}T10:00:00`,
    endTime: `${tomorrowStr}T11:00:00`,
    attendees: JSON.stringify(["sarah.chen@gmail.com"]),
    status: "confirmed",
  });

  storage.createCalendarEvent({
    businessId: biz.id,
    title: "Panel Upgrade — James Miller",
    description: "200A panel upgrade. Crew: Marcus + Dave. Basement access confirmed.",
    startTime: `${dayAfterStr}T09:00:00`,
    endTime: `${dayAfterStr}T14:00:00`,
    attendees: JSON.stringify(["james.m@gmail.com"]),
    status: "confirmed",
  });

  storage.createCalendarEvent({
    businessId: biz.id,
    title: "Restaurant Lighting Walkthrough — David Park",
    description: "Initial walkthrough for lighting retrofit. Liberty Village restaurant.",
    startTime: `${nextWeekStr}T14:00:00`,
    endTime: `${nextWeekStr}T15:30:00`,
    attendees: JSON.stringify(["dpark@parkdesign.ca"]),
    status: "confirmed",
  });

  // Seed activity log
  const activities = [
    {
      businessId: biz.id,
      type: "email_received",
      title: "New email from Lisa Wong",
      description: "Subject: Flickering Lights in Kitchen — Possible storm damage.",
      createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      type: "email_replied",
      title: "Auto-replied to Sarah Chen",
      description: "Sent EV charger assessment scheduling email. Awaiting confirmation.",
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      type: "escalation",
      title: "Escalated: David Park — Commercial Project",
      description: "$15K commercial lighting retrofit. Needs owner review due to project size.",
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      type: "email_replied",
      title: "Auto-replied to Mike Johnson",
      description: "Hot tub wiring inquiry. Offered free assessment visit.",
      createdAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      type: "appointment_booked",
      title: "Appointment confirmed: James Miller",
      description: "Panel upgrade scheduled for Sunday 9 AM. Customer confirmed.",
      createdAt: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
    },
    {
      businessId: biz.id,
      type: "briefing",
      title: "Morning Briefing Sent",
      description: "3 new leads, 1 escalation, 2 upcoming appointments today.",
      createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
    },
  ];

  activities.forEach((a) => storage.createActivity(a));

  console.log("Database seeded with demo data.");
}
