import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  updates?: string[] | null;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────
// Quick prompts
// ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "What's in my knowledge base right now?",
  "Change the oil change price to $59.99",
  "Add a new FAQ: Do you do house calls?",
  "We're closing early this Saturday at noon",
  "What could I improve in my AI setup?",
];

// ─────────────────────────────────────────────────────────────
// Owner Chat Page
// ─────────────────────────────────────────────────────────────

export default function OwnerChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: authData } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const business = authData?.business;
  const assistantName = business?.assistantName || "IronClaw";

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await apiRequest("POST", "/api/owner-chat", { message: msg });
      return await res.json();
    },
    onSuccess: async (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          updates: data.updates,
          timestamp: new Date(),
        },
      ]);
      // If KB was updated, refresh the auth data
      if (data.updates && data.updates.length > 0) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
    onError: (err: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          updates: null,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg, updates: null, timestamp: new Date() },
    ]);
    setInput("");
    chatMutation.mutate(msg);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-7 py-4 md:py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Bot size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-foreground">Talk to {assistantName}</h1>
              <p className="text-xs text-muted-foreground">
                Private chat — update your knowledge base, ask questions, manage your AI
              </p>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-7">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} className="text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground mb-2">
                  Your private AI assistant
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  Tell {assistantName} anything — update prices, change hours, add FAQs, or ask for suggestions.
                  Changes are applied to your Knowledge Base instantly.
                </p>

                {/* Quick prompts */}
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleQuickPrompt(prompt)}
                      className="px-3 py-1.5 rounded-full text-xs bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={14} className="text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-xl text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm"
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.updates && msg.updates.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle size={12} />
                      <span>Knowledge Base updated: {msg.updates.join(", ")}</span>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={14} className="text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={14} className="text-primary" />
                </div>
                <div className="bg-card border border-border rounded-xl rounded-bl-sm p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4 md:px-7">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Textarea
              data-testid="input-owner-chat"
              placeholder={`Tell ${assistantName} what to update...`}
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              className="bg-card border-border resize-none text-sm flex-1"
              rows={1}
              onKeyDown={(e: any) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              data-testid="button-owner-chat-send"
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-auto px-4"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="max-w-2xl mx-auto text-[10px] text-muted-foreground mt-1.5">
            This is your private channel. Only you can see these messages. Changes to your Knowledge Base happen instantly.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
