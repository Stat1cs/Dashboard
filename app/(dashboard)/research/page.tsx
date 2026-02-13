"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlaskConicalIcon, FileTextIcon, PlusIcon } from "lucide-react";

const RESEARCH_DIR = "research";

function formatLabel(path: string): string {
  const name = path.replace(/\.md$/i, "").replace(/^research\/?/, "");
  const parts = name.split("_");
  if (parts.length >= 2) {
    const datePart = parts[parts.length - 1];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const topic = parts.slice(0, -1).join(" ").replace(/-/g, " ");
      const [y, m, d] = datePart.split("-");
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      return `${topic} (${dateStr})`;
    }
  }
  return name.replace(/-/g, " ");
}

type Entry = { path: string; name: string; isDirectory: boolean };

export default function ResearchPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTopic, setNewTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace?path=${encodeURIComponent(RESEARCH_DIR)}`);
      if (!res.ok) {
        setEntries([]);
        return;
      }
      const data = await res.json();
      const list = (data.entries ?? [])
        .filter((e: Entry) => !e.isDirectory && e.name.endsWith(".md"))
        .map((e: Entry) => ({ path: e.path, name: e.name, isDirectory: e.isDirectory }))
        .sort((a: Entry, b: Entry) => b.name.localeCompare(a.name));
      setEntries(list);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createResearch = useCallback(async () => {
    const topic = newTopic.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") || "research";
    const date = new Date().toISOString().slice(0, 10);
    const path = `${RESEARCH_DIR}/${topic}_${date}.md`;
    setCreating(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          content: `# ${topic.replace(/-/g, " ")}\n\n_${date}_\n\n`,
        }),
      });
      setNewTopic("");
      await load();
      window.location.href = `/documents?open=${encodeURIComponent(path)}`;
    } finally {
      setCreating(false);
    }
  }, [newTopic, load]);

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Research</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Research agent saves findings to <code className="rounded bg-muted px-1">{RESEARCH_DIR}/&#123;topic&#125;_&#123;date&#125;.md</code>. Open in Documents to edit.
      </p>
      <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConicalIcon className="size-4" />
            Research docs
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="New topic (e.g. market-trends)"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createResearch()}
              className="w-48"
            />
            <Button size="sm" onClick={createResearch} disabled={creating || !newTopic.trim()}>
              <PlusIcon className="size-4 mr-1" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No research docs yet. Create one above or have the Research agent save to <code className="rounded bg-muted px-1">{RESEARCH_DIR}/</code>.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => (
                <li key={e.path}>
                  <Link
                    href={`/documents?open=${encodeURIComponent(e.path)}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{formatLabel(e.path)}</span>
                    <span className="text-xs text-muted-foreground">{e.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
