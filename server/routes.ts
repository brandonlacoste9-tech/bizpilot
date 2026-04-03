import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, seedDatabase } from "./storage.js";
import { insertBusinessSchema, insertConversationSchema, insertMessageSchema, insertCalendarEventSchema } from "../shared/schema.js";

// ── Telegram Bot Config ─────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: string, text: string, parseMode: string = "HTML") {
  try {
    const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    });
    const data = await resp.json();
    if (!data.ok) {
      console.error("Telegram sendMessage error:", data);
    }
    return data;
  } catch (err) {
    console.error("Telegram sendMessage failed:", err);
    return null;
  }
}

async function sendTelegramMessageWithButtons(
  chatId: string,
  text: string,
  buttons: { text: string; callback_data: string }[][]
) {
  try {
    const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    return await resp.json();
  } catch (err) {
    console.error("Telegram sendMessage with buttons failed:", err);
    return null;
  }
}

function formatBriefing(stats: any, activity: any[], events: any[]) {
  let msg = `<b>\u2600\ufe0f Good morning! Here's your daily briefing:</b>\n\n`;
  msg += `<b>Today's Numbers:</b>\n`;
  msg += `  \u2022 Total conversations: ${stats.totalConversations}\n`;
  msg += `  \u2022 Auto-replied: ${stats.autoReplied}\n`;
  msg += `  \u2022 Escalated (needs you): ${stats.escalated}\n`;
  msg += `  \u2022 Upcoming appointments: ${stats.upcomingAppointments}\n\n`;

  if (stats.escalated > 0) {
    msg += `<b>\u26a0\ufe0f Needs Your Attention:</b>\n`;
    const escalated = activity.filter((a: any) => a.type === "escalation");
    escalated.forEach((a: any) => {
      msg += `  \u2022 ${a.title}\n    ${a.description || ""}\n`;
    });
    msg += `\n`;
  }

  if (events.length > 0) {
    msg += `<b>\ud83d\udcc5 Today's Appointments:</b>\n`;
    events.forEach((e: any) => {
      msg += `  \u2022 ${e.title}\n    ${e.startTime} \u2014 ${e.endTime}\n`;
    });
    msg += `\n`;
  }

  msg += `<i>Reply with commands:\n/inbox - View inbox\n/calendar - Today's schedule\n/stats - Quick stats\n/help - All commands</i>`;
  return msg;
}

function formatConversationForTelegram(convo: any, msgs: any[]) {
  let text = `<b>${convo.subject || "No subject"}</b>\n`;
  text += `From: ${convo.contactName || "Unknown"} (${convo.contactEmail || "no email"})\n`;
  text += `Status: ${convo.status} | Category: ${convo.category || "uncategorized"}\n`;
  text += `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n`;
  msgs.slice(-3).forEach((m: any) => {
    const label = m.role === "customer" ? "\ud83d\udc64 Customer" : m.role === "ai" ? "\ud83e\udd16 AI" : "\ud83d\udc64 You";
    text += `${label}:\n${m.content.substring(0, 300)}\n\n`;
  });
  return text;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed on startup (async now)
  await seedDatabase();

  // ── Business ──────────────────────────────────────────
  app.get("/api/business", async (_req, res) => {
    const business = await storage.getBusiness();
    if (!business) {
      return res.status(404).json({ message: "No business profile found" });
    }
    res.json(business);
  });

  app.post("/api/business", async (req, res) => {
    const parsed = insertBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });
    }
    const business = await storage.createBusiness(parsed.data);
    res.status(201).json(business);
  });

  app.patch("/api/business/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const business = await storage.updateBusiness(id, req.body);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  });

  // ── Conversations ─────────────────────────────────────
  app.get("/api/conversations", async (req, res) => {
    const filters: { status?: string; category?: string } = {};
    if (typeof req.query.status === "string") filters.status = req.query.status;
    if (typeof req.query.category === "string") filters.category = req.query.category;
    const convos = await storage.listConversations(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(convos);
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const conversation = await storage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const msgs = await storage.listMessages(id);
    res.json({ ...conversation, messages: msgs });
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const conversation = await storage.updateConversation(id, req.body);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  });

  app.post("/api/conversations/:id/reply", async (req, res) => {
    const id = parseInt(req.params.id);
    const conversation = await storage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const message = await storage.createMessage({
      conversationId: id,
      role: "owner",
      content: req.body.content,
      createdAt: new Date().toISOString(),
    });
    await storage.updateConversation(id, { status: "resolved", ownerAction: "approved" });
    await storage.createActivity({
      businessId: conversation.businessId,
      type: "email_replied",
      title: `Owner replied to ${conversation.contactName}`,
      description: req.body.content.substring(0, 100),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(message);
  });

  // ── Calendar ──────────────────────────────────────────
  app.get("/api/calendar/events", async (req, res) => {
    const startDate = typeof req.query.start === "string" ? req.query.start : undefined;
    const endDate = typeof req.query.end === "string" ? req.query.end : undefined;
    const events = await storage.listCalendarEvents(startDate, endDate);
    res.json(events);
  });

  app.post("/api/calendar/events", async (req, res) => {
    const parsed = insertCalendarEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });
    }
    const event = await storage.createCalendarEvent(parsed.data);
    const biz = await storage.getBusiness();
    if (biz) {
      await storage.createActivity({
        businessId: biz.id,
        type: "appointment_booked",
        title: `New appointment: ${parsed.data.title}`,
        description: `Scheduled for ${parsed.data.startTime}`,
        createdAt: new Date().toISOString(),
      });
    }
    res.status(201).json(event);
  });

  app.get("/api/calendar/availability", async (_req, res) => {
    const events = await storage.listCalendarEvents();
    res.json({ available: true, bookedSlots: events.length });
  });

  // ── Activity Feed ─────────────────────────────────────
  app.get("/api/activity", async (req, res) => {
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit) : 20;
    const activity = await storage.listActivity(limit);
    res.json(activity);
  });

  // ── Dashboard Stats ───────────────────────────────────
  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // ── Telegram Webhook ──────────────────────────────────
  app.post("/api/telegram/webhook", async (req, res) => {
    res.json({ ok: true }); // Respond immediately to Telegram

    const update = req.body;
    const biz = await storage.getBusiness();

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id?.toString();
      if (!chatId) return;

      const data = cb.callback_data;

      if (data?.startsWith("approve_")) {
        const convoId = parseInt(data.replace("approve_", ""));
        await storage.updateConversation(convoId, { status: "auto_replied", ownerAction: "approved" });
        await sendTelegramMessage(chatId, "\u2705 Approved! AI response has been sent.");
        if (biz) {
          await storage.createActivity({
            businessId: biz.id,
            type: "email_replied",
            title: `Owner approved AI response for conversation #${convoId}`,
            description: "Approved via Telegram.",
            createdAt: new Date().toISOString(),
          });
        }
      } else if (data?.startsWith("reject_")) {
        const convoId = parseInt(data.replace("reject_", ""));
        await storage.updateConversation(convoId, { status: "escalated", ownerAction: "rejected" });
        await sendTelegramMessage(chatId, "\u274c Rejected. Conversation moved to escalated — you can reply from the dashboard.");
      } else if (data?.startsWith("view_")) {
        const convoId = parseInt(data.replace("view_", ""));
        const convo = await storage.getConversation(convoId);
        if (convo) {
          const msgs = await storage.listMessages(convoId);
          await sendTelegramMessage(chatId, formatConversationForTelegram(convo, msgs));
        } else {
          await sendTelegramMessage(chatId, "Conversation not found.");
        }
      }

      // Answer callback to remove loading state
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id }),
      });
      return;
    }

    // Handle regular messages
    const message = update.message;
    if (!message?.text) return;

    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const firstName = message.from?.first_name || "there";

    // Save the chat ID to the business profile if not set
    if (biz && !biz.telegramChatId) {
      await storage.updateBusiness(biz.id, { telegramChatId: chatId });
    }

    // Command handling
    if (text === "/start") {
      const welcome = `<b>Welcome to BizPilot, ${firstName}!</b> \ud83d\ude80\n\n`
        + `I'm your AI business assistant. I handle your emails, schedule appointments, and keep you updated while you're on the go.\n\n`
        + `<b>Commands:</b>\n`
        + `/briefing — Daily briefing\n`
        + `/inbox — View latest conversations\n`
        + `/calendar — Today's appointments\n`
        + `/stats — Quick dashboard stats\n`
        + `/help — All commands\n\n`
        + `<i>Your chat ID: <code>${chatId}</code></i>\n`
        + `<i>I'll notify you here when new emails arrive or something needs your attention.</i>`;
      await sendTelegramMessage(chatId, welcome);
      return;
    }

    if (text === "/help") {
      const help = `<b>BizPilot Commands:</b>\n\n`
        + `/briefing — Get your morning briefing\n`
        + `/inbox — See latest conversations\n`
        + `/inbox new — Only new/unread conversations\n`
        + `/inbox escalated — Items needing your attention\n`
        + `/calendar — Today's schedule\n`
        + `/stats — Quick numbers\n`
        + `/reply [id] [message] — Reply to a conversation\n`
        + `/approve [id] — Approve an AI draft\n`
        + `/reject [id] — Reject an AI draft\n\n`
        + `You can also just send me a message and I'll help you figure out the right action.`;
      await sendTelegramMessage(chatId, help);
      return;
    }

    if (text === "/briefing") {
      const stats = await storage.getStats();
      const activity = await storage.listActivity(10);
      const events = await storage.listCalendarEvents();
      const todayEvents = events.filter((e) => {
        const eventDate = new Date(e.startTime).toDateString();
        return eventDate === new Date().toDateString();
      });
      const briefing = formatBriefing(stats, activity, todayEvents);
      await sendTelegramMessage(chatId, briefing);
      return;
    }

    if (text === "/stats") {
      const stats = await storage.getStats();
      const msg = `<b>\ud83d\udcca Dashboard Stats</b>\n\n`
        + `Total conversations: <b>${stats.totalConversations}</b>\n`
        + `Auto-replied: <b>${stats.autoReplied}</b>\n`
        + `Escalated: <b>${stats.escalated}</b>\n`
        + `New (unread): <b>${stats.newConversations}</b>\n`
        + `Upcoming appointments: <b>${stats.upcomingAppointments}</b>`;
      await sendTelegramMessage(chatId, msg);
      return;
    }

    if (text.startsWith("/inbox")) {
      const filter = text.split(" ")[1];
      const filters = filter ? { status: filter } : undefined;
      const convos = await storage.listConversations(filters);
      if (convos.length === 0) {
        await sendTelegramMessage(chatId, "\ud83d\udcec No conversations found" + (filter ? ` with status: ${filter}` : "") + ".");
        return;
      }
      let msg = `<b>\ud83d\udcec Inbox</b>${filter ? ` (${filter})` : ""}\n\n`;
      convos.slice(0, 8).forEach((c, i) => {
        const statusIcon = c.status === "new" ? "\ud83d\udd35" : c.status === "escalated" ? "\ud83d\udd34" : c.status === "auto_replied" ? "\ud83d\udfe2" : "\u2705";
        msg += `${statusIcon} <b>#${c.id}</b> ${c.contactName || "Unknown"}\n`;
        msg += `   ${c.subject || "No subject"}\n`;
        msg += `   ${c.category || ""} | ${c.status}\n\n`;
      });
      msg += `<i>Use /view [id] to see full conversation</i>`;
      await sendTelegramMessage(chatId, msg);
      return;
    }

    if (text.startsWith("/view")) {
      const convoId = parseInt(text.split(" ")[1]);
      if (isNaN(convoId)) {
        await sendTelegramMessage(chatId, "Usage: /view [conversation_id]");
        return;
      }
      const convo = await storage.getConversation(convoId);
      if (!convo) {
        await sendTelegramMessage(chatId, "Conversation not found.");
        return;
      }
      const msgs = await storage.listMessages(convoId);
      const formatted = formatConversationForTelegram(convo, msgs);

      const buttons = [];
      if (convo.status === "new" || convo.status === "escalated") {
        buttons.push([
          { text: "\u2705 Approve", callback_data: `approve_${convoId}` },
          { text: "\u274c Reject", callback_data: `reject_${convoId}` },
        ]);
      }
      if (buttons.length > 0) {
        await sendTelegramMessageWithButtons(chatId, formatted, buttons);
      } else {
        await sendTelegramMessage(chatId, formatted);
      }
      return;
    }

    if (text === "/calendar") {
      const events = await storage.listCalendarEvents();
      if (events.length === 0) {
        await sendTelegramMessage(chatId, "\ud83d\udcc5 No upcoming appointments.");
        return;
      }
      let msg = `<b>\ud83d\udcc5 Upcoming Appointments</b>\n\n`;
      events.slice(0, 5).forEach((e) => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        msg += `<b>${e.title}</b>\n`;
        msg += `  ${start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} `;
        msg += `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}\n`;
        msg += `  Status: ${e.status}\n\n`;
      });
      await sendTelegramMessage(chatId, msg);
      return;
    }

    if (text.startsWith("/reply")) {
      const parts = text.split(" ");
      const convoId = parseInt(parts[1]);
      const replyText = parts.slice(2).join(" ");
      if (isNaN(convoId) || !replyText) {
        await sendTelegramMessage(chatId, "Usage: /reply [id] [your message]");
        return;
      }
      const convo = await storage.getConversation(convoId);
      if (!convo) {
        await sendTelegramMessage(chatId, "Conversation not found.");
        return;
      }
      await storage.createMessage({
        conversationId: convoId,
        role: "owner",
        content: replyText,
        createdAt: new Date().toISOString(),
      });
      await storage.updateConversation(convoId, { status: "resolved", ownerAction: "approved" });
      if (biz) {
        await storage.createActivity({
          businessId: biz.id,
          type: "email_replied",
          title: `Owner replied to ${convo.contactName} via Telegram`,
          description: replyText.substring(0, 100),
          createdAt: new Date().toISOString(),
        });
      }
      await sendTelegramMessage(chatId, `\u2705 Reply sent to conversation #${convoId} (${convo.contactName}).`);
      return;
    }

    if (text.startsWith("/approve")) {
      const convoId = parseInt(text.split(" ")[1]);
      if (isNaN(convoId)) {
        await sendTelegramMessage(chatId, "Usage: /approve [id]");
        return;
      }
      await storage.updateConversation(convoId, { status: "auto_replied", ownerAction: "approved" });
      await sendTelegramMessage(chatId, `\u2705 Conversation #${convoId} approved.`);
      return;
    }

    if (text.startsWith("/reject")) {
      const convoId = parseInt(text.split(" ")[1]);
      if (isNaN(convoId)) {
        await sendTelegramMessage(chatId, "Usage: /reject [id]");
        return;
      }
      await storage.updateConversation(convoId, { status: "escalated", ownerAction: "rejected" });
      await sendTelegramMessage(chatId, `\u274c Conversation #${convoId} rejected and escalated.`);
      return;
    }

    // Default response for unrecognized messages
    await sendTelegramMessage(
      chatId,
      `I received your message: "<i>${text.substring(0, 100)}</i>"\n\n`
        + `I can help with:\n`
        + `/briefing — Morning briefing\n`
        + `/inbox — Check inbox\n`
        + `/calendar — See schedule\n`
        + `/stats — Dashboard stats\n`
        + `/help — All commands`
    );
  });

  // ── Telegram Settings ─────────────────────────────────
  app.get("/api/telegram/status", async (_req, res) => {
    try {
      const info = await fetch(`${TELEGRAM_API}/getWebhookInfo`).then((r) => r.json());
      const me = await fetch(`${TELEGRAM_API}/getMe`).then((r) => r.json());
      res.json({
        botConnected: me.ok,
        botUsername: me.result?.username,
        botName: me.result?.first_name,
        webhookUrl: info.result?.url || null,
        webhookActive: !!(info.result?.url),
        pendingUpdates: info.result?.pending_update_count || 0,
      });
    } catch {
      res.json({ botConnected: false, webhookUrl: null, webhookActive: false });
    }
  });

  app.post("/api/telegram/set-webhook", async (req, res) => {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ message: "webhookUrl is required" });
    }
    try {
      const resp = await fetch(
        `${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`
      );
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Failed to set webhook", error: String(err) });
    }
  });

  app.post("/api/telegram/send-briefing", async (_req, res) => {
    const biz = await storage.getBusiness();
    if (!biz?.telegramChatId) {
      return res.status(400).json({ message: "No Telegram chat ID configured. Send /start to the bot first." });
    }
    const stats = await storage.getStats();
    const activity = await storage.listActivity(10);
    const events = await storage.listCalendarEvents();
    const briefing = formatBriefing(stats, activity, events);
    const result = await sendTelegramMessage(biz.telegramChatId, briefing);
    res.json({ sent: !!result?.ok });
  });

  app.post("/api/telegram/notify", async (req, res) => {
    const biz = await storage.getBusiness();
    if (!biz?.telegramChatId) {
      return res.status(400).json({ message: "No Telegram chat ID configured." });
    }
    const { message, buttons } = req.body;
    let result;
    if (buttons) {
      result = await sendTelegramMessageWithButtons(biz.telegramChatId, message, buttons);
    } else {
      result = await sendTelegramMessage(biz.telegramChatId, message);
    }
    res.json({ sent: !!result?.ok });
  });

  // ── Email Processing (simulated) ──────────────────────
  app.post("/api/email/process", async (req, res) => {
    const biz = await storage.getBusiness();
    if (!biz) {
      return res.status(400).json({ message: "No business configured" });
    }
    const conversation = await storage.createConversation({
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
      await storage.createMessage({
        conversationId: conversation.id,
        role: "customer",
        content: req.body.body,
        createdAt: new Date().toISOString(),
      });
    }
    await storage.createActivity({
      businessId: biz.id,
      type: "email_received",
      title: `New email from ${req.body.from_name || req.body.from_email}`,
      description: `Subject: ${req.body.subject}`,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(conversation);
  });

  app.get("/api/email/inbox", async (_req, res) => {
    const convos = await storage.listConversations();
    const emails = convos.filter((c) => c.source === "email");
    res.json(emails);
  });

  return httpServer;
}
