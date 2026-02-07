"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatInput } from "@/components/dashboard/chat-input";
import { MessageSquareIcon } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Chat</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Talk to your OpenClaw agent. Set OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN, and enable the OpenResponses endpoint in your OpenClaw config. Streaming is on by default.
      </p>
      <Card className="flex flex-1 min-h-0 flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareIcon className="size-4" />
            Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 overflow-auto min-h-0">
          {messages.length === 0 && !streamingContent && (
            <p className="text-sm text-muted-foreground">
              Send a message below to start.
            </p>
          )}
          <div className="space-y-3">
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
          <div className="mt-auto pt-4">
            <ChatInput
              stream
              onMessage={(msg) => setMessages((prev) => [...prev, msg])}
              onStreamingContent={setStreamingContent}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
