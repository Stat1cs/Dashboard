"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileTextIcon,
  BookOpenIcon,
  SunIcon,
  CalendarIcon,
  ActivityIcon,
  LayoutGridIcon,
  ListTodoIcon,
  TargetIcon,
  TrendingUpIcon,
  MessageSquareIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Brief", icon: SunIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/goals", label: "Goals", icon: TargetIcon },
  { href: "/tasks", label: "Tasks", icon: ListTodoIcon },
  { href: "/journal", label: "Journal", icon: BookOpenIcon },
  { href: "/documents", label: "Documents", icon: FileTextIcon },
  { href: "/habits", label: "Habits", icon: ActivityIcon },
  { href: "/trading", label: "Trading", icon: TrendingUpIcon },
  { href: "/playground", label: "Playground", icon: LayoutGridIcon },
  { href: "/chat", label: "Chat", icon: MessageSquareIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <span className="font-semibold tracking-tight">Dashboard</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-auto p-2">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-2 text-xs text-muted-foreground">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">⌘K</kbd> quick open
      </div>
    </aside>
  );
}
