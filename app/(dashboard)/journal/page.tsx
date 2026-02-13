"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, FileTextIcon } from "lucide-react";
import { DocumentEditor } from "@/components/dashboard/document-editor";

function formatDateFromPath(path: string): string {
  const match = path.match(/(\d{4})-(\d{2})-(\d{2})\.md$/);
  if (!match) return path;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function todayPath(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `memory/${y}-${m}-${day}.md`;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<{ path: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [mtime, setMtime] = useState(0);
  const [contentLoading, setContentLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace?path=memory");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const list = (data.entries ?? [])
        .filter((e: { isDirectory: boolean; name: string }) => !e.isDirectory && e.name.endsWith(".md"))
        .map((e: { path: string; name: string }) => ({
          path: e.path,
          name: e.name.replace(".md", ""),
        }))
        .sort((a: { name: string }, b: { name: string }) => b.name.localeCompare(a.name))
        .slice(0, 31);
      setEntries(list);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const loadFile = useCallback(async (path: string) => {
    setContentLoading(true);
    try {
      const res = await fetch(`/api/workspace?path=${encodeURIComponent(path)}&file=1`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setContent(data.content ?? "");
      setMtime(data.mtime ?? 0);
      setSelectedPath(path);
    } catch {
      setSelectedPath(null);
    } finally {
      setContentLoading(false);
    }
  }, []);

  const handleSave = useCallback(
    async (path: string, newContent: string): Promise<{ mtime: number }> => {
      const res = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: newContent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      const data = await res.json();
      setContent(newContent);
      setMtime(data.mtime ?? 0);
      return { mtime: data.mtime ?? 0 };
    },
    []
  );

  const handleReload = useCallback(async (path: string) => {
    const res = await fetch(`/api/workspace?path=${encodeURIComponent(path)}&file=1`);
    if (!res.ok) return;
    const data = await res.json();
    setContent(data.content ?? "");
    setMtime(data.mtime ?? 0);
  }, []);

  const today = todayPath();
  const hasToday = entries.some((e) => e.path === today);
  const [creating, setCreating] = useState(false);

  const createToday = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: today,
          content: `# ${new Date().toLocaleDateString(undefined, { dateStyle: "full" })}\n\n`,
        }),
      });
      if (res.ok) {
        await loadEntries();
        await loadFile(today);
      }
    } finally {
      setCreating(false);
    }
  }, [today, loadEntries, loadFile]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 p-6 md:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-2 md:w-72">
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="text-sm text-muted-foreground">
          Daily entries in <code className="rounded bg-muted px-1">memory/YYYY-MM-DD.md</code>. Select to edit below.
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col gap-1 overflow-auto">
            {entries.map(({ path }) => {
              const isToday = path === today;
              return (
                <Card
                  key={path}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedPath === path ? "ring-2 ring-primary" : ""} ${isToday ? "border-primary/30" : ""}`}
                  onClick={() => loadFile(path)}
                >
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                      {formatDateFromPath(path)}
                      {isToday && (
                        <span className="text-xs font-normal text-primary">Today</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
        {!loading && !hasToday && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <p className="mb-2 text-sm text-muted-foreground">Today&apos;s entry doesn&apos;t exist yet.</p>
              <Button size="sm" onClick={createToday} disabled={creating}>
                {creating ? "Creating…" : "Create today's entry"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="min-h-0 flex-1 rounded-lg border border-border bg-card">
        {contentLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : selectedPath ? (
          <DocumentEditor
            path={selectedPath}
            content={content}
            mtime={mtime}
            onSave={handleSave}
            onReload={handleReload}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <FileTextIcon className="size-10" />
            <p>Select a day to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}
