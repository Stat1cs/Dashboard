"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SaveIcon, RefreshCwIcon, FileTextIcon, EyeIcon, Trash2Icon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type DocumentEditorProps = {
  path: string;
  content: string;
  mtime: number;
  onSave: (path: string, content: string) => Promise<{ mtime: number }>;
  onReload: (path: string) => void;
  onDelete?: (path: string) => void;
};

export function DocumentEditor({
  path,
  content: initialContent,
  mtime: initialMtime,
  onSave,
  onReload,
  onDelete,
}: DocumentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [savedMtime, setSavedMtime] = useState(initialMtime);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [view, setView] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    setContent(initialContent);
    setSavedMtime(initialMtime);
  }, [path, initialContent, initialMtime]);

  const hasChanges = content !== initialContent || savedMtime !== initialMtime;
  const externalChange = initialMtime !== savedMtime && content === initialContent;
  const isMarkdown = /\.(md|markdown)$/i.test(path);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const { mtime } = await onSave(path, content);
      setSavedMtime(mtime);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [path, content, onSave]);

  const handleReload = useCallback(() => {
    onReload(path);
  }, [path, onReload]);

  const handleDelete = useCallback(() => {
    if (!onDelete) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete "${path}"? This cannot be undone.`)) return;
    onDelete(path);
  }, [path, onDelete]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="truncate text-sm font-medium text-muted-foreground">
          {path}
        </span>
        <div className="flex items-center gap-2">
          {isMarkdown && (
            <div className="flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setView("edit")}
                className={cn(
                  "rounded px-2 py-1 text-xs",
                  view === "edit" ? "bg-muted" : "hover:bg-muted/50"
                )}
                title="Edit"
              >
                <FileTextIcon className="size-3.5 inline mr-1" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setView("preview")}
                className={cn(
                  "rounded px-2 py-1 text-xs",
                  view === "preview" ? "bg-muted" : "hover:bg-muted/50"
                )}
                title="Preview"
              >
                <EyeIcon className="size-3.5 inline mr-1" />
                Preview
              </button>
            </div>
          )}
          {externalChange && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              File changed on disk
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleReload}
            title="Reload from disk"
          >
            <RefreshCwIcon className="size-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              title="Delete file"
            >
              <Trash2Icon className="size-4" />
            </Button>
          )}
          <Button
            size="sm"
            disabled={saving || !hasChanges}
            onClick={handleSave}
            className="gap-1"
          >
            <SaveIcon className="size-4" />
            {saving ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {view === "preview" && isMarkdown ? (
          <div className="markdown-preview text-sm [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_p]:my-2 [&_ul]:list-inside [&_ul]:list-disc [&_ol]:list-inside [&_ol]:list-decimal [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_a]:text-primary [&_a]:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-full min-h-[300px] w-full resize-none font-mono text-sm"
            placeholder="Edit content…"
            onKeyDown={(e) => {
              if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
            title="Ctrl+S to save"
          />
        )}
      </div>
    </div>
  );
}
