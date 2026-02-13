"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon, Loader2Icon } from "lucide-react";

type ChatInputProps = {
  compact?: boolean;
  stream?: boolean;
  onMessage?: (userMessage: string) => void;
  onStreamingContent?: (content: string) => void;
  onAssistantMessage?: (content: string) => void;
};

export function ChatInput({
  compact = false,
  stream = true,
  onMessage,
  onStreamingContent,
  onAssistantMessage,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text || loading) return;

    onMessage?.(text);
    setValue("");
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, stream: stream ?? true }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onAssistantMessage?.(
          `Error: ${data.error ?? res.statusText}`
        );
        return;
      }

      if (!stream || !res.body) {
        const data = await res.json().catch(() => ({}));
        const content =
          typeof data.output === "string"
            ? data.output
            : data.choices?.[0]?.message?.content ?? JSON.stringify(data);
        onAssistantMessage?.(content);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (raw === "[DONE]" || raw === "") continue;
            try {
              const parsed = JSON.parse(raw);
              const delta =
                parsed.choices?.[0]?.delta?.content ??
                parsed.output ??
                parsed.text ??
                (typeof parsed === "string" ? parsed : "");
              if (typeof delta === "string") {
                full += delta;
                onStreamingContent?.(full);
              }
            } catch {
              full += raw;
              onStreamingContent?.(full);
            }
          }
        }
      }
      if (buffer.startsWith("data: ")) {
        const raw = buffer.slice(6).trim();
        if (raw && raw !== "[DONE]") {
          try {
            const parsed = JSON.parse(raw);
            const delta =
              parsed.choices?.[0]?.delta?.content ??
              parsed.output ??
              parsed.text ??
              (typeof parsed === "string" ? parsed : "");
            if (typeof delta === "string") full += delta;
          } catch {
            full += raw;
          }
          onStreamingContent?.(full);
        }
      }
      onAssistantMessage?.(full);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      onAssistantMessage?.(
        `Error: ${err instanceof Error ? err.message : "Request failed"}`
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? "flex items-end gap-2 p-2"
          : "flex items-end gap-2 border-t border-border bg-muted/20 p-3"
      }
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        placeholder="Message the agent…"
        rows={compact ? 1 : 2}
        className="min-h-9 resize-none"
        disabled={loading}
      />
      <Button type="submit" size="icon" disabled={loading || !value.trim()}>
        {loading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SendIcon className="size-4" />
        )}
      </Button>
    </form>
  );
}
