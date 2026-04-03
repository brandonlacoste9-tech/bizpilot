import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Business, InsertBusiness,
  Conversation, InsertConversation,
  Message, InsertMessage,
  CalendarEvent, InsertCalendarEvent,
  ActivityLog, InsertActivityLog,
} from "../shared/schema.js";

// ── Supabase client ──────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// ── Row ↔ Model mappers (snake_case ↔ camelCase) ────────────

function rowToBusiness(r: any): Business {
  return {
    id: r.id,
    name: r.name,
    ownerName: r.owner_name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    businessHours: r.business_hours,
    services: r.services,
    faqEntries: r.faq_entries,
    telegramChatId: r.telegram_chat_id,
    timezone: r.timezone,
    aiInstructions: r.ai_instructions,
    isActive: r.is_active,
  };
}

function businessToRow(d: Partial<InsertBusiness>): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.name !== undefined) row.name = d.name;
  if (d.ownerName !== undefined) row.owner_name = d.ownerName;
  if (d.email !== undefined) row.email = d.email;
  if (d.phone !== undefined) row.phone = d.phone;
  if (d.address !== undefined) row.address = d.address;
  if (d.businessHours !== undefined) row.business_hours = d.businessHours;
  if (d.services !== undefined) row.services = d.services;
  if (d.faqEntries !== undefined) row.faq_entries = d.faqEntries;
  if (d.telegramChatId !== undefined) row.telegram_chat_id = d.telegramChatId;
  if (d.timezone !== undefined) row.timezone = d.timezone;
  if (d.aiInstructions !== undefined) row.ai_instructions = d.aiInstructions;
  if (d.isActive !== undefined) row.is_active = d.isActive;
  return row;
}

function rowToConversation(r: any): Conversation {
  return {
    id: r.id,
    businessId: r.business_id,
    source: r.source,
    externalId: r.external_id,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    subject: r.subject,
    status: r.status,
    category: r.category,
    summary: r.summary,
    aiResponse: r.ai_response,
    ownerAction: r.owner_action,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function conversationToRow(d: Partial<InsertConversation>): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.businessId !== undefined) row.business_id = d.businessId;
  if (d.source !== undefined) row.source = d.source;
  if (d.externalId !== undefined) row.external_id = d.externalId;
  if (d.contactName !== undefined) row.contact_name = d.contactName;
  if (d.contactEmail !== undefined) row.contact_email = d.contactEmail;
  if (d.contactPhone !== undefined) row.contact_phone = d.contactPhone;
  if (d.subject !== undefined) row.subject = d.subject;
  if (d.status !== undefined) row.status = d.status;
  if (d.category !== undefined) row.category = d.category;
  if (d.summary !== undefined) row.summary = d.summary;
  if (d.aiResponse !== undefined) row.ai_response = d.aiResponse;
  if (d.ownerAction !== undefined) row.owner_action = d.ownerAction;
  if (d.createdAt !== undefined) row.created_at = d.createdAt;
  if (d.updatedAt !== undefined) row.updated_at = d.updatedAt;
  return row;
}

function rowToMessage(r: any): Message {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role,
    content: r.content,
    createdAt: r.created_at,
  };
}

function messageToRow(d: InsertMessage): Record<string, any> {
  return {
    conversation_id: d.conversationId,
    role: d.role,
    content: d.content,
    created_at: d.createdAt,
  };
}

function rowToCalendarEvent(r: any): CalendarEvent {
  return {
    id: r.id,
    businessId: r.business_id,
    externalId: r.external_id,
    title: r.title,
    description: r.description,
    startTime: r.start_time,
    endTime: r.end_time,
    attendees: r.attendees,
    status: r.status,
  };
}

function calendarEventToRow(d: Partial<InsertCalendarEvent>): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.businessId !== undefined) row.business_id = d.businessId;
  if (d.externalId !== undefined) row.external_id = d.externalId;
  if (d.title !== undefined) row.title = d.title;
  if (d.description !== undefined) row.description = d.description;
  if (d.startTime !== undefined) row.start_time = d.startTime;
  if (d.endTime !== undefined) row.end_time = d.endTime;
  if (d.attendees !== undefined) row.attendees = d.attendees;
  if (d.status !== undefined) row.status = d.status;
  return row;
}

function rowToActivityLog(r: any): ActivityLog {
  return {
    id: r.id,
    businessId: r.business_id,
    type: r.type,
    title: r.title,
    description: r.description,
    metadata: r.metadata,
    createdAt: r.created_at,
  };
}

function activityLogToRow(d: InsertActivityLog): Record<string, any> {
  return {
    business_id: d.businessId,
    type: d.type,
    title: d.title,
    description: d.description ?? null,
    metadata: d.metadata ?? null,
    created_at: d.createdAt,
  };
}

// ── Async Storage Interface ──────────────────────────────────

export interface IStorage {
  getBusiness(): Promise<Business | undefined>;
  createBusiness(data: InsertBusiness): Promise<Business>;
  updateBusiness(id: number, data: Partial<InsertBusiness>): Promise<Business | undefined>;

  listConversations(filters?: { status?: string; category?: string }): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, data: Partial<InsertConversation>): Promise<Conversation | undefined>;

  listMessages(conversationId: number): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;

  listCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]>;
  createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<void>;

  listActivity(limit?: number): Promise<ActivityLog[]>;
  createActivity(data: InsertActivityLog): Promise<ActivityLog>;

  getStats(): Promise<{
    totalConversations: number;
    newConversations: number;
    autoReplied: number;
    escalated: number;
    upcomingAppointments: number;
  }>;
}

// ── Supabase Storage Implementation ──────────────────────────

export class SupabaseStorage implements IStorage {
  async getBusiness(): Promise<Business | undefined> {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error || !data) return undefined;
    return rowToBusiness(data);
  }

  async createBusiness(d: InsertBusiness): Promise<Business> {
    const { data, error } = await supabase
      .from("businesses")
      .insert(businessToRow(d))
      .select()
      .single();
    if (error) throw new Error(`createBusiness: ${error.message}`);
    return rowToBusiness(data);
  }

  async updateBusiness(id: number, d: Partial<InsertBusiness>): Promise<Business | undefined> {
    const { data, error } = await supabase
      .from("businesses")
      .update(businessToRow(d))
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error || !data) return undefined;
    return rowToBusiness(data);
  }

  async listConversations(filters?: { status?: string; category?: string }): Promise<Conversation[]> {
    let query = supabase.from("conversations").select("*");
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.category) query = query.eq("category", filters.category);
    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(rowToConversation);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return undefined;
    return rowToConversation(data);
  }

  async createConversation(d: InsertConversation): Promise<Conversation> {
    const { data, error } = await supabase
      .from("conversations")
      .insert(conversationToRow(d))
      .select()
      .single();
    if (error) throw new Error(`createConversation: ${error.message}`);
    return rowToConversation(data);
  }

  async updateConversation(id: number, d: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const row = conversationToRow({ ...d, updatedAt: new Date().toISOString() });
    const { data, error } = await supabase
      .from("conversations")
      .update(row)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error || !data) return undefined;
    return rowToConversation(data);
  }

  async listMessages(conversationId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map(rowToMessage);
  }

  async createMessage(d: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from("messages")
      .insert(messageToRow(d))
      .select()
      .single();
    if (error) throw new Error(`createMessage: ${error.message}`);
    return rowToMessage(data);
  }

  async listCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    let query = supabase.from("calendar_events").select("*");
    if (startDate) query = query.gte("start_time", startDate);
    if (endDate) query = query.lte("start_time", endDate);
    query = query.order("start_time", { ascending: true });
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(rowToCalendarEvent);
  }

  async createCalendarEvent(d: InsertCalendarEvent): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(calendarEventToRow(d))
      .select()
      .single();
    if (error) throw new Error(`createCalendarEvent: ${error.message}`);
    return rowToCalendarEvent(data);
  }

  async updateCalendarEvent(id: number, d: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const { data, error } = await supabase
      .from("calendar_events")
      .update(calendarEventToRow(d))
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error || !data) return undefined;
    return rowToCalendarEvent(data);
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await supabase.from("calendar_events").delete().eq("id", id);
  }

  async listActivity(limit: number = 20): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(rowToActivityLog);
  }

  async createActivity(d: InsertActivityLog): Promise<ActivityLog> {
    const { data, error } = await supabase
      .from("activity_log")
      .insert(activityLogToRow(d))
      .select()
      .single();
    if (error) throw new Error(`createActivity: ${error.message}`);
    return rowToActivityLog(data);
  }

  async getStats(): Promise<{
    totalConversations: number;
    newConversations: number;
    autoReplied: number;
    escalated: number;
    upcomingAppointments: number;
  }> {
    const today = new Date().toISOString().split("T")[0];

    const [total, newC, auto, esc, upcoming] = await Promise.all([
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "auto_replied"),
      supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "escalated"),
      supabase.from("calendar_events").select("*", { count: "exact", head: true }).gte("start_time", today),
    ]);

    return {
      totalConversations: total.count ?? 0,
      newConversations: newC.count ?? 0,
      autoReplied: auto.count ?? 0,
      escalated: esc.count ?? 0,
      upcomingAppointments: upcoming.count ?? 0,
    };
  }
}

export const storage: IStorage = new SupabaseStorage();

// ── Seed data function ───────────────────────────────────────

export async function seedDatabase() {
  const existingBusiness = await storage.getBusiness();
  if (existingBusiness) return; // Already seeded

  // Wrap in try/catch — concurrent serverless cold starts may both attempt to seed
  try {
    return await _doSeed();
  } catch (err: any) {
    // If it's a unique constraint violation, another instance already seeded
    if (err?.message?.includes("duplicate") || err?.message?.includes("unique")) {
      console.log("Seed skipped — another instance already seeded.");
      return;
    }
    throw err;
  }
}

async function _doSeed() {
  const now = new Date();

  const biz = await storage.createBusiness({
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

  for (const c of convos) {
    const conv = await storage.createConversation(c);
    if (c.contactName === "Sarah Chen") {
      await storage.createMessage({ conversationId: conv.id, role: "customer", content: "Hi, I recently bought a Tesla Model Y and I'm looking to get a Level 2 EV charger installed at home. My house has a 200A panel. Could you give me a quote?", createdAt: c.createdAt });
      await storage.createMessage({ conversationId: conv.id, role: "ai", content: c.aiResponse!, createdAt: new Date(new Date(c.createdAt).getTime() + 5 * 60 * 1000).toISOString() });
    } else if (c.contactName === "David Park") {
      await storage.createMessage({ conversationId: conv.id, role: "customer", content: "I'm an interior designer working on a restaurant renovation in Liberty Village. We need to retrofit all the lighting — about 2,500 sq ft. Budget is around $15K. Can you start within 2 weeks?", createdAt: c.createdAt });
      await storage.createMessage({ conversationId: conv.id, role: "ai", content: c.aiResponse!, createdAt: new Date(new Date(c.createdAt).getTime() + 3 * 60 * 1000).toISOString() });
    } else if (c.contactName === "Lisa Wong") {
      await storage.createMessage({ conversationId: conv.id, role: "customer", content: "Hi, my kitchen lights started flickering after the storm last night. It's happening in all three fixtures. Should I be worried?", createdAt: c.createdAt });
    } else if (c.contactName === "James Miller") {
      await storage.createMessage({ conversationId: conv.id, role: "customer", content: "Hey, just confirming the Tuesday 9 AM appointment for the panel upgrade. We'll have the basement cleared.", createdAt: c.createdAt });
      await storage.createMessage({ conversationId: conv.id, role: "ai", content: c.aiResponse!, createdAt: new Date(new Date(c.createdAt).getTime() + 2 * 60 * 1000).toISOString() });
    } else if (c.contactName === "Mike Johnson") {
      await storage.createMessage({ conversationId: conv.id, role: "customer", content: "Hi there, I just bought a hot tub and need a dedicated 240V line run to my backyard. House was built in 2005. What would this cost?", createdAt: c.createdAt });
      await storage.createMessage({ conversationId: conv.id, role: "ai", content: c.aiResponse!, createdAt: new Date(new Date(c.createdAt).getTime() + 4 * 60 * 1000).toISOString() });
    }
  }

  // Seed calendar events
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

  await storage.createCalendarEvent({
    businessId: biz.id,
    title: "EV Charger Assessment — Sarah Chen",
    description: "On-site assessment for Level 2 EV charger installation. 200A panel. Tesla Model Y.",
    startTime: `${tomorrowStr}T10:00:00`,
    endTime: `${tomorrowStr}T11:00:00`,
    attendees: JSON.stringify(["sarah.chen@gmail.com"]),
    status: "confirmed",
  });

  await storage.createCalendarEvent({
    businessId: biz.id,
    title: "Panel Upgrade — James Miller",
    description: "200A panel upgrade. Crew: Marcus + Dave. Basement access confirmed.",
    startTime: `${dayAfterStr}T09:00:00`,
    endTime: `${dayAfterStr}T14:00:00`,
    attendees: JSON.stringify(["james.m@gmail.com"]),
    status: "confirmed",
  });

  await storage.createCalendarEvent({
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

  for (const a of activities) {
    await storage.createActivity(a);
  }

  console.log("Database seeded with demo data.");
}
