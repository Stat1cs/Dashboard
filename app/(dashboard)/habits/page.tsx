"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlameIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const HABITS_PATH = "Dashboard/habits.json";

const HABIT_COLORS = [
  { name: "blue", bg: "bg-blue-500/20", border: "border-blue-500/50", dot: "bg-blue-500" },
  { name: "emerald", bg: "bg-emerald-500/20", border: "border-emerald-500/50", dot: "bg-emerald-500" },
  { name: "amber", bg: "bg-amber-500/20", border: "border-amber-500/50", dot: "bg-amber-500" },
  { name: "rose", bg: "bg-rose-500/20", border: "border-rose-500/50", dot: "bg-rose-500" },
  { name: "violet", bg: "bg-violet-500/20", border: "border-violet-500/50", dot: "bg-violet-500" },
  { name: "cyan", bg: "bg-cyan-500/20", border: "border-cyan-500/50", dot: "bg-cyan-500" },
] as const;

type Habit = { id: string; name: string; color?: string };
type Log = { habitId: string; date: string };
type HabitsData = { habits: Habit[]; logs: Log[] };

function habitColorClass(color?: string): { bg: string; border: string; dot: string } {
  const c = HABIT_COLORS.find((x) => x.name === color) ?? HABIT_COLORS[0];
  return { bg: c.bg, border: c.border, dot: c.dot };
}

const defaultData: HabitsData = { habits: [], logs: [] };

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseData(content: string): HabitsData {
  try {
    const d = JSON.parse(content) as HabitsData;
    return {
      habits: Array.isArray(d.habits) ? d.habits : [],
      logs: Array.isArray(d.logs) ? d.logs : [],
    };
  } catch {
    return defaultData;
  }
}

function isLoggedOn(logs: Log[], habitId: string, dateStr: string): boolean {
  return logs.some((l) => l.habitId === habitId && l.date === dateStr);
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

function dayShortLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const t = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, t)) return "Today";
  const tom = new Date(t);
  tom.setDate(tom.getDate() + 1);
  if (sameDay(d, tom)) return "Tom.";
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
}

export default function HabitsPage() {
  const [data, setData] = useState<HabitsData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHabitColor, setNewHabitColor] = useState<string>(HABIT_COLORS[0].name);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?path=${encodeURIComponent(HABITS_PATH)}&file=1`
      );
      if (res.ok) {
        const json = await res.json();
        setData(parseData(json.content ?? "{}"));
      } else {
        setData(defaultData);
      }
    } catch {
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (newData: HabitsData) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: HABITS_PATH,
          content: JSON.stringify(newData, null, 2),
        }),
      });
      setData(newData);
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleLog = useCallback(
    (habitId: string, dateStr: string) => {
      const logged = isLoggedOn(data.logs, habitId, dateStr);
      const newLogs = logged
        ? data.logs.filter((l) => !(l.habitId === habitId && l.date === dateStr))
        : [...data.logs, { habitId, date: dateStr }];
      save({ habits: data.habits, logs: newLogs });
    },
    [data, save]
  );

  const addHabit = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const id = `h-${Date.now()}`;
    setNewName("");
    save({
      habits: [...data.habits, { id, name, color: newHabitColor }],
      logs: data.logs,
    });
  }, [data, newName, newHabitColor, save]);

  const updateHabit = useCallback(
    (habitId: string, updates: { name?: string; color?: string }) => {
      const habits = data.habits.map((h) =>
        h.id === habitId ? { ...h, ...updates } : h
      );
      save({ habits, logs: data.logs });
      setEditingHabitId(null);
    },
    [data, save]
  );

  const removeHabit = useCallback(
    (habitId: string) => {
      save({
        habits: data.habits.filter((h) => h.id !== habitId),
        logs: data.logs.filter((l) => l.habitId !== habitId),
      });
    },
    [data, save]
  );

  const daysAround = daysAroundToday();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Habits</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Log daily. Data in{" "}
        <code className="rounded bg-muted px-1">{HABITS_PATH}</code>.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Input
          placeholder="New habit"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addHabit()}
        />
        <div className="flex items-center gap-1">
          {HABIT_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              onClick={() => setNewHabitColor(c.name)}
              className={cn(
                "size-6 rounded-full border-2 transition-transform",
                c.bg,
                c.border,
                newHabitColor === c.name && "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
              )}
            />
          ))}
        </div>
        <Button onClick={addHabit} disabled={saving}>
          <PlusIcon className="mr-1 size-4" />
          Add
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.habits.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No habits yet. Add one above to start tracking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FlameIcon className="size-4 text-amber-500" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.habits.map((h) => {
                const logged = isLoggedOn(data.logs, h.id, todayStr());
                const style = habitColorClass(h.color);
                const isEditing = editingHabitId === h.id;
                return (
                  <div
                    key={h.id}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-lg border px-3 py-2",
                      style.bg,
                      style.border
                    )}
                  >
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <div className="flex gap-0.5">
                          {HABIT_COLORS.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setEditColor(c.name)}
                              className={cn(
                                "size-5 rounded-full border",
                                c.bg,
                                c.border,
                                editColor === c.name && "ring-2 ring-foreground"
                              )}
                            />
                          ))}
                        </div>
                        <Button size="sm" className="h-7" onClick={() => updateHabit(h.id, { name: editName.trim(), color: editColor })}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingHabitId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex items-center gap-2 font-medium">
                          <span className={cn("size-2.5 rounded-full shrink-0", style.dot)} />
                          {h.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={logged}
                              onChange={() => toggleLog(h.id, todayStr())}
                              disabled={saving}
                              className="size-4 rounded border-input"
                            />
                            <span className="text-sm text-muted-foreground">
                              {logged ? "Done" : "Log"}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingHabitId(h.id);
                              setEditName(h.name);
                              setEditColor(h.color ?? HABIT_COLORS[0].name);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHabit(h.id)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Week view</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1.5 justify-center">
                {daysAround.map((d) => (
                  <div key={d} className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-muted-foreground" title={d}>
                      {dayShortLabel(d)}
                    </span>
                    {data.habits.map((h) => {
                      const checked = isLoggedOn(data.logs, h.id, d);
                      const style = habitColorClass(h.color);
                      return (
                        <label key={h.id} className="cursor-pointer" title={`${h.name} ${d}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLog(h.id, d)}
                            disabled={saving}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              "block size-4 rounded-sm border",
                              checked ? style.dot : "bg-muted/50 border-transparent"
                            )}
                          />
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
