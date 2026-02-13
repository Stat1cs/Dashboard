"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TASKS_PATH,
  TASK_SECTIONS,
  parseTasksMd,
  serializeTasksMd,
  buildTaskLine,
  taskTitle,
  parseTaskMeta,
  isTaskDone,
} from "@/lib/tasks";
import { GOAL_COLOR_PALETTE, goalEventClass } from "@/lib/goals";

const CALENDAR_PATH = "Dashboard/calendar.json";
const GOALS_PATH = "Dashboard/goals.json";

const EVENT_COLORS = [
  { name: "blue", class: "bg-blue-500/20 border-blue-500/50 text-blue-200" },
  { name: "green", class: "bg-emerald-500/20 border-emerald-500/50 text-emerald-200" },
  { name: "amber", class: "bg-amber-500/20 border-amber-500/50 text-amber-200" },
  { name: "red", class: "bg-red-500/20 border-red-500/50 text-red-200" },
  { name: "purple", class: "bg-purple-500/20 border-purple-500/50 text-purple-200" },
  { name: "gray", class: "bg-muted border-border text-muted-foreground" },
] as const;

type CalEvent = { id: string; title: string; date: string; type?: string; color?: string; goalId?: string };

type CalendarData = { events: CalEvent[] };

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: Date[] = [];
  for (let i = 0; i < startPad; i++) days.push(new Date(0));
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function dateKey(d: Date): string {
  if (!d.getTime()) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(d: Date): boolean {
  if (!d.getTime()) return false;
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type GoalInfo = { name: string; color?: string };
function parseGoalsForCalendar(content: string): Record<string, GoalInfo> {
  const map: Record<string, GoalInfo> = {};
  try {
    const d = JSON.parse(content) as { goals?: { id: string; name?: string; color?: string }[] };
    if (!Array.isArray(d.goals)) return map;
    d.goals.forEach((g, i) => {
      map[g.id] = {
        name: g.name ?? "Goal",
        color: g.color ?? GOAL_COLOR_PALETTE[i % GOAL_COLOR_PALETTE.length],
      };
    });
  } catch {
    // ignore
  }
  return map;
}

export default function CalendarPage() {
  const [date, setDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [goalsMap, setGoalsMap] = useState<Record<string, GoalInfo>>({});
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newEventColor, setNewEventColor] = useState<string>(EVENT_COLORS[0].name);

  function formatDateLabel(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    const t = new Date();
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, t)) return "Today";
    const tom = new Date(t);
    tom.setDate(tom.getDate() + 1);
    if (sameDay(d, tom)) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function setQuickDate(relative: "today" | "tomorrow" | "nextMonday" | "nextFriday") {
    const d = new Date();
    if (relative === "tomorrow") d.setDate(d.getDate() + 1);
    if (relative === "nextMonday") {
      const day = d.getDay();
      const add = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
      d.setDate(d.getDate() + add);
    }
    if (relative === "nextFriday") {
      const day = d.getDay();
      const add = day <= 5 ? (5 - day || 7) : 5 + (7 - day);
      d.setDate(d.getDate() + add);
    }
    setNewDate(d.toISOString().slice(0, 10));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, goalsRes] = await Promise.all([
        fetch(`/api/workspace?path=${encodeURIComponent(CALENDAR_PATH)}&file=1`),
        fetch(`/api/workspace?path=${encodeURIComponent(GOALS_PATH)}&file=1`),
      ]);
      if (calRes.ok) {
        const json = await calRes.json();
        const data = JSON.parse(json.content ?? "{}") as CalendarData;
        setEvents(Array.isArray(data.events) ? data.events : []);
      } else setEvents([]);
      if (goalsRes.ok) {
        const json = await goalsRes.json();
        setGoalsMap(parseGoalsForCalendar(json.content ?? "{}"));
      } else setGoalsMap({});
    } catch {
      setEvents([]);
      setGoalsMap({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const save = useCallback(async (newEvents: CalEvent[]) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: CALENDAR_PATH,
          content: JSON.stringify({ events: newEvents }, null, 2),
        }),
      });
      setEvents(newEvents);
    } finally {
      setSaving(false);
    }
  }, []);

  const addEvent = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;
    const newEvents = [
      ...events,
      { id: `e-${Date.now()}`, title, date: newDate, type: "event", color: newEventColor },
    ];
    await save(newEvents);
    setNewTitle("");
    setNewDate(new Date().toISOString().slice(0, 10));
    // Sync to Tasks: add as Not Started task with due date so drag-to-move can update it
    try {
      const res = await fetch(`/api/workspace?path=${encodeURIComponent(TASKS_PATH)}&file=1`);
      if (res.ok) {
        const data = await res.json();
        const sections = parseTasksMd(data.content ?? "");
        sections["Not Started"] = sections["Not Started"] ?? [];
        sections["Not Started"].unshift(buildTaskLine(false, title, newDate, undefined));
        await fetch("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: TASKS_PATH, content: serializeTasksMd(sections) }),
        });
      }
    } catch {
      // ignore sync failure
    }
  }, [events, newTitle, newDate, newEventColor, save]);

  const eventColorClass = (e: CalEvent) => {
    if (e.goalId) {
      const goal = goalsMap[e.goalId];
      return goalEventClass(goal?.color);
    }
    return EVENT_COLORS.find((c) => c.name === e.color)?.class ?? EVENT_COLORS[0].class;
  };

  const removeEvent = useCallback(
    async (id: string) => {
      const event = events.find((e) => e.id === id);
      const next = events.filter((e) => e.id !== id);
      await save(next);
      if (event?.title?.trim() && event?.date) {
        const title = event.title.trim();
        const due = event.date;
        const goalId = event.goalId?.trim();
        try {
          const res = await fetch(`/api/workspace?path=${encodeURIComponent(TASKS_PATH)}&file=1`);
          if (!res.ok) return;
          const data = await res.json();
          const sections = parseTasksMd(data.content ?? "");
          let removed = false;
          for (const section of TASK_SECTIONS) {
            const arr = sections[section] ?? [];
            const idx = arr.findIndex((raw) => {
              const tTitle = taskTitle(raw).trim();
              const meta = parseTaskMeta(raw);
              return tTitle === title && meta.due === due && (goalId ? meta.goalId === goalId : !meta.goalId);
            });
            if (idx >= 0) {
              sections[section] = arr.filter((_, i) => i !== idx);
              removed = true;
              break;
            }
          }
          if (removed) {
            await fetch("/api/workspace", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: TASKS_PATH, content: serializeTasksMd(sections) }),
            });
          }
        } catch {
          // ignore
        }
      }
    },
    [events, save]
  );

  const moveEventToDate = useCallback(
    async (eventId: string, newDate: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;
      const oldDate = event.date;
      const title = event.title.trim();
      const goalId = event.goalId?.trim();
      const next = events.map((e) =>
        e.id === eventId ? { ...e, date: newDate } : e
      );
      await save(next);
      if (!title) return;
      try {
        const res = await fetch(`/api/workspace?path=${encodeURIComponent(TASKS_PATH)}&file=1`);
        if (!res.ok) return;
        const data = await res.json();
        const sections = parseTasksMd(data.content ?? "");
        let updated = false;
        for (const section of TASK_SECTIONS) {
          const arr = sections[section] ?? [];
          for (let i = 0; i < arr.length; i++) {
            const raw = arr[i];
            const tTitle = taskTitle(raw).trim();
            const meta = parseTaskMeta(raw);
            const matches =
              tTitle === title &&
              meta.due === oldDate &&
              (goalId ? meta.goalId === goalId : !meta.goalId);
            if (matches) {
              arr[i] = buildTaskLine(isTaskDone(raw), tTitle, newDate, meta.goalId);
              updated = true;
              break;
            }
          }
          if (updated) break;
        }
        if (updated) {
          await fetch("/api/workspace", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: TASKS_PATH, content: serializeTasksMd(sections) }),
          });
        }
      } catch {
        // ignore sync failure
      }
    },
    [events, save]
  );

  const year = date.getFullYear();
  const month = date.getMonth();
  const days = getDaysInMonth(year, month);

  const eventsByDate: Record<string, CalEvent[]> = {};
  events.forEach((e) => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Calendar</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Events stored in <code className="rounded bg-muted px-1">{CALENDAR_PATH}</code>. Add events below.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Input
          type="text"
          placeholder="Event title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addEvent()}
          className="w-40"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[160px] justify-between">
              <CalendarIcon className="size-4 shrink-0" />
              {formatDateLabel(newDate)}
              <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setQuickDate("today")}>Today</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickDate("tomorrow")}>Tomorrow</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickDate("nextMonday")}>Next Monday</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickDate("nextFriday")}>Next Friday</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-36"
          title="Or pick a date"
        />
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Color:</span>
          {EVENT_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              onClick={() => setNewEventColor(c.name)}
              className={cn(
                "size-5 rounded-full border-2 transition-transform",
                c.class,
                newEventColor === c.name && "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
              )}
            />
          ))}
        </div>
        <Button onClick={addEvent} disabled={saving}>
          Add event
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/journal">Journal</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">
            {date.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </CardTitle>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setDate(new Date())}
              className="rounded px-2 py-1 text-xs hover:bg-muted"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDate(new Date(year, month - 1))}
              className="rounded p-1 hover:bg-muted"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setDate(new Date(year, month + 1))}
              className="rounded p-1 hover:bg-muted"
              aria-label="Next month"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {WEEKDAYS.map((d) => (
              <div key={d} className="font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((d, i) => {
              const key = dateKey(d);
              const dayEvents = key ? eventsByDate[key] ?? [] : [];
              const today = isToday(d);
              const handleDrop = (e: React.DragEvent) => {
                e.preventDefault();
                if (!key) return;
                const id = e.dataTransfer.getData("application/x-calendar-event-id");
                if (id) moveEventToDate(id, key);
              };
              const handleDragOver = (e: React.DragEvent) => {
                if (key) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              };
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[80px] rounded-md border py-2",
                    d.getTime()
                      ? "bg-muted/30 text-foreground"
                      : "text-muted-foreground/50",
                    today && "ring-2 ring-primary border-primary"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {d.getTime() ? (
                    <span className={cn("font-medium", today && "text-primary")}>
                      {d.getDate()}
                    </span>
                  ) : (
                    ""
                  )}
                  {dayEvents.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-left text-xs">
                      {dayEvents.map((e) => {
                        const goal = e.goalId ? goalsMap[e.goalId] : null;
                        return (
                          <li
                            key={e.id}
                            draggable
                            onDragStart={(ev) => {
                              ev.dataTransfer.setData("application/x-calendar-event-id", e.id);
                              ev.dataTransfer.effectAllowed = "move";
                            }}
                            className={cn(
                              "flex items-center justify-between gap-1 rounded border px-1 cursor-grab active:cursor-grabbing",
                              eventColorClass(e)
                            )}
                            title={goal ? `${e.title} · ${goal.name}` : e.title}
                          >
                            <span className="min-w-0 flex-1 flex items-center gap-1">
                              <span className="truncate">{e.title}</span>
                              {goal && (
                                <span className="shrink-0 text-[10px] opacity-90 truncate max-w-16" title={goal.name}>
                                  {goal.name}
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEvent(e.id)}
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              ×
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
