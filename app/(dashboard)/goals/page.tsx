"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TASKS_PATH,
  parseTasksMd,
  serializeTasksMd,
  tasksForGoal,
  goalProgress,
  buildTaskLine,
  taskTitle,
  parseTaskMeta,
  isTaskDone,
  type TaskSection,
  type TaskLine,
} from "@/lib/tasks";
import {
  TargetIcon,
  PlusIcon,
  CalendarIcon,
  BookOpenIcon,
  MessageSquareIcon,
  BarChart3Icon,
  DumbbellIcon,
  XIcon,
  ChevronRightIcon,
  CheckCircle2Icon,
  CircleIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GOAL_COLOR_PALETTE } from "@/lib/goals";

const GOALS_PATH = "Dashboard/goals.json";
const CALENDAR_PATH = "Dashboard/calendar.json";

const GOAL_STATUSES = ["Planning", "In Progress", "Done"] as const;
type GoalStatus = (typeof GOAL_STATUSES)[number];

const STATUS_STYLES: Record<GoalStatus, { header: string; tag: string; border: string; card: string }> = {
  Planning: { header: "bg-muted/80 text-muted-foreground", tag: "bg-muted text-muted-foreground", border: "border-l-muted-foreground", card: "bg-muted/40 border-muted" },
  "In Progress": { header: "bg-blue-600/90 text-blue-50", tag: "bg-blue-500/25 text-blue-300 border-blue-500/40", border: "border-l-blue-500", card: "bg-blue-500/15 border-blue-500/30" },
  Done: { header: "bg-emerald-700/90 text-emerald-50", tag: "bg-emerald-500/25 text-emerald-300 border-emerald-500/40", border: "border-l-emerald-500", card: "bg-emerald-500/15 border-emerald-500/30" },
};

const CARD_ICONS = [TargetIcon, BookOpenIcon, MessageSquareIcon, BarChart3Icon, DumbbellIcon, CalendarIcon];

type Goal = {
  id: string;
  name: string;
  description?: string;
  milestones: string[];
  createdAt: string;
  targetDate?: string;
  status?: GoalStatus;
  color?: string;
};

type GoalsData = { goals: Goal[] };

const defaultData: GoalsData = { goals: [] };

function parseGoalsData(content: string): GoalsData {
  try {
    const d = JSON.parse(content) as GoalsData;
    const goals = Array.isArray(d.goals) ? d.goals : [];
    return {
      goals: goals.map((g) => {
        const s = g.status as string | undefined;
        const status: GoalStatus = GOAL_STATUSES.includes(s as GoalStatus) ? (s as GoalStatus) : "Planning";
        return { ...g, status };
      }),
    };
  } catch {
    return defaultData;
  }
}

function goalIcon(goal: Goal) {
  const idx = goal.name.length % CARD_ICONS.length;
  return CARD_ICONS[idx];
}

export default function GoalsPage() {
  const [goalsData, setGoalsData] = useState<GoalsData>(defaultData);
  const [tasksContent, setTasksContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newGoalStatus, setNewGoalStatus] = useState<GoalStatus | null>(null);
  const [newName, setNewName] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [panelGoalName, setPanelGoalName] = useState("");
  const [panelGoalTargetDate, setPanelGoalTargetDate] = useState("");
  const [panelTaskTitle, setPanelTaskTitle] = useState("");
  const [panelTaskDue, setPanelTaskDue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, tasksRes] = await Promise.all([
        fetch(`/api/workspace?path=${encodeURIComponent(GOALS_PATH)}&file=1`),
        fetch(`/api/workspace?path=${encodeURIComponent(TASKS_PATH)}&file=1`),
      ]);
      if (goalsRes.ok) {
        const json = await goalsRes.json();
        setGoalsData(parseGoalsData(json.content ?? "{}"));
      } else setGoalsData(defaultData);
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasksContent(data.content ?? "");
      } else setTasksContent("");
    } catch {
      setGoalsData(defaultData);
      setTasksContent("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveGoals = useCallback(async (newData: GoalsData) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: GOALS_PATH, content: JSON.stringify(newData, null, 2) }),
      });
      setGoalsData(newData);
    } finally {
      setSaving(false);
    }
  }, []);

  const saveTasks = useCallback(async (sections: Record<TaskSection, string[]>) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: TASKS_PATH, content: serializeTasksMd(sections) }),
      });
      setTasksContent(serializeTasksMd(sections));
    } finally {
      setSaving(false);
    }
  }, []);

  const sections = parseTasksMd(tasksContent);
  const selectedGoal = selectedGoalId ? goalsData.goals.find((g) => g.id === selectedGoalId) : null;
  const selectedGoalTasks = selectedGoalId ? tasksForGoal(sections, selectedGoalId) : [];

  useEffect(() => {
    if (selectedGoal) {
      setPanelGoalName(selectedGoal.name);
      setPanelGoalTargetDate(selectedGoal.targetDate ?? "");
    }
  }, [selectedGoal]);

  const updateGoal = useCallback(
    (goalId: string, updates: { name?: string; targetDate?: string }) => {
      saveGoals({
        goals: goalsData.goals.map((g) =>
          g.id === goalId ? { ...g, ...updates } : g
        ),
      });
    },
    [goalsData.goals, saveGoals]
  );

  const addGoal = useCallback(
    (status: GoalStatus) => {
      const name = newName.trim();
      if (!name) return;
      const id = `g-${Date.now()}`;
      const createdAt = new Date().toISOString().slice(0, 10);
      const color = GOAL_COLOR_PALETTE[goalsData.goals.length % GOAL_COLOR_PALETTE.length];
      saveGoals({
        goals: [
          ...goalsData.goals,
          { id, name, milestones: [], createdAt, targetDate: newTargetDate.trim() || undefined, status, color },
        ],
      });
      setNewName("");
      setNewTargetDate("");
      setNewGoalStatus(null);
    },
    [goalsData.goals, newName, newTargetDate, saveGoals]
  );

  const setGoalStatus = useCallback(
    (goalId: string, status: GoalStatus) => {
      saveGoals({
        goals: goalsData.goals.map((g) => (g.id === goalId ? { ...g, status } : g)),
      });
    },
    [goalsData.goals, saveGoals]
  );

  const removeGoal = useCallback(
    async (goalId: string) => {
      try {
        const res = await fetch(`/api/workspace?path=${encodeURIComponent(CALENDAR_PATH)}&file=1`);
        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.content ?? "{}");
          let events: { id: string; title: string; date: string; goalId?: string }[] = Array.isArray(parsed.events) ? parsed.events : [];
          events = events.filter((e) => e.goalId !== goalId);
          await fetch("/api/workspace", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: CALENDAR_PATH, content: JSON.stringify({ events }, null, 2) }),
          });
        }
      } catch {
        // ignore
      }
      saveGoals({ goals: goalsData.goals.filter((g) => g.id !== goalId) });
      if (selectedGoalId === goalId) setSelectedGoalId(null);
    },
    [goalsData.goals, saveGoals, selectedGoalId]
  );

  const addTaskToGoal = useCallback(
    async (goalId: string) => {
      const title = panelTaskTitle.trim();
      if (!title) return;
      const due = panelTaskDue.trim() || undefined;
      const newSections = { ...sections };
      newSections["Not Started"] = [buildTaskLine(false, title, due, goalId), ...(newSections["Not Started"] ?? [])];
      await saveTasks(newSections);
      setPanelTaskTitle("");
      setPanelTaskDue("");
      if (due) {
        try {
          const res = await fetch(`/api/workspace?path=${encodeURIComponent(CALENDAR_PATH)}&file=1`);
          let events: { id: string; title: string; date: string; goalId?: string }[] = [];
          if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(data.content ?? "{}");
            events = Array.isArray(parsed.events) ? parsed.events : [];
          }
          events.push({ id: `e-${Date.now()}`, title, date: due, goalId });
          await fetch("/api/workspace", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: CALENDAR_PATH, content: JSON.stringify({ events }, null, 2) }),
          });
        } catch {
          // ignore
        }
      }
    },
    [sections, panelTaskTitle, panelTaskDue, saveTasks]
  );

  const toggleTaskInPanel = useCallback(
    async (t: TaskLine) => {
      const newSections = { ...sections };
      const arr = [...(newSections[t.section] ?? [])];
      const line = arr[t.index];
      const newDone = !isTaskDone(line);
      const title = taskTitle(line);
      const meta = parseTaskMeta(line);
      arr[t.index] = buildTaskLine(newDone, title, meta.due, meta.goalId);
      newSections[t.section] = arr;
      await saveTasks(newSections);
    },
    [sections, saveTasks]
  );

  const removeTaskInPanel = useCallback(
    async (t: TaskLine) => {
      const raw = (sections[t.section] ?? [])[t.index];
      const title = raw ? taskTitle(raw).trim() : "";
      const meta = raw ? parseTaskMeta(raw) : {};
      const due = meta.due?.trim() ?? "";
      const goalId = meta.goalId?.trim() ?? t.goalId;
      if (title && due) {
        try {
          const res = await fetch(`/api/workspace?path=${encodeURIComponent(CALENDAR_PATH)}&file=1`);
          if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(data.content ?? "{}");
            let events: { id: string; title: string; date: string; goalId?: string }[] = Array.isArray(parsed.events) ? parsed.events : [];
            const toRemove = (e: { title: string; date: string; goalId?: string }) =>
              e.title.trim() === title &&
              e.date === due &&
              (goalId ? e.goalId === goalId : !e.goalId);
            events = events.filter((e) => !toRemove(e));
            const putRes = await fetch("/api/workspace", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: CALENDAR_PATH, content: JSON.stringify({ events }, null, 2) }),
            });
            if (!putRes.ok) {
              const err = await putRes.json().catch(() => ({}));
              console.warn("Calendar update failed:", err);
            }
          }
        } catch (err) {
          console.warn("Calendar sync on task remove:", err);
        }
      }
      const newSections = { ...sections };
      newSections[t.section] = (newSections[t.section] ?? []).filter((_, i) => i !== t.index);
      await saveTasks(newSections);
    },
    [sections, saveTasks]
  );

  const goalsByStatus = GOAL_STATUSES.reduce(
    (acc, s) => {
      acc[s] = goalsData.goals.filter((g) => (g.status ?? "Planning") === s);
      return acc;
    },
    {} as Record<GoalStatus, Goal[]>
  );

  function formatDateRange(g: Goal): string {
    if (!g.targetDate) return "No target";
    const d = new Date(g.targetDate + "T12:00:00");
    return isNaN(d.getTime()) ? "No target" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <TargetIcon className="size-5" />
            </span>
            Goals
          </h1>
          <p className="text-sm text-muted-foreground">
            Outcomes and their tasks. Click a goal to manage tasks in context.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/tasks">Tasks board</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-4">
          {GOAL_STATUSES.map((statusKey) => {
            const goals = goalsByStatus[statusKey];
            const style = STATUS_STYLES[statusKey];
            const isAdding = newGoalStatus === statusKey;
            return (
              <div
                key={statusKey}
                className="flex w-80 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("application/x-goal-id");
                  if (id) setGoalStatus(id, statusKey);
                }}
              >
                <div className={cn("flex items-center justify-between px-3 py-2 font-medium", style.header)}>
                  <span>{statusKey}</span>
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{goals.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-background/50">
                  {goals.map((g) => {
                    const Icon = goalIcon(g);
                    const { done, total } = goalProgress(sections, g.id);
                    const statusStyle = STATUS_STYLES[g.status ?? "Planning"];
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGoalId(g.id)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-goal-id", g.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className={cn("w-full rounded-lg border p-3 text-left cursor-grab active:cursor-grabbing transition-colors hover:border-primary/40", statusStyle.card)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{g.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <CalendarIcon className="size-3 shrink-0" />
                              {formatDateRange(g)}
                            </p>
                            {total > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{done}/{total}</span>
                              </div>
                            )}
                            <span className={cn("mt-2 inline-block rounded-md border px-2 py-0.5 text-xs", statusStyle.tag)}>
                              {g.status ?? "Planning"}
                            </span>
                          </div>
                          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                  {isAdding ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
                      <Input
                        autoFocus
                        placeholder="Goal name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addGoal(statusKey); if (e.key === "Escape") setNewGoalStatus(null); }}
                        className="h-8 text-sm"
                      />
                      <Input type="date" value={newTargetDate} onChange={(e) => setNewTargetDate(e.target.value)} className="h-8 text-sm" />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7" onClick={() => addGoal(statusKey)}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setNewGoalStatus(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="p-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setNewGoalStatus(statusKey)}
                    disabled={saving}
                  >
                    <PlusIcon className="mr-2 size-4" />
                    New goal
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal detail panel */}
      {selectedGoal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedGoalId(null)} aria-hidden />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-xl z-50 flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 font-semibold truncate">{selectedGoal.name}</div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/tasks?goal=${encodeURIComponent(selectedGoal.id)}`}>Open in Tasks</Link>
                </Button>
                <button
                  type="button"
                  onClick={() => removeGoal(selectedGoal.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </button>
                <button type="button" onClick={() => setSelectedGoalId(null)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                  <XIcon className="size-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Goal name</label>
                <Input
                  value={panelGoalName}
                  onChange={(e) => setPanelGoalName(e.target.value)}
                  placeholder="Goal name"
                  className="h-9"
                />
                <label className="text-xs font-medium text-muted-foreground block">Target date</label>
                <Input
                  type="date"
                  value={panelGoalTargetDate}
                  onChange={(e) => setPanelGoalTargetDate(e.target.value)}
                  className="h-9"
                />
                <Button
                  size="sm"
                  onClick={() => updateGoal(selectedGoal.id, { name: panelGoalName.trim(), targetDate: panelGoalTargetDate.trim() || undefined })}
                  disabled={saving || !panelGoalName.trim()}
                >
                  Save goal
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Status: {selectedGoal.status ?? "Planning"}
              </p>
              <div>
                <h3 className="text-sm font-medium mb-2">Tasks for this goal</h3>
                <ul className="space-y-2">
                  {selectedGoalTasks.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No tasks yet. Add one below.</li>
                  ) : (
                    selectedGoalTasks.map((t) => (
                      <li
                        key={`${t.section}-${t.index}`}
                        className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTaskInPanel(t)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          {t.done ? <CheckCircle2Icon className="size-4 text-emerald-500" /> : <CircleIcon className="size-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={cn("text-sm", t.done && "line-through text-muted-foreground")}>{t.title}</span>
                          {t.due && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.due + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTaskInPanel(t)}
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Add task</p>
                <Input
                  placeholder="Task title"
                  value={panelTaskTitle}
                  onChange={(e) => setPanelTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTaskToGoal(selectedGoal.id)}
                  className="mb-2"
                />
                <Input
                  type="date"
                  value={panelTaskDue}
                  onChange={(e) => setPanelTaskDue(e.target.value)}
                  className="mb-2 text-sm"
                />
                <Button size="sm" onClick={() => addTaskToGoal(selectedGoal.id)} disabled={saving || !panelTaskTitle.trim()}>
                  <PlusIcon className="mr-1 size-4" />
                  Add task
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
