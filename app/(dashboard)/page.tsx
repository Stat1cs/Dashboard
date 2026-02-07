"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon, BookOpenIcon, SunIcon, ActivityIcon, ListTodoIcon, TargetIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseTasksMd, taskTitle, parseTaskMeta, isTaskDone, goalProgress } from "@/lib/tasks";
import { GOAL_COLOR_PALETTE, goalBorderClass, goalCardClass, goalPillClass } from "@/lib/goals";

const HABITS_PATH = "Dashboard/habits.json";
const TASKS_PATH = "Dashboard/TASKS.md";
const GOALS_PATH = "Dashboard/goals.json";

type DirEntry = { name: string; path: string; isDirectory: boolean; mtime?: number };
type Habit = { id: string; name: string; color?: string };
type Log = { habitId: string; date: string };
type HabitsData = { habits: Habit[]; logs: Log[] };

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayJournalPath(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `memory/${y}-${m}-${day}.md`;
}

function flattenRecent(entries: DirEntry[], limit: number): { path: string; name: string; mtime: number }[] {
  const out: { path: string; name: string; mtime: number }[] = [];
  for (const e of entries) {
    if (e.isDirectory) continue;
    if (e.mtime) out.push({ path: e.path, name: e.name, mtime: e.mtime });
  }
  return out.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}

function parseHabitsData(content: string): HabitsData {
  try {
    const d = JSON.parse(content) as HabitsData;
    return {
      habits: Array.isArray(d.habits) ? d.habits : [],
      logs: Array.isArray(d.logs) ? d.logs : [],
    };
  } catch {
    return { habits: [], logs: [] };
  }
}

function streakFor(logs: Log[], habitId: string): number {
  const sorted = [...new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date))].sort().reverse();
  if (sorted.length === 0) return 0;
  const today = todayStr();
  if (sorted[0] !== today) return 0;
  let count = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prevDay = new Date(sorted[i - 1]);
    prevDay.setDate(prevDay.getDate() - 1);
    const expected = prevDay.toISOString().slice(0, 10);
    if (sorted[i] !== expected) break;
    count++;
  }
  return count;
}

function isLoggedToday(logs: Log[], habitId: string): boolean {
  return logs.some((l) => l.habitId === habitId && l.date === todayStr());
}

const DASHBOARD_HABIT_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
};
function habitDotColor(color?: string): string {
  return DASHBOARD_HABIT_COLORS[color ?? ""] ?? "bg-muted-foreground";
}

/** 3 days before, today, 3 days after (7 days total) */
function daysAroundToday(): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = -3; i <= 3; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}
function isLoggedOn(logs: Log[], habitId: string, dateStr: string): boolean {
  return logs.some((l) => l.habitId === habitId && l.date === dateStr);
}

type GoalBrief = { id: string; name: string; status?: string; targetDate?: string; color?: string };
function parseGoalsBrief(content: string): GoalBrief[] {
  try {
    const d = JSON.parse(content) as { goals?: { id: string; name: string; status?: string; targetDate?: string; color?: string }[] };
    return Array.isArray(d.goals) ? d.goals : [];
  } catch {
    return [];
  }
}

const GOAL_STATUS_COLORS: Record<string, string> = {
  Planning: "bg-muted text-muted-foreground border-muted-foreground/40",
  "In Progress": "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40",
  Done: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
};
const TASK_SECTION_CARD: Record<string, string> = {
  "Not Started": "bg-muted/40 border-muted",
  "In Progress": "bg-blue-500/15 border-blue-500/30",
  Done: "bg-emerald-500/15 border-emerald-500/30",
};
const TASK_STATUS_LABEL: Record<string, string> = {
  "Not Started": "Not started",
  "In Progress": "In progress",
  Done: "Done",
};
const TASK_STATUS_PILL: Record<string, string> = {
  "Not Started": "bg-muted text-muted-foreground border-muted-foreground/40",
  "In Progress": "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40",
  Done: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
};
function goalDueLabel(targetDate?: string): string {
  if (!targetDate) return "";
  const d = new Date(targetDate + "T12:00:00");
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardHomePage() {
  const [recent, setRecent] = useState<{ path: string; name: string; mtime: number }[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [habitsData, setHabitsData] = useState<HabitsData | null>(null);
  const [habitsSaving, setHabitsSaving] = useState(false);
  const [tasksContent, setTasksContent] = useState("");
  const [goalsBrief, setGoalsBrief] = useState<GoalBrief[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [rootRes, knowledgeRes, memoryRes, focusRes, habitsRes, tasksRes, goalsRes] = await Promise.all([
          fetch("/api/workspace?path="),
          fetch("/api/workspace?path=knowledge").catch(() => null),
          fetch("/api/workspace?path=memory").catch(() => null),
          fetch("/api/workspace?path=Dashboard/focus.txt&file=1").catch(() => null),
          fetch(`/api/workspace?path=${encodeURIComponent(HABITS_PATH)}&file=1`).catch(() => null),
          fetch(`/api/workspace?path=${encodeURIComponent(TASKS_PATH)}&file=1`).catch(() => null),
          fetch(`/api/workspace?path=${encodeURIComponent(GOALS_PATH)}&file=1`).catch(() => null),
        ]);

        if (cancelled) return;
        const all: { path: string; name: string; mtime: number }[] = [];
        if (rootRes.ok) {
          const data = await rootRes.json();
          all.push(...flattenRecent(data.entries ?? [], 20));
        }
        if (knowledgeRes?.ok) {
          const data = await knowledgeRes.json();
          all.push(...flattenRecent(data.entries ?? [], 10));
        }
        if (memoryRes?.ok) {
          const data = await memoryRes.json();
          all.push(...flattenRecent(data.entries ?? [], 10));
        }
        all.sort((a, b) => b.mtime - a.mtime);
        setRecent(all.slice(0, 10));

        if (focusRes?.ok) {
          const data = await focusRes.json();
          setFocus((data.content ?? "").trim() || null);
        }

        if (habitsRes?.ok) {
          const data = await habitsRes.json();
          setHabitsData(parseHabitsData(data.content ?? "{}"));
        } else {
          setHabitsData({ habits: [], logs: [] });
        }

        if (tasksRes?.ok) {
          const data = await tasksRes.json();
          setTasksContent(data.content ?? "");
        } else {
          setTasksContent("");
        }

        if (goalsRes?.ok) {
          const data = await goalsRes.json();
          setGoalsBrief(parseGoalsBrief(data.content ?? "{}"));
        } else {
          setGoalsBrief([]);
        }
      } catch {
        if (!cancelled) setRecent([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const toggleHabitLog = async (habitId: string) => {
    if (!habitsData) return;
    const today = todayStr();
    const logged = isLoggedToday(habitsData.logs, habitId);
    const newLogs = logged
      ? habitsData.logs.filter((l) => !(l.habitId === habitId && l.date === today))
      : [...habitsData.logs, { habitId, date: today }];
    setHabitsSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: HABITS_PATH,
          content: JSON.stringify({ habits: habitsData.habits, logs: newLogs }, null, 2),
        }),
      });
      setHabitsData((prev) => prev ? { ...prev, logs: newLogs } : null);
    } finally {
      setHabitsSaving(false);
    }
  };

  const todayPath = todayJournalPath();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Morning Brief
      </h1>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Column 1: Focus, Habits */}
        <div className="flex flex-col gap-4">
          <Card className="border-l-4 border-l-amber-500/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <SunIcon className="size-4" />
                Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              {focus ? (
                <p className="text-sm font-medium">{focus}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set in <code className="rounded bg-muted px-1">Dashboard/focus.txt</code>.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ActivityIcon className="size-4" />
                Habits
              </CardTitle>
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link href="/habits">Habits</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : habitsData && habitsData.habits.length > 0 ? (
                <>
                  <ul className="space-y-1.5 text-sm">
                    {habitsData.habits.slice(0, 6).map((h) => {
                      const done = isLoggedToday(habitsData.logs, h.id);
                      const dot = habitDotColor(h.color);
                      return (
                        <li key={h.id} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full shrink-0", dot)} />
                            {h.name}
                          </span>
                          <Button
                            variant={done ? "secondary" : "default"}
                            size="sm"
                            className="shrink-0"
                            disabled={habitsSaving}
                            onClick={() => toggleHabitLog(h.id)}
                          >
                            {done ? "Done" : "Log"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-2 flex gap-1.5 justify-center">
                    {daysAroundToday().map((d) => (
                      <div key={d} className="flex flex-col gap-1 items-center">
                        <span
                          className="text-[10px] text-muted-foreground"
                          title={d}
                        >
                          {d === todayStr() ? "T" : new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "narrow" })}
                        </span>
                        {habitsData.habits.slice(0, 6).map((h) => {
                          const dot = habitDotColor(h.color);
                          return (
                            <span
                              key={h.id}
                              className={cn(
                                "size-2 rounded-sm",
                                isLoggedOn(habitsData.logs, h.id, d) ? dot : "bg-muted/50"
                              )}
                              title={`${h.name} ${d}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No habits yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Column 2: Today's Journal, Recent docs */}
        <div className="flex flex-col gap-4">
          <Card className="border-l-4 border-l-emerald-500/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenIcon className="size-4" />
                Today&apos;s journal
              </CardTitle>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/documents?open=${encodeURIComponent(todayPath)}`}>Today</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/journal">All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Daily memory and notes.
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileTextIcon className="size-4" />
                Recent docs
              </CardTitle>
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link href="/documents">Open</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : recent.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {recent.slice(0, 5).map((f) => (
                    <li key={f.path}>
                      <Link
                        href={`/documents?open=${encodeURIComponent(f.path)}`}
                        className="text-primary hover:underline"
                      >
                        {f.path}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recent files.</p>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Column 3: Goals, Tasks */}
        <div className="flex flex-col gap-4">
          <Card className="border-l-4 border-l-violet-500/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <TargetIcon className="size-4" />
                Goals
              </CardTitle>
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link href="/goals">Goals</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : goalsBrief.length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {goalsBrief.slice(0, 4).map((g) => {
                    const sections = parseTasksMd(tasksContent);
                    const { done, total } = goalProgress(sections, g.id);
                    const status = g.status ?? "Planning";
                    const statusClass = GOAL_STATUS_COLORS[status] ?? GOAL_STATUS_COLORS.Planning;
                    const dueLabel = goalDueLabel(g.targetDate);
                    const goalColor = g.color ?? GOAL_COLOR_PALETTE[goalsBrief.findIndex((x) => x.id === g.id) % GOAL_COLOR_PALETTE.length];
                    return (
                      <li key={g.id} className={cn("flex items-center gap-2 pl-2 border-l-4", goalBorderClass(goalColor))}>
                        <div className="min-w-0 flex-1">
                          <span className="truncate block font-medium">{g.name}</span>
                          {dueLabel && (
                            <span className="text-[10px] text-muted-foreground">{dueLabel}</span>
                          )}
                        </div>
                        <span className="shrink-0 flex items-center gap-1.5">
                          {total > 0 && (
                            <span className="text-xs text-muted-foreground" title="Tasks done / total">
                              {done}/{total}
                            </span>
                          )}
                          <span className={cn("text-xs rounded border px-1.5 py-0.5", statusClass)}>{status}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No goals yet.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-sky-500/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTodoIcon className="size-4" />
                Tasks
              </CardTitle>
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link href="/tasks">Tasks</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (() => {
                const sections = parseTasksMd(tasksContent);
                const withSection: { section: "Not Started" | "In Progress"; raw: string }[] = [];
                for (const section of ["Not Started", "In Progress"] as const) {
                  for (const raw of sections[section] ?? []) {
                    if (!isTaskDone(raw) && withSection.length < 5) withSection.push({ section, raw });
                  }
                }
                return withSection.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {withSection.map(({ section, raw }, i) => {
                      const meta = parseTaskMeta(raw);
                      const goal = meta.goalId ? goalsBrief.find((g) => g.id === meta.goalId) : null;
                      const goalColor = goal ? (goal.color ?? GOAL_COLOR_PALETTE[goalsBrief.findIndex((x) => x.id === goal.id) % GOAL_COLOR_PALETTE.length]) : undefined;
                      const dueLabel = meta.due
                        ? new Date(meta.due + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                        : null;
                      const cardStyle = goal && goalColor ? goalCardClass(goalColor) : (TASK_SECTION_CARD[section] ?? TASK_SECTION_CARD["Not Started"]);
                      return (
                        <li key={i} className={cn("rounded-lg border px-3 py-2 transition-colors", cardStyle)}>
                          <div className="flex-1 min-w-0 flex gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{taskTitle(raw)}</div>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {goal && (
                                  <span className={cn("inline-block border px-1.5 py-0.5 text-[10px]", goalPillClass(goalColor))} title={goal.name}>
                                    {goal.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {dueLabel && (
                                <span className="text-xs text-muted-foreground">Due {dueLabel}</span>
                              )}
                              <span className={cn("inline-block border px-1.5 py-0.5 text-[10px]", TASK_STATUS_PILL[section] ?? TASK_STATUS_PILL["Not Started"])} aria-hidden>
                                {TASK_STATUS_LABEL[section] ?? section}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No active tasks.</p>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
