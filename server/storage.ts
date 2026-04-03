import { createClient } from "@supabase/supabase-js";
import type {
  User,
  Subscription,
  Business,
  PhoneCall,
  Conversation,
  Message,
  CalendarEvent,
  ActivityLog,
  Waitlist,
  Stats,
  InsertBusiness,
  UpdateBusiness,
  InsertPhoneCall,
  InsertConversation,
  UpdateConversation,
  InsertCalendarEvent,
  UpdateCalendarEvent,
  InsertActivityLog,
} from "../shared/schema.js";

// ─────────────────────────────────────────────────────────────
// Supabase client
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://wbpuiqozntavxsqaemcz.supabase.co";

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicHVpcW96bnRhdnhzcWFlbWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTQ5NjMsImV4cCI6MjA4OTY3MDk2M30.Gy0kye65epaId0-KUl-xMZM_r_6shSXWeFxHJ4TG6CQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─────────────────────────────────────────────────────────────
// Helpers: snake_case ↔ camelCase row mappers
// ─────────────────────────────────────────────────────────────

function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    status: row.status,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
  };
}

function mapBusiness(row: any): Business {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    businessHours: row.business_hours,
    services: row.services,
    faqEntries: row.faq_entries,
    timezone: row.timezone,
    aiInstructions: row.ai_instructions,
    assistantName: row.assistant_name ?? "IronClaw",
    telegramChatId: row.telegram_chat_id,
    twilioPhoneNumber: row.twilio_phone_number,
    personalPhone: row.personal_phone,
    callRoutingMode: row.call_routing_mode,
    forwardingEmail: row.forwarding_email,
    emailNotifications: row.email_notifications,
    smsNotifications: row.sms_notifications,
    autoReplyEnabled: row.auto_reply_enabled,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPhoneCall(row: any): PhoneCall {
  return {
    id: row.id,
    businessId: row.business_id,
    callSid: row.call_sid,
    fromNumber: row.from_number,
    toNumber: row.to_number,
    status: row.status,
    duration: row.duration ?? 0,
    recordingUrl: row.recording_url,
    transcription: row.transcription,
    aiSummary: row.ai_summary,
    callerName: row.caller_name,
    createdAt: row.created_at,
  };
}

function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    businessId: row.business_id,
    source: row.source,
    externalId: row.external_id,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    subject: row.subject,
    status: row.status,
    category: row.category,
    summary: row.summary,
    aiResponse: row.ai_response,
    ownerAction: row.owner_action,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapCalendarEvent(row: any): CalendarEvent {
  return {
    id: row.id,
    businessId: row.business_id,
    externalId: row.external_id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    attendees: row.attendees,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapActivityLog(row: any): ActivityLog {
  return {
    id: row.id,
    businessId: row.business_id,
    type: row.type,
    title: row.title,
    description: row.description,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────
// Storage interface
// ─────────────────────────────────────────────────────────────

export interface IStorage {
  // Users
  createUser(email: string, passwordHash: string, fullName: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;

  // Subscriptions
  createSubscription(userId: string, plan?: string): Promise<Subscription>;
  getSubscriptionByUserId(userId: string): Promise<Subscription | null>;
  updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | null>;
  updateSubscriptionByUserId(userId: string, updates: Partial<Subscription>): Promise<Subscription | null>;
  getSubscriptionByStripeSubscriptionId(stripeSubId: string): Promise<Subscription | null>;

  // Businesses
  createBusiness(userId: string, data: InsertBusiness): Promise<Business>;
  getBusinessByUserId(userId: string): Promise<Business | null>;
  updateBusiness(id: string, data: UpdateBusiness): Promise<Business | null>;
  getBusinessByTwilioNumber(phoneNumber: string): Promise<Business | null>;
  getBusinessByForwardingEmail(email: string): Promise<Business | null>;

  // Conversations
  listConversations(businessId: string, filters?: { status?: string; category?: string }): Promise<Conversation[]>;
  getConversation(id: string, businessId: string): Promise<Conversation | null>;
  createConversation(businessId: string, data: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, businessId: string, data: UpdateConversation): Promise<Conversation | null>;
  getConversationCountThisMonth(businessId: string): Promise<number>;

  // Messages
  listMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(conversationId: string, role: string, content: string): Promise<Message>;

  // Phone Calls
  createPhoneCall(businessId: string, data: InsertPhoneCall): Promise<PhoneCall>;
  getPhoneCallByCallSid(callSid: string): Promise<PhoneCall | null>;
  updatePhoneCall(id: string, updates: Partial<PhoneCall>): Promise<PhoneCall | null>;
  listPhoneCallsByBusiness(businessId: string, limit?: number): Promise<PhoneCall[]>;
  getPhoneCallStats(businessId: string): Promise<{ total: number }>;

  // Calendar Events
  listCalendarEvents(businessId: string, from?: string, to?: string): Promise<CalendarEvent[]>;
  createCalendarEvent(businessId: string, data: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, businessId: string, data: UpdateCalendarEvent): Promise<CalendarEvent | null>;
  deleteCalendarEvent(id: string, businessId: string): Promise<void>;

  // Activity Log
  listActivityLog(businessId: string, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(businessId: string, data: InsertActivityLog): Promise<ActivityLog>;

  // Waitlist
  addToWaitlist(email: string, name?: string, businessType?: string): Promise<Waitlist>;

  // Stats
  getStats(businessId: string): Promise<Stats>;
}

// ─────────────────────────────────────────────────────────────
// DatabaseStorage implementation
// ─────────────────────────────────────────────────────────────

export class DatabaseStorage implements IStorage {
  // ─── Users ───────────────────────────────────────────────

  async createUser(email: string, passwordHash: string, fullName: string): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .insert({ email, password_hash: passwordHash, full_name: fullName })
      .select()
      .single();
    if (error) throw new Error(`createUser: ${error.message}`);
    return mapUser(data);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (error) return null;
    return mapUser(data);
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return mapUser(data);
  }

  // ─── Subscriptions ────────────────────────────────────────

  async createSubscription(userId: string, plan = "free"): Promise<Subscription> {
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({ user_id: userId, plan, status: "active" })
      .select()
      .single();
    if (error) throw new Error(`createSubscription: ${error.message}`);
    return mapSubscription(data);
  }

  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) return null;
    return mapSubscription(data);
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    const snakeUpdates: any = {};
    if (updates.plan !== undefined) snakeUpdates.plan = updates.plan;
    if (updates.status !== undefined) snakeUpdates.status = updates.status;
    if (updates.stripeCustomerId !== undefined) snakeUpdates.stripe_customer_id = updates.stripeCustomerId;
    if (updates.stripeSubscriptionId !== undefined) snakeUpdates.stripe_subscription_id = updates.stripeSubscriptionId;
    if (updates.currentPeriodStart !== undefined) snakeUpdates.current_period_start = updates.currentPeriodStart;
    if (updates.currentPeriodEnd !== undefined) snakeUpdates.current_period_end = updates.currentPeriodEnd;

    const { data, error } = await supabase
      .from("subscriptions")
      .update(snakeUpdates)
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    return mapSubscription(data);
  }

  async updateSubscriptionByUserId(userId: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    const existing = await this.getSubscriptionByUserId(userId);
    if (!existing) return null;
    return this.updateSubscription(existing.id, updates);
  }

  async getSubscriptionByStripeSubscriptionId(stripeSubId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", stripeSubId)
      .single();
    if (error) return null;
    return mapSubscription(data);
  }

  // ─── Businesses ───────────────────────────────────────────

  async createBusiness(userId: string, data: InsertBusiness): Promise<Business> {
    const { data: row, error } = await supabase
      .from("businesses")
      .insert({
        user_id: userId,
        name: data.name,
        owner_name: data.ownerName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        business_hours: data.businessHours,
        services: data.services,
        faq_entries: data.faqEntries,
        timezone: data.timezone,
        ai_instructions: data.aiInstructions,
        assistant_name: data.assistantName ?? "IronClaw",
        telegram_chat_id: data.telegramChatId,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw new Error(`createBusiness: ${error.message}`);
    return mapBusiness(row);
  }

  async getBusinessByUserId(userId: string): Promise<Business | null> {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) return null;
    return mapBusiness(data);
  }

  async updateBusiness(id: string, data: UpdateBusiness): Promise<Business | null> {
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.ownerName !== undefined) updates.owner_name = data.ownerName;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.address !== undefined) updates.address = data.address;
    if (data.businessHours !== undefined) updates.business_hours = data.businessHours;
    if (data.services !== undefined) updates.services = data.services;
    if (data.faqEntries !== undefined) updates.faq_entries = data.faqEntries;
    if (data.timezone !== undefined) updates.timezone = data.timezone;
    if (data.aiInstructions !== undefined) updates.ai_instructions = data.aiInstructions;
    if (data.assistantName !== undefined) updates.assistant_name = data.assistantName;
    if (data.telegramChatId !== undefined) updates.telegram_chat_id = data.telegramChatId;
    if (data.twilioPhoneNumber !== undefined) updates.twilio_phone_number = data.twilioPhoneNumber;
    if (data.personalPhone !== undefined) updates.personal_phone = data.personalPhone;
    if (data.callRoutingMode !== undefined) updates.call_routing_mode = data.callRoutingMode;
    if (data.forwardingEmail !== undefined) updates.forwarding_email = data.forwardingEmail;
    if (data.emailNotifications !== undefined) updates.email_notifications = data.emailNotifications;
    if (data.smsNotifications !== undefined) updates.sms_notifications = data.smsNotifications;
    if (data.autoReplyEnabled !== undefined) updates.auto_reply_enabled = data.autoReplyEnabled;
    updates.updated_at = new Date().toISOString();

    const { data: row, error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    return mapBusiness(row);
  }

  async getBusinessByTwilioNumber(phoneNumber: string): Promise<Business | null> {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("twilio_phone_number", phoneNumber)
      .single();
    if (error) return null;
    return mapBusiness(data);
  }

  async getBusinessByForwardingEmail(email: string): Promise<Business | null> {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("forwarding_email", email)
      .single();
    if (error) return null;
    return mapBusiness(data);
  }

  // ─── Conversations ────────────────────────────────────────

  async listConversations(
    businessId: string,
    filters?: { status?: string; category?: string }
  ): Promise<Conversation[]> {
    let query = supabase
      .from("conversations")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.category) query = query.eq("category", filters.category);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapConversation);
  }

  async getConversation(id: string, businessId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("business_id", businessId)
      .single();
    if (error) return null;
    return mapConversation(data);
  }

  async createConversation(businessId: string, data: InsertConversation): Promise<Conversation> {
    const { data: row, error } = await supabase
      .from("conversations")
      .insert({
        business_id: businessId,
        source: data.source,
        external_id: data.externalId,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
        subject: data.subject,
        status: data.status ?? "new",
        category: data.category,
        summary: data.summary,
        ai_response: data.aiResponse,
      })
      .select()
      .single();
    if (error) throw new Error(`createConversation: ${error.message}`);
    return mapConversation(row);
  }

  async getConversationCountThisMonth(businessId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("business_id", businessId)
      .gte("created_at", startOfMonth);
    if (error) return 0;
    return (data || []).length;
  }

  async updateConversation(
    id: string,
    businessId: string,
    data: UpdateConversation
  ): Promise<Conversation | null> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) updates.status = data.status;
    if (data.category !== undefined) updates.category = data.category;
    if (data.summary !== undefined) updates.summary = data.summary;
    if (data.aiResponse !== undefined) updates.ai_response = data.aiResponse;
    if (data.ownerAction !== undefined) updates.owner_action = data.ownerAction;

    const { data: row, error } = await supabase
      .from("conversations")
      .update(updates)
      .eq("id", id)
      .eq("business_id", businessId)
      .select()
      .single();
    if (error) return null;
    return mapConversation(row);
  }

  // ─── Messages ─────────────────────────────────────────────

  async listMessagesByConversation(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data || []).map(mapMessage);
  }

  async createMessage(conversationId: string, role: string, content: string): Promise<Message> {
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role, content })
      .select()
      .single();
    if (error) throw new Error(`createMessage: ${error.message}`);
    return mapMessage(data);
  }

  // ─── Calendar Events ──────────────────────────────────────

  async listCalendarEvents(businessId: string, from?: string, to?: string): Promise<CalendarEvent[]> {
    let query = supabase
      .from("calendar_events")
      .select("*")
      .eq("business_id", businessId)
      .order("start_time", { ascending: true });

    if (from) query = query.gte("start_time", from);
    if (to) query = query.lte("start_time", to);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapCalendarEvent);
  }

  async createCalendarEvent(businessId: string, data: InsertCalendarEvent): Promise<CalendarEvent> {
    const { data: row, error } = await supabase
      .from("calendar_events")
      .insert({
        business_id: businessId,
        external_id: data.externalId,
        title: data.title,
        description: data.description,
        start_time: data.startTime,
        end_time: data.endTime,
        attendees: data.attendees,
        status: data.status ?? "confirmed",
      })
      .select()
      .single();
    if (error) throw new Error(`createCalendarEvent: ${error.message}`);
    return mapCalendarEvent(row);
  }

  async updateCalendarEvent(
    id: string,
    businessId: string,
    data: UpdateCalendarEvent
  ): Promise<CalendarEvent | null> {
    const updates: any = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.startTime !== undefined) updates.start_time = data.startTime;
    if (data.endTime !== undefined) updates.end_time = data.endTime;
    if (data.attendees !== undefined) updates.attendees = data.attendees;
    if (data.status !== undefined) updates.status = data.status;

    const { data: row, error } = await supabase
      .from("calendar_events")
      .update(updates)
      .eq("id", id)
      .eq("business_id", businessId)
      .select()
      .single();
    if (error) return null;
    return mapCalendarEvent(row);
  }

  async deleteCalendarEvent(id: string, businessId: string): Promise<void> {
    await supabase
      .from("calendar_events")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);
  }

  // ─── Phone Calls ──────────────────────────────────────────

  async createPhoneCall(businessId: string, data: InsertPhoneCall): Promise<PhoneCall> {
    const { data: row, error } = await supabase
      .from("phone_calls")
      .insert({
        business_id: businessId,
        call_sid: data.callSid,
        from_number: data.fromNumber,
        to_number: data.toNumber,
        status: data.status ?? "completed",
        duration: data.duration ?? 0,
        recording_url: data.recordingUrl,
        transcription: data.transcription,
        ai_summary: data.aiSummary,
        caller_name: data.callerName,
      })
      .select()
      .single();
    if (error) throw new Error(`createPhoneCall: ${error.message}`);
    return mapPhoneCall(row);
  }

  async getPhoneCallByCallSid(callSid: string): Promise<PhoneCall | null> {
    const { data, error } = await supabase
      .from("phone_calls")
      .select("*")
      .eq("call_sid", callSid)
      .single();
    if (error) return null;
    return mapPhoneCall(data);
  }

  async updatePhoneCall(id: string, updates: Partial<PhoneCall>): Promise<PhoneCall | null> {
    const snakeUpdates: any = {};
    if (updates.status !== undefined) snakeUpdates.status = updates.status;
    if (updates.duration !== undefined) snakeUpdates.duration = updates.duration;
    if (updates.recordingUrl !== undefined) snakeUpdates.recording_url = updates.recordingUrl;
    if (updates.transcription !== undefined) snakeUpdates.transcription = updates.transcription;
    if (updates.aiSummary !== undefined) snakeUpdates.ai_summary = updates.aiSummary;
    if (updates.callerName !== undefined) snakeUpdates.caller_name = updates.callerName;

    const { data, error } = await supabase
      .from("phone_calls")
      .update(snakeUpdates)
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    return mapPhoneCall(data);
  }

  async listPhoneCallsByBusiness(businessId: string, limit = 50): Promise<PhoneCall[]> {
    const { data, error } = await supabase
      .from("phone_calls")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []).map(mapPhoneCall);
  }

  async getPhoneCallStats(businessId: string): Promise<{ total: number }> {
    const { data, error } = await supabase
      .from("phone_calls")
      .select("id")
      .eq("business_id", businessId);
    if (error) return { total: 0 };
    return { total: (data || []).length };
  }

  // ─── Activity Log ─────────────────────────────────────────

  async listActivityLog(businessId: string, limit = 50): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []).map(mapActivityLog);
  }

  async createActivityLog(businessId: string, data: InsertActivityLog): Promise<ActivityLog> {
    const { data: row, error } = await supabase
      .from("activity_log")
      .insert({
        business_id: businessId,
        type: data.type,
        title: data.title,
        description: data.description,
        metadata: data.metadata,
      })
      .select()
      .single();
    if (error) throw new Error(`createActivityLog: ${error.message}`);
    return mapActivityLog(row);
  }

  // ─── Waitlist ─────────────────────────────────────────────

  async addToWaitlist(email: string, name?: string, businessType?: string): Promise<Waitlist> {
    const { data, error } = await supabase
      .from("waitlist")
      .upsert({ email, name, business_type: businessType }, { onConflict: "email" })
      .select()
      .single();
    if (error) throw new Error(`addToWaitlist: ${error.message}`);
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      businessType: data.business_type,
      createdAt: data.created_at,
    };
  }

  // ─── Stats ────────────────────────────────────────────────

  async getStats(businessId: string): Promise<Stats> {
    const now = new Date().toISOString();

    const [convResult, upcomingResult, phoneCallResult] = await Promise.all([
      supabase
        .from("conversations")
        .select("status")
        .eq("business_id", businessId),
      supabase
        .from("calendar_events")
        .select("id")
        .eq("business_id", businessId)
        .gte("start_time", now),
      supabase
        .from("phone_calls")
        .select("id")
        .eq("business_id", businessId),
    ]);

    const conversations = convResult.data || [];
    const totalConversations = conversations.length;
    const newConversations = conversations.filter((c) => c.status === "new").length;
    const escalated = conversations.filter((c) => c.status === "escalated").length;

    // Count conversations that have an ai_response
    const aiReplied = await supabase
      .from("conversations")
      .select("id")
      .eq("business_id", businessId)
      .not("ai_response", "is", null);

    const autoReplied = (aiReplied.data || []).length;
    const upcomingAppointments = (upcomingResult.data || []).length;
    const phoneCalls = (phoneCallResult.data || []).length;

    return {
      totalConversations,
      newConversations,
      autoReplied,
      escalated,
      upcomingAppointments,
      phoneCalls,
    };
  }
}

export const storage = new DatabaseStorage();
