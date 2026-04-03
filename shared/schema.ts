import { z } from "zod";

// ── Types matching the Supabase Postgres tables ─────────────

export interface Business {
  id: number;
  name: string;
  ownerName: string;
  email: string;
  phone: string | null;
  address: string | null;
  businessHours: string | null;
  services: string | null;
  faqEntries: string | null;
  telegramChatId: string | null;
  timezone: string | null;
  aiInstructions: string | null;
  isActive: boolean | null;
}

export interface Conversation {
  id: number;
  businessId: number;
  source: string;
  externalId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subject: string | null;
  status: string;
  category: string | null;
  summary: string | null;
  aiResponse: string | null;
  ownerAction: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: number;
  businessId: number;
  externalId: string | null;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  attendees: string | null;
  status: string | null;
}

export interface ActivityLog {
  id: number;
  businessId: number;
  type: string;
  title: string;
  description: string | null;
  metadata: string | null;
  createdAt: string;
}

// ── Insert schemas (used for request validation) ─────────────

export const insertBusinessSchema = z.object({
  name: z.string(),
  ownerName: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  businessHours: z.string().nullable().optional(),
  services: z.string().nullable().optional(),
  faqEntries: z.string().nullable().optional(),
  telegramChatId: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  aiInstructions: z.string().nullable().optional(),
  isActive: z.boolean().nullable().optional(),
});

export const insertConversationSchema = z.object({
  businessId: z.number(),
  source: z.string(),
  externalId: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  status: z.string().default("new"),
  category: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  aiResponse: z.string().nullable().optional(),
  ownerAction: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertMessageSchema = z.object({
  conversationId: z.number(),
  role: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export const insertCalendarEventSchema = z.object({
  businessId: z.number(),
  externalId: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  startTime: z.string(),
  endTime: z.string(),
  attendees: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const insertActivityLogSchema = z.object({
  businessId: z.number(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(),
  createdAt: z.string(),
});

// ── Insert types ─────────────────────────────────────────────

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
