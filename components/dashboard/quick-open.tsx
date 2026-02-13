"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const PAGES = [
  { href: "/", label: "Morning Brief" },
  { href: "/documents", label: "Documents" },
  { href: "/journal", label: "Journal" },
  { href: "/calendar", label: "Calendar" },
  { href: "/habits", label: "Habits" },
  { href: "/playground", label: "Playground" },
  { href: "/tasks", label: "Tasks" },
  { href: "/goals", label: "Goals" },
  { href: "/trading", label: "Trading" },
  { href: "/research", label: "Research" },
  { href: "/social-media", label: "Social Media" },
  { href: "/creator-ops", label: "Creator Ops" },
  { href: "/business-intelligence", label: "Business Intelligence" },
  { href: "/chat", label: "Chat" },
];

export function QuickOpen() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  const recentDocs = useMemo(() => {
    if (!open) return [];
    try {
      const raw = localStorage.getItem("dashboard-recent-docs");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [open]);

  const items = useMemo(
    () => [
      ...PAGES.filter((p) => !query || p.label.toLowerCase().includes(query.toLowerCase())).map((p) => ({ type: "page" as const, href: p.href, label: p.label })),
      ...recentDocs.filter((d: string) => !query || d.toLowerCase().includes(query.toLowerCase())).map((path: string) => ({ type: "doc" as const, href: `/documents?open=${encodeURIComponent(path)}`, label: path })),
    ],
    [query, recentDocs]
  );

  const effectiveSelected = items.length === 0 ? 0 : Math.min(selected, items.length - 1);
  const selectedItem = items[effectiveSelected];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => (s + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => (s - 1 + items.length) % items.length);
      } else if (e.key === "Enter" && selectedItem) {
        e.preventDefault();
        router.push(selectedItem.href);
        setOpen(false);
        setQuery("");
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [open, items.length, selectedItem, router]
  );

  const setQueryAndResetSelection = useCallback((value: string) => {
    setQuery(value);
    setSelected(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) {
            setQuery("");
            setSelected(0);
          }
          return !o;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Go to page or document…"
          value={query}
          onChange={(e) => setQueryAndResetSelection(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full rounded-t-lg border-0 border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        />
        <div className="max-h-72 overflow-auto py-2">
          {items.length === 0 ? (
            <p className="px-4 py-2 text-sm text-muted-foreground">No matches</p>
          ) : (
            items.map((item, i) => (
              <button
                key={`${item.type}-${item.href}`}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2 text-left text-sm",
                  i === effectiveSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                )}
                onClick={() => {
                  router.push(item.href);
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">{item.type === "doc" ? "📄" : "↗"}</span>
                {item.label}
              </button>
            ))
          )}
        </div>
        <p className="border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
          ↑↓ select · Enter open · Esc close
        </p>
      </div>
    </div>
  );
}
