import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces (match Supabase tables exactly)
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  ownerName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  businessHours?: Record<string, any> | null;
  services?: string[] | null;
  faqEntries?: Array<{ question: string; answer: string }> | null;
  timezone?: string | null;
  aiInstructions?: string | null;
  assistantName: string;
  telegramChatId?: string | null;
  twilioPhoneNumber?: string | null;
  forwardingEmail?: string | null;
  emailNotifications?: boolean | null;
  smsNotifications?: boolean | null;
  autoReplyEnabled?: boolean | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhoneCall {
  id: string;
  businessId: string;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  status: string;
  duration: number;
  recordingUrl?: string | null;
  transcription?: string | null;
  aiSummary?: string | null;
  callerName?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  source: string;
  externalId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  subject?: string | null;
  status: "new" | "in_progress" | "resolved" | "escalated";
  category?: string | null;
  summary?: string | null;
  aiResponse?: string | null;
  ownerAction?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  businessId: string;
  externalId?: string | null;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  attendees?: Array<{ name: string; email: string }> | null;
  status: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  businessId: string;
  type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface Waitlist {
  id: string;
  email: string;
  name?: string | null;
  businessType?: string | null;
  createdAt: string;
}

export interface Stats {
  totalConversations: number;
  newConversations: number;
  autoReplied: number;
  escalated: number;
  upcomingAppointments: number;
  phoneCalls?: number;
}

// ─────────────────────────────────────────────────────────────
// Zod Validators
// ─────────────────────────────────────────────────────────────

export const insertUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertBusinessSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  businessHours: z.record(z.any()).optional(),
  services: z.array(z.string()).optional(),
  faqEntries: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  timezone: z.string().optional(),
  aiInstructions: z.string().optional(),
  assistantName: z.string().default("IronClaw"),
  telegramChatId: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  forwardingEmail: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  autoReplyEnabled: z.boolean().optional(),
});

export const updateBusinessSchema = insertBusinessSchema.partial();

export const insertPhoneCallSchema = z.object({
  callSid: z.string().min(1),
  fromNumber: z.string().min(1),
  toNumber: z.string().min(1),
  status: z.string().default("completed"),
  duration: z.number().default(0),
  recordingUrl: z.string().optional(),
  transcription: z.string().optional(),
  aiSummary: z.string().optional(),
  callerName: z.string().optional(),
});

export const insertConversationSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(["new", "in_progress", "resolved", "escalated"]).default("new"),
  category: z.string().optional(),
  summary: z.string().optional(),
  aiResponse: z.string().optional(),
});

export const updateConversationSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved", "escalated"]).optional(),
  category: z.string().optional(),
  summary: z.string().optional(),
  aiResponse: z.string().optional(),
  ownerAction: z.string().optional(),
});

export const insertMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Message content is required"),
});

export const insertCalendarEventSchema = z.object({
  externalId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  attendees: z.array(z.object({ name: z.string(), email: z.string() })).optional(),
  status: z.string().default("confirmed"),
});

export const updateCalendarEventSchema = insertCalendarEventSchema.partial();

export const insertActivityLogSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const insertWaitlistSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  businessType: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────
// Insert Types
// ─────────────────────────────────────────────────────────────

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type UpdateBusiness = z.infer<typeof updateBusinessSchema>;
export type InsertPhoneCall = z.infer<typeof insertPhoneCallSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type UpdateConversation = z.infer<typeof updateConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type UpdateCalendarEvent = z.infer<typeof updateCalendarEventSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
