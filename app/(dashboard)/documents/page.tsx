"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileTree, type DirEntry } from "@/components/dashboard/file-tree";
import { DocumentEditor } from "@/components/dashboard/document-editor";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";

function DocumentsContent() {
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");

  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loadedDirs, setLoadedDirs] = useState<Set<string>>(new Set([""]));
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [mtime, setMtime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFilePath, setNewFilePath] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadDir = useCallback(async (path: string): Promise<DirEntry[]> => {
    const res = await fetch(
      `/api/workspace?path=${encodeURIComponent(path)}`
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText);
    }
    const data = await res.json();
    return data.entries ?? [];
  }, []);

  const loadRoot = useCallback(() => {
    setLoading(true);
    setError(null);
    loadDir("")
      .then((e) => {
        setEntries(e);
        setLoadedDirs((prev) => new Set(prev).add(""));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [loadDir]);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  const handleLoadDir = useCallback(
    async (path: string) => {
      const res = await loadDir(path);
      return res;
    },
    [loadDir]
  );

  const handleSelectFile = useCallback(async (path: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/workspace?path=${encodeURIComponent(path)}&file=1`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      const data = await res.json();
      setCurrentPath(path);
      setContent(data.content ?? "");
      setMtime(data.mtime ?? 0);
      try {
        const recent = JSON.parse(localStorage.getItem("dashboard-recent-docs") ?? "[]") as string[];
        const next = [path, ...recent.filter((p) => p !== path)].slice(0, 10);
        localStorage.setItem("dashboard-recent-docs", JSON.stringify(next));
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
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
      return { mtime: data.mtime ?? 0 };
    },
    []
  );

  const handleReload = useCallback(
    async (path: string) => {
      try {
        const res = await fetch(
          `/api/workspace?path=${encodeURIComponent(path)}&file=1`
        );
        if (!res.ok) throw new Error("Failed to reload");
        const data = await res.json();
        setContent(data.content ?? "");
        setMtime(data.mtime ?? 0);
      } catch {
        setError("Failed to reload file");
      }
    },
    []
  );

  useEffect(() => {
    if (openParam && !loading) {
      handleSelectFile(openParam);
    }
  }, [openParam, loading, handleSelectFile]);

  const handleDeleteFile = useCallback(
    async (path: string) => {
      try {
        const res = await fetch(
          `/api/workspace?path=${encodeURIComponent(path)}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
        if (currentPath === path || (currentPath && (currentPath.startsWith(path + "/") || currentPath.startsWith(path + "\\")))) {
          setCurrentPath(null);
          setContent("");
          setMtime(0);
        }
        loadRoot();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    },
    [currentPath, loadRoot]
  );

  const handleDeletePath = useCallback(
    (path: string, _isDirectory: boolean) => {
      handleDeleteFile(path);
    },
    [handleDeleteFile]
  );

  const handleMove = useCallback(
    async (fromPath: string, toPath: string) => {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromPath, to: toPath }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      if (currentPath === fromPath) {
        setCurrentPath(toPath);
        try {
          const r = await fetch(
            `/api/workspace?path=${encodeURIComponent(toPath)}&file=1`
          );
          if (r.ok) {
            const d = await r.json();
            setContent(d.content ?? "");
            setMtime(d.mtime ?? 0);
          }
        } catch {
          setContent("");
          setMtime(0);
        }
      }
      loadRoot();
    },
    [currentPath, loadRoot]
  );

  const handleCreateFile = useCallback(async () => {
    const path = newFilePath.trim() || "Dashboard/untitled.md";
    if (!path.endsWith(".md") && !path.endsWith(".txt")) {
      setError("Use .md or .txt extension");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      setShowNewFile(false);
      setNewFilePath("");
      loadRoot();
      await handleSelectFile(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setCreating(false);
    }
  }, [newFilePath, loadRoot, handleSelectFile]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Workspace files — same folder OpenClaw uses
          </p>
        </div>
        <div className="flex gap-2">
          {!showNewFile ? (
            <Button variant="outline" size="sm" onClick={() => setShowNewFile(true)}>
              New file
            </Button>
          ) : (
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="path e.g. Dashboard/note.md"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFile();
                  if (e.key === "Escape") setShowNewFile(false);
                }}
                className="rounded border border-input bg-background px-2 py-1 text-sm w-56"
              />
              <Button size="sm" onClick={handleCreateFile} disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewFile(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          {error}
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <div className="flex w-64 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-end border-b border-border p-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={loadRoot}
              title="Refresh tree"
            >
              <RefreshCwIcon className="size-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <FileTree
              entries={entries}
              currentPath={currentPath ?? ""}
              onSelectFile={handleSelectFile}
              onLoadDir={handleLoadDir}
              loadedDirs={loadedDirs}
              loadDir={(path) =>
                setLoadedDirs((prev) => new Set(prev).add(path))
              }
              onMove={handleMove}
              onDelete={handleDeletePath}
            />
          )}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col bg-card">
          {currentPath ? (
            <DocumentEditor
              path={currentPath}
              content={content}
              mtime={mtime}
              onSave={handleSave}
              onReload={handleReload}
              onDelete={handleDeleteFile}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Select a file from the tree
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8 text-muted-foreground">Loading…</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
