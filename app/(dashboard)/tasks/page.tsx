"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TASKS_PATH,
  TASK_SECTIONS,
  parseTasksMd,
  serializeTasksMd,
  tasksForGoal,
  buildTaskLine,
  taskTitle,
  parseTaskMeta,
  isTaskDone,
  type TaskSection,
  type TaskLine,
} from "@/lib/tasks";
import { ListTodoIcon, FileTextIcon, PlusIcon, CircleIcon, CheckCircle2Icon, PencilIcon, Trash2Icon, LayoutGridIcon, TargetIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GOAL_COLOR_PALETTE, goalBorderClass, goalCardClass, goalPillClass } from "@/lib/goals";

const CALENDAR_PATH = "Dashboard/calendar.json";
const GOALS_PATH = "Dashboard/goals.json";

const COLUMN_STYLES: Record<TaskSection, { header: string; card: string }> = {
  "Not Started": { header: "bg-muted/80 text-muted-foreground", card: "bg-muted/40 border-muted" },
  "In Progress": { header: "bg-blue-600/90 text-blue-50", card: "bg-blue-500/15 border-blue-500/30" },
  Done: { header: "bg-emerald-700/90 text-emerald-50", card: "bg-emerald-500/15 border-emerald-500/30" },
};

const GOAL_HEADER_CLASS: Record<string, string> = {
  violet: "bg-violet-600/90 text-violet-50",
  blue: "bg-blue-600/90 text-blue-50",
  emerald: "bg-emerald-600/90 text-emerald-50",
  amber: "bg-amber-600/90 text-amber-50",
  rose: "bg-rose-600/90 text-rose-50",
  cyan: "bg-cyan-600/90 text-cyan-50",
  sky: "bg-sky-600/90 text-sky-50",
  fuchsia: "bg-fuchsia-600/90 text-fuchsia-50",
};

const SECTION_LEFT_BORDER: Record<TaskSection, string> = {
  "Not Started": "border-l-muted-foreground",
  "In Progress": "border-l-blue-500",
  Done: "border-l-emerald-500",
};

type GoalBrief = { id: string; name: string; color?: string };

function TaskCard({
  t,
  sectionKey,
  style,
  goalsList,
  goalColor,
  isEditing,
  editTitle,
  setEditTitle,
  editDue,
  setEditDue,
  editGoalId,
  setEditGoalId,
  onToggle,
  onEditStart,
  onEditSave,
  onEditCancel,
  onRemove,
}: {
  t: TaskLine;
  sectionKey: TaskSection;
  style: { card: string };
  goalsList: GoalBrief[];
  goalColor?: string;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (s: string) => void;
  editDue: string;
  setEditDue: (s: string) => void;
  editGoalId: string;
  setEditGoalId: (s: string) => void;
  onToggle: () => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onRemove: () => void;
}) {
  const leftBorderClass = goalColor ? goalBorderClass(goalColor) : SECTION_LEFT_BORDER[sectionKey];
  if (isEditing) {
    return (
      <div className={cn("rounded-lg border border-border border-l-4 bg-card px-3 py-2 space-y-2 shadow-sm", leftBorderClass)}>
        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm" placeholder="Task title" />
        <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="h-7 text-xs" />
        <select value={editGoalId} onChange={(e) => setEditGoalId(e.target.value)} className="h-7 w-full rounded border border-input bg-background text-xs">
          <option value="">No goal</option>
          {goalsList.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <Button size="sm" className="h-7" onClick={onEditSave}>Save</Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={onEditCancel}>Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-task-section", t.section);
        e.dataTransfer.setData("application/x-task-index", String(t.index));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "rounded-lg border border-border border-l-4 bg-card px-3 py-2 shadow-sm cursor-grab active:cursor-grabbing transition-colors",
        leftBorderClass,
        t.done && "opacity-75"
      )}
    >
      <div className="flex items-start gap-2">
        <button type="button" onClick={onToggle} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground">
          {t.done ? <CheckCircle2Icon className="size-4 text-emerald-500" /> : <CircleIcon className="size-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <span className={cn("text-sm wrap-break-word", t.done && "text-muted-foreground line-through")}>{t.title}</span>
          {t.due && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Due {new Date(t.due).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
          {t.goalId && (() => {
            const goal = goalsList.find((g) => g.id === t.goalId);
            return goal ? (
              <span className={cn("inline-block mt-1 border px-1.5 py-0.5 text-[10px]", goalPillClass(goalColor))} title={goal.name}>
                {goal.name}
              </span>
            ) : null;
          })()}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button type="button" onClick={onEditStart} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
            <PencilIcon className="size-3.5" />
          </button>
          <button type="button" onClick={onRemove} className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive" title="Remove">
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TasksContent() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"status" | "goal">("status");
  const [newTaskSection, setNewTaskSection] = useState<TaskSection | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskGoalId, setNewTaskGoalId] = useState("");
  const [editingTask, setEditingTask] = useState<{ section: TaskSection; index: number } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editGoalId, setEditGoalId] = useState("");
  const [goalsList, setGoalsList] = useState<GoalBrief[]>([]);
  const searchParams = useSearchParams();
  const goalFromUrl = searchParams.get("goal");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace?path=${encodeURIComponent(TASKS_PATH)}&file=1`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content ?? "");
      } else setContent("# Tasks\n\n## Not Started\n\n## In Progress\n\n## Done\n");
    } catch {
      setContent("# Tasks\n\n## Not Started\n\n## In Progress\n\n## Done\n");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch(`/api/workspace?path=${encodeURIComponent(GOALS_PATH)}&file=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.content) return;
        try {
          const parsed = JSON.parse(data.content);
          const goals = Array.isArray(parsed?.goals) ? parsed.goals : [];
          setGoalsList(goals.map((g: GoalBrief & { color?: string }, i: number) => ({
            id: g.id,
            name: g.name,
            color: g.color ?? GOAL_COLOR_PALETTE[i % GOAL_COLOR_PALETTE.length],
          })));
        } catch {
          setGoalsList([]);
        }
      })
      .catch(() => setGoalsList([]));
  }, []);

  const save = useCallback(async (newContent: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: TASKS_PATH, content: newContent }),
      });
      if (res.ok) setContent(newContent);
    } finally {
      setSaving(false);
    }
  }, []);

  const openNewTask = useCallback((section: TaskSection) => {
    setNewTaskSection(section);
    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskGoalId(goalFromUrl ?? "");
  }, [goalFromUrl]);

  const addTask = useCallback(
    async (section: TaskSection) => {
      const trimmed = newTaskTitle.trim();
      if (!trimmed) return;
      const due = newTaskDueDate.trim() || undefined;
      const goalId = newTaskGoalId.trim() || undefined;
      const line = buildTaskLine(false, trimmed, due, goalId);
      const sections = parseTasksMd(content);
      sections["Not Started"] = [line, ...(sections["Not Started"] ?? [])];
      await save(serializeTasksMd(sections));
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskGoalId("");
      setNewTaskSection(null);
      if (due) {
        try {
          const res = await fetch(`/api/workspace?path=${encodeURIComponent(CALENDAR_PATH)}&file=1`);
          let events: { id: string; title: string; date: string; goalId?: string }[] = [];
          if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(data.content ?? "{}");
            events = Array.isArray(parsed.events) ? parsed.events : [];
          }
          events.push({ id: `e-${Date.now()}`, title: trimmed, date: due, goalId });
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
    [content, newTaskTitle, newTaskDueDate, newTaskGoalId, save]
  );

  const moveTask = useCallback(
    (fromSection: TaskSection, fromIndex: number, toSection: TaskSection) => {
      const sections = parseTasksMd(content);
      const arr = sections[fromSection] ?? [];
      const line = arr[fromIndex];
      if (!line) return;
      sections[fromSection] = arr.filter((_, i) => i !== fromIndex);
      sections[toSection] = [...(sections[toSection] ?? []), line];
      save(serializeTasksMd(sections));
    },
    [content, save]
  );

  const setTaskGoal = useCallback(
    (section: TaskSection, index: number, newGoalId: string | null) => {
      const sections = parseTasksMd(content);
      const arr = [...(sections[section] ?? [])];
      const raw = arr[index];
      if (!raw) return;
      const done = isTaskDone(raw);
      const title = taskTitle(raw);
      const meta = parseTaskMeta(raw);
      arr[index] = buildTaskLine(done, title, meta.due ?? undefined, newGoalId ?? undefined);
      sections[section] = arr;
      save(serializeTasksMd(sections));
    },
    [content, save]
  );

  const toggleTask = useCallback(
    (section: TaskSection, index: number) => {
      const sections = parseTasksMd(content);
      const arr = sections[section] ?? [];
      const raw = arr[index];
      if (!raw) return;
      const done = !isTaskDone(raw);
      const title = taskTitle(raw);
      const meta = parseTaskMeta(raw);
      arr[index] = buildTaskLine(done, title, meta.due, meta.goalId);
      save(serializeTasksMd(sections));
    },
    [content, save]
  );

  const removeTask = useCallback(
    async (section: TaskSection, index: number) => {
      const sections = parseTasksMd(content);
      const raw = (sections[section] ?? [])[index];
      const due = raw ? parseTaskMeta(raw).due : undefined;
      const goalId = raw ? parseTaskMeta(raw).goalId : undefined;
      const title = raw ? taskTitle(raw) : undefined;
      if (due && title) {
        try {
          const res = await fetch(`/api/workspace?path=${encodeURIComponent(CALENDAR_PATH)}&file=1`);
          if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(data.content ?? "{}");
            let events: { id: string; title: string; date: string; goalId?: string }[] = Array.isArray(parsed.events) ? parsed.events : [];
            events = events.filter(
              (e) => !(e.title === title && e.date === due && (goalId ? e.goalId === goalId : !e.goalId))
            );
            await fetch("/api/workspace", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: CALENDAR_PATH, content: JSON.stringify({ events }, null, 2) }),
            });
          }
        } catch {
          // ignore
        }
      }
      sections[section] = (sections[section] ?? []).filter((_, i) => i !== index);
      save(serializeTasksMd(sections));
    },
    [content, save]
  );

  const startEditTask = useCallback((t: TaskLine) => {
    setEditingTask({ section: t.section, index: t.index });
    setEditTitle(t.title);
    setEditDue(t.due ?? "");
    setEditGoalId(t.goalId ?? "");
  }, []);

  const saveEditTask = useCallback(
    async (section: TaskSection, index: number) => {
      const title = editTitle.trim();
      if (!title) {
        setEditingTask(null);
        return;
      }
      const sections = parseTasksMd(content);
      const arr = sections[section] ?? [];
      const raw = arr[index];
      if (!raw) return;
      const done = isTaskDone(raw);
      const due = editDue.trim() || undefined;
      const goalId = editGoalId.trim() || undefined;
      arr[index] = buildTaskLine(done, title, due, goalId);
      save(serializeTasksMd(sections));
      setEditingTask(null);
      if (due) {
        try {
          const res = await fetch(`/api/workspace?path=${encodeURIComponent(CALENDAR_PATH)}&file=1`);
          let events: { id: string; title: string; date: string; goalId?: string }[] = [];
          if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(data.content ?? "{}");
            events = Array.isArray(parsed.events) ? parsed.events : [];
          }
          const existing = events.find((e) => e.title === taskTitle(raw) && e.date === parseTaskMeta(raw).due);
          if (existing) {
            existing.title = title;
            existing.date = due;
            (existing as { goalId?: string }).goalId = goalId;
          } else {
            events.push({ id: `e-${Date.now()}`, title, date: due, goalId });
          }
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
    [content, editTitle, editDue, editGoalId, save]
  );

  const sections = parseTasksMd(content);
  const goalColumns = [{ id: null as string | null, name: "No goal" }, ...goalsList.map((g) => ({ id: g.id as string, name: g.name }))];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ListTodoIcon className="size-7 text-primary" />
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Work that moves your goals forward. Toggle view to group by status or by goal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("status")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1.5 text-sm",
                viewMode === "status" ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <LayoutGridIcon className="size-4" />
              By status
            </button>
            <button
              type="button"
              onClick={() => setViewMode("goal")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1.5 text-sm",
                viewMode === "goal" ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <TargetIcon className="size-4" />
              By goal
            </button>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/documents?open=${encodeURIComponent(TASKS_PATH)}`}>
              <FileTextIcon className="mr-1 size-4" />
              Open in Documents
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : viewMode === "status" ? (
        <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-4">
          {TASK_SECTIONS.map((sectionKey) => {
            const tasks = (sections[sectionKey] ?? []).map((raw, index) => ({
              section: sectionKey,
              index,
              raw,
              title: taskTitle(raw),
              done: isTaskDone(raw),
              due: parseTaskMeta(raw).due,
              goalId: parseTaskMeta(raw).goalId,
            }));
            const style = COLUMN_STYLES[sectionKey];
            return (
              <div
                key={sectionKey}
                className="flex w-72 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromSection = e.dataTransfer.getData("application/x-task-section") as TaskSection;
                  const fromIndex = parseInt(e.dataTransfer.getData("application/x-task-index"), 10);
                  if (fromSection && !Number.isNaN(fromIndex)) moveTask(fromSection, fromIndex, sectionKey);
                }}
              >
                <div className={cn("flex items-center justify-between px-3 py-2 font-medium", style.header)}>
                  <span className="flex items-center gap-2">
                    <CircleIcon className="size-4 opacity-80" />
                    {sectionKey}
                  </span>
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{tasks.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-background/50">
                  {tasks.map((t) => (
                    <TaskCard
                      key={`${t.section}-${t.index}`}
                      t={t}
                      sectionKey={sectionKey}
                      style={style}
                      goalsList={goalsList}
                      goalColor={t.goalId ? goalsList.find((g) => g.id === t.goalId)?.color : undefined}
                      isEditing={editingTask?.section === t.section && editingTask?.index === t.index}
                      editTitle={editTitle}
                      setEditTitle={setEditTitle}
                      editDue={editDue}
                      setEditDue={setEditDue}
                      editGoalId={editGoalId}
                      setEditGoalId={setEditGoalId}
                      onToggle={() => toggleTask(t.section, t.index)}
                      onEditStart={() => startEditTask(t)}
                      onEditSave={() => saveEditTask(t.section, t.index)}
                      onEditCancel={() => setEditingTask(null)}
                      onRemove={() => removeTask(t.section, t.index)}
                    />
                  ))}
                  {newTaskSection === sectionKey && (
                    <div className={cn("rounded-lg border border-border border-l-4 bg-card px-3 py-2 space-y-2 shadow-sm", SECTION_LEFT_BORDER[sectionKey])}>
                      <Input
                        autoFocus
                        placeholder="Task title…"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addTask(sectionKey); if (e.key === "Escape") setNewTaskSection(null); }}
                        className="h-8 border-0 bg-transparent text-sm focus-visible:ring-0"
                      />
                      <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="h-7 text-xs" />
                      <select value={newTaskGoalId} onChange={(e) => setNewTaskGoalId(e.target.value)} className="h-7 w-full rounded border border-input bg-background text-xs">
                        <option value="">No goal</option>
                        {goalsList.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7" onClick={() => addTask(sectionKey)}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => { setNewTaskSection(null); setNewTaskTitle(""); setNewTaskDueDate(""); setNewTaskGoalId(""); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => openNewTask(sectionKey)} disabled={saving}>
                    <PlusIcon className="mr-2 size-4" />
                    New task
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-4">
          {goalColumns.map((col) => {
            const goalTasks = tasksForGoal(sections, col.id);
            return (
              <div
                key={col.id ?? "none"}
                className="flex w-72 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromSection = e.dataTransfer.getData("application/x-task-section") as TaskSection;
                  const fromIndex = parseInt(e.dataTransfer.getData("application/x-task-index"), 10);
                  if (!fromSection || Number.isNaN(fromIndex)) return;
                  setTaskGoal(fromSection, fromIndex, col.id);
                }}
              >
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 font-medium",
                  col.id ? (GOAL_HEADER_CLASS[goalsList.find((g) => g.id === col.id)?.color ?? ""] ?? "bg-violet-600/90 text-violet-50") : "bg-muted text-muted-foreground"
                )}>
                  <span className="flex items-center gap-2 truncate">
                    <TargetIcon className="size-4 shrink-0" />
                    {col.name}
                  </span>
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs shrink-0">{goalTasks.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-background/50">
                  {goalTasks.map((t) => (
                    <TaskCard
                      key={`${t.section}-${t.index}`}
                      t={t}
                      sectionKey={t.section}
                      style={col.id ? { card: goalCardClass(goalsList.find((g) => g.id === col.id)?.color) } : COLUMN_STYLES["Not Started"]}
                      goalsList={goalsList}
                      goalColor={t.goalId ? goalsList.find((g) => g.id === t.goalId)?.color : undefined}
                      isEditing={editingTask?.section === t.section && editingTask?.index === t.index}
                      editTitle={editTitle}
                      setEditTitle={setEditTitle}
                      editDue={editDue}
                      setEditDue={setEditDue}
                      editGoalId={editGoalId}
                      setEditGoalId={setEditGoalId}
                      onToggle={() => toggleTask(t.section, t.index)}
                      onEditStart={() => startEditTask(t)}
                      onEditSave={() => saveEditTask(t.section, t.index)}
                      onEditCancel={() => setEditingTask(null)}
                      onRemove={() => removeTask(t.section, t.index)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12 text-muted-foreground">Loading…</div>}>
      <TasksContent />
    </Suspense>
  );
}
