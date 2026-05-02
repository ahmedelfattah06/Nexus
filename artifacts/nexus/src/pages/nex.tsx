import { useState, useRef, useEffect } from "react";
import {
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useListAnthropicMessages,
  getListAnthropicConversationsQueryKey,
  getListAnthropicMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Plus, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function NexPage() {
  const [selectedConvoId, setSelectedConvoId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const convos = useListAnthropicConversations();
  const createConvo = useCreateAnthropicConversation();
  const convoMessages = useListAnthropicMessages(selectedConvoId!, {
    query: {
      enabled: !!selectedConvoId,
      queryKey: getListAnthropicMessagesQueryKey(selectedConvoId!),
    },
  });

  useEffect(() => {
    if (convoMessages.data) {
      setMessages(convoMessages.data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    }
  }, [convoMessages.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNewConversation() {
    try {
      const convo = await createConvo.mutateAsync({ data: { title: "New conversation" } });
      qc.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
      setSelectedConvoId(convo.id);
      setMessages([]);
    } catch {
      toast({ title: "Failed to create conversation", variant: "destructive" });
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming || !selectedConvoId) return;
    const userContent = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userContent }]);
    setStreaming(true);

    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const response = await fetch(`${BASE_URL}/api/anthropic/conversations/${selectedConvoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userContent }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to send message");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.content) {
              assistantContent += json.content;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent, streaming: true } : m
                )
              );
            }
            if (json.done || json.error) {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, streaming: false } : m
                )
              );
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => prev.filter((m) => !m.streaming));
      toast({ title: "Failed to get response from Nex", variant: "destructive" });
    } finally {
      setStreaming(false);
      qc.invalidateQueries({ queryKey: getListAnthropicMessagesQueryKey(selectedConvoId!) });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full">
      <aside className="w-56 border-r border-border flex flex-col bg-muted/20">
        <div className="px-3 py-3 border-b border-border">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8"
            onClick={handleNewConversation}
            disabled={createConvo.isPending}
            data-testid="new-conversation-button"
          >
            <Plus className="w-3 h-3 mr-1.5" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {convos.isLoading ? (
            <div className="px-3 py-2 space-y-1">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
            </div>
          ) : convos.data?.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No conversations yet</p>
          ) : (
            convos.data?.map((convo) => (
              <div
                key={convo.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors",
                  selectedConvoId === convo.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                onClick={() => setSelectedConvoId(convo.id)}
                data-testid={`conversation-${convo.id}`}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{convo.title}</span>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {!selectedConvoId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-serif text-3xl mb-2">Meet Nex</h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Your AI productivity assistant. Ask anything — organize notes, plan projects, get coding help, or just brainstorm.
            </p>
            <Button onClick={handleNewConversation} disabled={createConvo.isPending} data-testid="start-conversation-button">
              <Plus className="w-4 h-4 mr-2" /> Start a conversation
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {convoMessages.isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <Sparkles className="w-8 h-8 text-primary mb-3 opacity-60" />
                  <p className="text-sm text-muted-foreground">Ask Nex anything to get started</p>
                  <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm">
                    {[
                      "Help me outline a project plan",
                      "Explain a complex concept",
                      "Review my code logic",
                      "Summarize my notes",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                    data-testid={`message-${i}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      )}
                    >
                      {msg.content}
                      {msg.streaming && (
                        <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse align-middle" />
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-6 py-4 border-t border-border">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Nex anything... (Enter to send, Shift+Enter for newline)"
                  className="resize-none min-h-[48px] max-h-32 text-sm"
                  rows={1}
                  disabled={streaming}
                  data-testid="nex-input"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                  size="icon"
                  className="h-12 w-12 flex-shrink-0 rounded-xl"
                  data-testid="send-message-button"
                >
                  {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
