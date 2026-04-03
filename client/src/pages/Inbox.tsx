import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Inbox as InboxIcon,
  Send,
  MessageSquare,
  Mail,
  Phone,
  Search,
  ArrowLeft,
  Bot,
  User,
} from "lucide-react";
import type { Conversation, Message } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  resolved: "bg-green-500/15 text-green-400 border-green-500/30",
  escalated: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
  escalated: "Escalated",
};

// ─────────────────────────────────────────────────────────────
// Conversation List Item
// ─────────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  active,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      data-testid={`conversation-item-${conv.id}`}
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer border-b border-border transition-colors",
        active ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-secondary/50"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="font-medium text-sm text-foreground truncate">
          {conv.contactName || conv.contactEmail || "Unknown"}
        </div>
        <span className={cn("text-xs px-2 py-0.5 rounded-full border flex-shrink-0", STATUS_COLORS[conv.status])}>
          {STATUS_LABELS[conv.status]}
        </span>
      </div>
      <div className="text-xs text-muted-foreground truncate mb-1">
        {conv.subject || "No subject"}
      </div>
      <div className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Conversation Detail
// ─────────────────────────────────────────────────────────────

function ConversationDetail({ conversationId }: { conversationId: string }) {
  const { toast } = useToast();
  const [replyContent, setReplyContent] = useState("");

  const { data, isLoading } = useQuery<{ conversation: Conversation; messages: Message[] }>({
    queryKey: ["/api/conversations", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      return res.json();
    },
  });

  const replyMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/conversations/${conversationId}/reply`, {
        role: "assistant",
        content: replyContent,
      }),
    onSuccess: async () => {
      setReplyContent("");
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Reply sent" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/conversations/${conversationId}`, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-3 mt-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  const { conversation, messages } = data!;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-foreground">
            {conversation.contactName || conversation.contactEmail || "Unknown"}
          </h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {conversation.contactEmail && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail size={12} /> {conversation.contactEmail}
              </span>
            )}
            {conversation.contactPhone && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone size={12} /> {conversation.contactPhone}
              </span>
            )}
            <span className="text-xs text-muted-foreground capitalize">
              via {conversation.source}
            </span>
          </div>
          {conversation.subject && (
            <div className="text-sm text-muted-foreground mt-1 font-medium">{conversation.subject}</div>
          )}
        </div>
        <Select
          value={conversation.status}
          onValueChange={(v) => updateStatusMutation.mutate(v)}
        >
          <SelectTrigger
            data-testid="select-conversation-status"
            className="w-36 h-8 text-xs border-border"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AI Summary */}
      {conversation.summary && (
        <div className="mx-5 mt-4 p-3.5 rounded-lg bg-primary/8 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={13} className="text-primary" />
            <span className="text-xs font-semibold text-primary">AI Summary</span>
          </div>
          <p className="text-xs text-muted-foreground">{conversation.summary}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {!messages?.length ? (
          <div className="text-center py-8">
            <MessageSquare size={28} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.id}`}
              className={cn(
                "flex gap-2.5",
                msg.role === "assistant" ? "flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                msg.role === "assistant" ? "bg-primary/20" : "bg-secondary"
              )}>
                {msg.role === "assistant" ? (
                  <Bot size={14} className="text-primary" />
                ) : (
                  <User size={14} className="text-muted-foreground" />
                )}
              </div>
              <div className={cn(
                "max-w-xs lg:max-w-md",
                msg.role === "assistant" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "text-sm px-4 py-2.5 rounded-xl leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                )}>
                  {msg.content}
                </div>
                <div className={cn(
                  "text-xs text-muted-foreground mt-1",
                  msg.role === "assistant" ? "text-right" : ""
                )}>
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply form */}
      <div className="p-5 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            data-testid="input-reply"
            placeholder="Type your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="flex-1 bg-card border-border resize-none min-h-[60px] max-h-[120px]"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey && replyContent.trim()) {
                replyMutation.mutate();
              }
            }}
          />
          <Button
            data-testid="button-send-reply"
            size="sm"
            className="bg-primary text-primary-foreground amber-glow hover:bg-primary/90 self-end"
            onClick={() => replyContent.trim() && replyMutation.mutate()}
            disabled={replyMutation.isPending || !replyContent.trim()}
          >
            <Send size={15} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">⌘ + Enter to send</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inbox Page
// ─────────────────────────────────────────────────────────────

export default function Inbox() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const filtered = conversations?.filter((c) => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.contactName?.toLowerCase().includes(q) ||
      c.contactEmail?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Page header */}
        <div className="px-7 py-5 border-b border-border flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-black text-foreground">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              {conversations?.length ?? 0} conversation{conversations?.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversation list */}
          <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
            {/* Filters */}
            <div className="p-3 space-y-2 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="input-search-conversations"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-secondary border-0"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  data-testid="select-status-filter"
                  className="h-8 text-xs border-border"
                >
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : !filtered?.length ? (
                <div className="py-10 text-center px-4">
                  <InboxIcon size={28} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No conversations</p>
                </div>
              ) : (
                filtered.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={selectedId === conv.id}
                    onClick={() => setSelectedId(conv.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 flex overflow-hidden">
            {selectedId ? (
              <ConversationDetail conversationId={selectedId} />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare size={40} className="text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Select a conversation to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
