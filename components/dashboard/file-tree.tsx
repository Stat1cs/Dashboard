"use client";

import { useState, useCallback } from "react";
import { FolderIcon, FolderOpenIcon, FileTextIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DirEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  mtime?: number;
};

const PATH_MIME = "application/x-dashboard-path";

type FileTreeProps = {
  entries: DirEntry[];
  currentPath: string;
  onSelectFile: (path: string) => void;
  onLoadDir: (path: string) => Promise<DirEntry[]>;
  loadedDirs: Set<string>;
  loadDir: (path: string) => void;
  onMove?: (fromPath: string, toPath: string) => Promise<void>;
};

function basename(p: string): string {
  const i = p.replace(/\\/g, "/").lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

function TreeDir({
  entry,
  currentPath,
  onSelectFile,
  onLoadDir,
  loadedDirs,
  loadDir,
  level,
  onMove,
}: {
  entry: DirEntry;
  currentPath: string;
  onSelectFile: (path: string) => void;
  onLoadDir: (path: string) => Promise<DirEntry[]>;
  loadedDirs: Set<string>;
  loadDir: (path: string) => void;
  level: number;
  onMove?: (fromPath: string, toPath: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(loadedDirs.has(entry.path));
  const [children, setChildren] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropTarget, setDropTarget] = useState(false);

  const toggle = useCallback(() => {
    if (!open && children.length === 0 && !loading) {
      setLoading(true);
      onLoadDir(entry.path).then((e) => {
        setChildren(e);
        setLoading(false);
        setOpen(true);
        loadDir(entry.path);
      });
    } else {
      setOpen((o) => !o);
    }
  }, [entry.path, open, children.length, loading, onLoadDir, loadDir]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(PATH_MIME, entry.path);
      e.dataTransfer.effectAllowed = "move";
    },
    [entry.path]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      const from = e.dataTransfer.getData(PATH_MIME);
      if (!from || from === entry.path || entry.path.startsWith(from + "/") || entry.path.startsWith(from + "\\")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTarget(true);
    },
    [entry.path]
  );

  const handleDragLeave = useCallback(() => setDropTarget(false), []);
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      setDropTarget(false);
      const from = e.dataTransfer.getData(PATH_MIME);
      if (!from || !onMove) return;
      e.preventDefault();
      const name = basename(from);
      const toPath = entry.path ? `${entry.path}/${name}` : name;
      if (toPath === from) return;
      await onMove(from, toPath);
    },
    [entry.path, onMove]
  );

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={toggle}
        draggable={!!onMove}
        onDragStart={onMove ? handleDragStart : undefined}
        onDragOver={onMove ? handleDragOver : undefined}
        onDragLeave={onMove ? handleDragLeave : undefined}
        onDrop={onMove ? handleDrop : undefined}
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm hover:bg-muted",
          dropTarget && "ring-1 ring-primary bg-primary/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        style={{ paddingLeft: 8 + level * 12 }}
      >
        {open ? (
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        {open ? (
          <FolderOpenIcon className="size-4 shrink-0 text-amber-500/90" />
        ) : (
          <FolderIcon className="size-4 shrink-0 text-amber-500/90" />
        )}
        <span className="truncate">{entry.name}</span>
      </button>
      {open && children.length > 0 && (
        <div>
          {children.map((child) =>
            child.isDirectory ? (
              <TreeDir
                key={child.path}
                entry={child}
                currentPath={currentPath}
                onSelectFile={onSelectFile}
                onLoadDir={onLoadDir}
                loadedDirs={loadedDirs}
                loadDir={loadDir}
                level={level + 1}
                onMove={onMove}
              />
            ) : (
              <FileRow
                key={child.path}
                entry={child}
                currentPath={currentPath}
                onSelectFile={onSelectFile}
                level={level + 1}
                onMove={onMove}
              />
            )
          )}
        </div>
      )}
      {open && loading && (
        <div className="py-1 text-xs text-muted-foreground" style={{ paddingLeft: 8 + (level + 1) * 12 }}>
          Loading…
        </div>
      )}
    </div>
  );
}

function FileRow({
  entry,
  currentPath,
  onSelectFile,
  level,
  onMove,
}: {
  entry: DirEntry;
  currentPath: string;
  onSelectFile: (path: string) => void;
  level: number;
  onMove?: (fromPath: string, toPath: string) => Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectFile(entry.path)}
      draggable={!!onMove}
      onDragStart={
        onMove
          ? (e) => {
              e.dataTransfer.setData(PATH_MIME, entry.path);
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      className={cn(
        "flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm hover:bg-muted",
        currentPath === entry.path && "bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      style={{ paddingLeft: 8 + level * 12 }}
    >
      <span className="w-4 shrink-0" />
      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

export function FileTree({
  entries,
  currentPath,
  onSelectFile,
  onLoadDir,
  loadedDirs,
  loadDir,
  onMove,
}: FileTreeProps) {
  const [rootDrop, setRootDrop] = useState(false);
  const handleRootDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!onMove || !e.dataTransfer.types.includes(PATH_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setRootDrop(true);
    },
    [onMove]
  );
  const handleRootDrop = useCallback(
    async (e: React.DragEvent) => {
      setRootDrop(false);
      const from = e.dataTransfer.getData(PATH_MIME);
      if (!from || !onMove) return;
      e.preventDefault();
      const name = basename(from);
      if (from === name) return;
      await onMove(from, name);
    },
    [onMove]
  );

  return (
    <div
      className={cn("flex flex-col gap-0.5 py-1", rootDrop && "ring-1 ring-primary rounded-md bg-primary/5")}
      onDragOver={onMove ? handleRootDragOver : undefined}
      onDragLeave={onMove ? () => setRootDrop(false) : undefined}
      onDrop={onMove ? handleRootDrop : undefined}
    >
      {entries.map((entry) =>
        entry.isDirectory ? (
          <TreeDir
            key={entry.path}
            entry={entry}
            currentPath={currentPath}
            onSelectFile={onSelectFile}
            onLoadDir={onLoadDir}
            loadedDirs={loadedDirs}
            loadDir={loadDir}
            level={0}
            onMove={onMove}
          />
        ) : (
          <FileRow
            key={entry.path}
            entry={entry}
            currentPath={currentPath}
            onSelectFile={onSelectFile}
            level={0}
            onMove={onMove}
          />
        )
      )}
    </div>
  );
}
