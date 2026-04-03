import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useRoute } from "wouter";
import { Link, useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  MessageCircle,
  Phone,
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Filter,
  BotMessageSquare,
  User,
  Crown,
} from "lucide-react";
import type { Conversation, Message } from "@shared/schema";

const statusColors: Record<string, string> = {
  new: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  auto_replied: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  escalated: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const categoryColors: Record<string, string> = {
  lead: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  support: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  scheduling: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  spam: "bg-stone-100 text-stone-600 dark:bg-stone-800/40 dark:text-stone-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const sourceIcons: Record<string, typeof Mail> = {
  email: Mail,
  telegram: MessageCircle,
  phone: Phone,
};

function ConversationList({
  conversations,
  isLoading,
  selectedId,
  statusFilter,
  categoryFilter,
  onStatusFilter,
  onCategoryFilter,
}: {
  conversations?: Conversation[];
  isLoading: boolean;
  selectedId?: number;
  statusFilter: string;
  categoryFilter: string;
  onStatusFilter: (v: string) => void;
  onCategoryFilter: (v: string) => void;
}) {
  const statuses = ["all", "new", "auto_replied", "escalated", "resolved"];
  const categories = ["all", "lead", "support", "scheduling", "spam"];

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 space-y-2 border-b">
        <div className="flex items-center gap-1.5">
          <Filter className="size-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <div className="flex flex-wrap gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => onStatusFilter(s)}
                data-testid={`filter-status-${s}`}
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {s === "auto_replied" ? "replied" : s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="size-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Type:</span>
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => onCategoryFilter(c)}
                data-testid={`filter-category-${c}`}
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                  categoryFilter === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5 p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : !conversations?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <Mail className="size-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No conversations match your filters.</p>
          </div>
        ) : (
          <div className="p-1">
            {conversations.map((conv) => {
              const SourceIcon = sourceIcons[conv.source] || Mail;
              const isSelected = selectedId === conv.id;
              return (
                <Link key={conv.id} href={`/inbox/${conv.id}`}>
                  <div
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      isSelected ? "bg-accent" : "hover:bg-muted/50"
                    }`}
                    data-testid={`conversation-item-${conv.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <SourceIcon className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{conv.contactName || conv.contactEmail || "Unknown"}</span>
                      {conv.status && (
                        <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ml-auto shrink-0 ${statusColors[conv.status] || ""}`}>
                          {conv.status.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground/80 truncate">{conv.subject}</p>
                    {conv.summary && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{conv.summary}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {conv.category && (
                        <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${categoryColors[conv.category] || ""}`}>
                          {conv.category}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

function ConversationDetail({ conversationId }: { conversationId: number }) {
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: conversation, isLoading } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", conversationId],
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/reply`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setReplyText("");
      toast({ title: "Reply sent", description: "Your response has been sent." });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (data: { status: string; ownerAction?: string }) => {
      const res = await apiRequest("PATCH", `/api/conversations/${conversationId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Conversation not found.</p>
      </div>
    );
  }

  const roleIcons: Record<string, typeof Mail> = {
    customer: User,
    ai: BotMessageSquare,
    owner: Crown,
  };

  const roleLabels: Record<string, string> = {
    customer: conversation.contactName || "Customer",
    ai: "BizPilot AI",
    owner: "You",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/inbox">
            <Button variant="ghost" size="icon" className="size-7 md:hidden" data-testid="button-back-to-inbox">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h2 className="text-base font-semibold" data-testid="text-conversation-subject">{conversation.subject}</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{conversation.contactName}</span>
          {conversation.contactEmail && <span>({conversation.contactEmail})</span>}
          <span className="mx-1">·</span>
          <span>{format(new Date(conversation.createdAt), "MMM d, h:mm a")}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          {conversation.status && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[conversation.status]}`}>
              {conversation.status.replace("_", " ")}
            </span>
          )}
          {conversation.category && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[conversation.category] || ""}`}>
              {conversation.category}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl">
          {conversation.messages.map((msg) => {
            const RoleIcon = roleIcons[msg.role] || User;
            const isOwnerOrAI = msg.role === "ai" || msg.role === "owner";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwnerOrAI ? "flex-row-reverse" : ""}`}
                data-testid={`message-${msg.id}`}
              >
                <div className={`size-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "ai" ? "bg-primary/10 text-primary" :
                  msg.role === "owner" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <RoleIcon className="size-3.5" />
                </div>
                <div className={`flex-1 min-w-0 ${isOwnerOrAI ? "text-right" : ""}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${isOwnerOrAI ? "ml-auto" : ""}`}>
                      {roleLabels[msg.role]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </span>
                  </div>
                  <div className={`text-sm p-3 rounded-lg inline-block text-left max-w-full ${
                    msg.role === "ai" ? "bg-primary/5 border border-primary/10" :
                    msg.role === "owner" ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" :
                    "bg-muted"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}

          {/* AI draft response preview */}
          {conversation.aiResponse && conversation.status !== "resolved" && !conversation.messages.some((m) => m.role === "ai") && (
            <div className="border border-dashed border-primary/30 rounded-lg p-3 bg-primary/5">
              <p className="text-xs font-medium text-primary mb-1">AI Draft Response</p>
              <p className="text-sm text-foreground/80">{conversation.aiResponse}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reply & Actions */}
      {conversation.status !== "resolved" && conversation.status !== "spam" && (
        <div className="p-4 border-t space-y-2">
          {conversation.status === "escalated" || conversation.status === "new" ? (
            <>
              <div className="flex gap-2">
                {conversation.aiResponse && (
                  <Button
                    size="sm"
                    onClick={() => statusMutation.mutate({ status: "resolved", ownerAction: "approved" })}
                    disabled={statusMutation.isPending}
                    data-testid="button-approve-response"
                  >
                    <CheckCircle2 className="size-3.5 mr-1" />
                    Approve AI Response
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => statusMutation.mutate({ status: "resolved", ownerAction: "rejected" })}
                  disabled={statusMutation.isPending}
                  data-testid="button-dismiss"
                >
                  <XCircle className="size-3.5 mr-1" />
                  Dismiss
                </Button>
              </div>
              <Separator />
            </>
          ) : null}
          <div className="flex gap-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              data-testid="input-reply"
            />
            <Button
              size="sm"
              onClick={() => replyText.trim() && replyMutation.mutate(replyText.trim())}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="self-end"
              data-testid="button-send-reply"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [matchInboxId, paramsId] = useRoute("/inbox/:id");

  const queryParams: Record<string, string> = {};
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (categoryFilter !== "all") queryParams.category = categoryFilter;

  const queryString = Object.keys(queryParams).length
    ? "?" + new URLSearchParams(queryParams).toString()
    : "";

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations" + queryString],
  });

  const selectedId = matchInboxId && paramsId?.id ? parseInt(paramsId.id) : undefined;

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className={`w-full md:w-80 lg:w-96 border-r flex-shrink-0 ${selectedId ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
        <div className="p-3 border-b">
          <h1 className="text-base font-semibold" data-testid="text-inbox-title">Inbox</h1>
          <p className="text-xs text-muted-foreground">{conversations?.length ?? 0} conversations</p>
        </div>
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          selectedId={selectedId}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          onStatusFilter={setStatusFilter}
          onCategoryFilter={setCategoryFilter}
        />
      </div>

      {/* Detail panel */}
      <div className={`flex-1 min-w-0 ${!selectedId ? "hidden md:flex" : "flex"} flex-col`}>
        {selectedId ? (
          <ConversationDetail conversationId={selectedId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Mail className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to view details.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
