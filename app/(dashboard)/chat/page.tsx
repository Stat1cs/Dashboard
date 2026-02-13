"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatInput } from "@/components/dashboard/chat-input";
import { MessageSquareIcon } from "lucide-react";

const CHAT_HISTORY_PATH = "Dashboard/chat-history.json";

type Message = { role: "user" | "assistant"; content: string };

type ChatHistory = { messages: Message[] };

function defaultHistory(): ChatHistory {
  return { messages: [] };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const persist = useCallback(async (next: Message[]) => {
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: CHAT_HISTORY_PATH,
          content: JSON.stringify({ messages: next }, null, 2),
        }),
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/workspace?path=${encodeURIComponent(CHAT_HISTORY_PATH)}&file=1`)
      .then((res) => (res.ok ? res.json() : { content: null }))
      .then((data) => {
        if (cancelled) return;
        try {
          const parsed = data.content
            ? (JSON.parse(data.content) as ChatHistory)
            : null;
          if (parsed && Array.isArray(parsed.messages)) {
            setMessages(parsed.messages);
          } else {
            setMessages(defaultHistory().messages);
          }
        } catch {
          setMessages(defaultHistory().messages);
        }
      })
      .catch(() => {
        if (!cancelled) setMessages(defaultHistory().messages);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingContent]);

  const handleUserMessage = useCallback(
    (text: string) => {
      setMessages((prev) => {
        const next = [...prev, { role: "user" as const, content: text }];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const handleStreamingContent = useCallback((content: string) => {
    setStreamingContent(content);
  }, []);

  const handleAssistantMessage = useCallback(
    (content: string) => {
      setStreamingContent("");
      setMessages((prev) => {
        const next = [...prev, { role: "assistant" as const, content }];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Chat</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Talk to your OpenClaw agent. Set OPENCLAW_GATEWAY_URL and
        OPENCLAW_GATEWAY_TOKEN, and enable the OpenResponses endpoint in your
        OpenClaw config.
      </p>
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareIcon className="size-4" />
            Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 pb-2"
          >
            {loadingHistory ? (
              <p className="py-4 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="space-y-3 py-2">
                {messages.length === 0 && !streamingContent && (
                  <p className="text-sm text-muted-foreground">
                    Send a message below to start. History is saved in{" "}
                    <code className="rounded bg-muted px-1">
                      {CHAT_HISTORY_PATH}
                    </code>
                    .
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "ml-0 mr-8 rounded-lg bg-primary/10 p-3 text-sm"
                        : "mr-0 ml-8 rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap"
                    }
                  >
                    {m.content}
                  </div>
                ))}
                {streamingContent && (
                  <div className="mr-0 ml-8 rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {streamingContent}
                    <span className="animate-pulse">▌</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border bg-muted/20">
            <ChatInput
              stream
              onMessage={handleUserMessage}
              onStreamingContent={handleStreamingContent}
              onAssistantMessage={handleAssistantMessage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
