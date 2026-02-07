"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon, Loader2Icon } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

type ChatInputProps = {
  onMessage?: (msg: Message) => void;
  onStreamingContent?: (content: string) => void;
  compact?: boolean;
  stream?: boolean;
};

function parseSSEChunk(buffer: string): { lines: string[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  return { lines, rest };
}

function extractTextFromSSE(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.delta === "string") return o.delta;
    if (typeof o.text === "string") return o.text;
    const cp = o.content_part as Record<string, unknown> | undefined;
    if (cp && cp.type === "output_text" && typeof cp.text === "string") return cp.text;
  }
  return "";
}

export function ChatInput({
  onMessage,
  onStreamingContent,
  compact,
  stream = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    setReply("");
    onMessage?.({ role: "user", content: text });

    if (stream) {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: text, stream: true }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = (err as { error?: string }).error ?? res.statusText;
          setReply(`Error: ${msg}`);
          onMessage?.({ role: "assistant", content: `Error: ${msg}` });
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          setReply("(No stream)");
          onMessage?.({ role: "assistant", content: "(No stream)" });
          return;
        }
        const dec = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const { lines, rest } = parseSSEChunk(buffer);
          buffer = rest;
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;
              try {
                const data = JSON.parse(payload) as unknown;
                const delta = extractTextFromSSE(data);
                if (delta) {
                  fullContent += delta;
                  setReply(fullContent);
                  onStreamingContent?.(fullContent);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
        setReply("");
        onStreamingContent?.("");
        onMessage?.({ role: "assistant", content: fullContent || "(No response)" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Request failed";
        setReply(`Error: ${msg}`);
        onMessage?.({ role: "assistant", content: `Error: ${msg}` });
        onStreamingContent?.("");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, stream: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReply(`Error: ${data.error ?? res.statusText}`);
        return;
      }
      const out = data.output ?? data.choices?.[0]?.message?.content ?? data.content ?? "";
      const textOut = Array.isArray(out)
        ? out
            .filter((x: { type?: string; text?: string }) => x.type === "message" || x.text)
            .map((x: { text?: string; content?: unknown }) => x.text ?? (typeof x.content === "string" ? x.content : ""))
            .join("")
        : typeof out === "string"
          ? out
          : JSON.stringify(out);
      setReply(textOut || "(No response)");
      onMessage?.({ role: "assistant", content: textOut });
    } catch (e) {
      setReply(`Error: ${e instanceof Error ? e.message : "Request failed"}`);
    } finally {
      setLoading(false);
    }
  }, [input, loading, onMessage, onStreamingContent, stream]);

  if (compact) {
    return (
      <div className="flex flex-col gap-1 border-t border-sidebar-border p-2">
        <div className="flex gap-2">
          <Textarea
            placeholder="Message OpenClaw…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="min-h-9 resize-none border-sidebar-border bg-sidebar"
            rows={1}
          />
          <Button size="icon" onClick={send} disabled={loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          </Button>
        </div>
        {reply && (
          <div className="max-h-24 overflow-auto rounded border border-sidebar-border bg-sidebar/80 px-2 py-1 text-xs text-sidebar-foreground">
            {reply}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        placeholder="Message OpenClaw…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="min-h-[80px] resize-none"
      />
      <Button onClick={send} disabled={loading} className="gap-2">
        {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
        Send
      </Button>
      {reply && !onMessage && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
          {reply}
        </div>
      )}
    </div>
  );
}
