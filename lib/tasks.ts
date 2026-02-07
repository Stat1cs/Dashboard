/**
 * Shared task model and helpers for TASKS.md (GTD-style sections).
 * Task lines support optional metadata: | due:YYYY-MM-DD | goal:goalId
 */

export const TASKS_PATH = "Dashboard/TASKS.md";

export const TASK_SECTIONS = ["Not Started", "In Progress", "Done"] as const;
export type TaskSection = (typeof TASK_SECTIONS)[number];

export type TaskMeta = { due?: string; goalId?: string };

export type TaskLine = {
  section: TaskSection;
  index: number;
  raw: string;
  title: string;
  done: boolean;
  due?: string;
  goalId?: string;
};

function getBase(line: string): string {
  return line
    .replace(/^\[\s?x?\s?\]\s+/i, "")
    .replace(/~~/g, "")
    .trim();
}

export function parseTaskMeta(line: string): TaskMeta {
  const base = getBase(line);
  const pipe = base.indexOf(" | ");
  if (pipe < 0) return {};
  const rest = base.slice(pipe + 3);
  const meta: TaskMeta = {};
  for (const p of rest.split(" | ")) {
    const [key, val] = p.split(":").map((s) => s?.trim() ?? "");
    if (key === "due" && val) meta.due = val;
    if (key === "goal" && val) meta.goalId = val;
  }
  return meta;
}

export function taskTitle(line: string): string {
  const base = getBase(line);
  const pipe = base.indexOf(" | ");
  return pipe >= 0 ? base.slice(0, pipe).trim() : base;
}

export function isTaskDone(line: string): boolean {
  return /^\[x\]/i.test(line);
}

export function buildTaskLine(checked: boolean, title: string, due?: string, goalId?: string): string {
  const prefix = checked ? "[x] ~~" : "[ ] ";
  const suffix = [due ? `due:${due}` : "", goalId ? `goal:${goalId}` : ""].filter(Boolean).join(" | ");
  const main = title.replace(/~~/g, "");
  if (!suffix) return prefix + main + (checked ? "~~" : "");
  return prefix + main + (checked ? "~~" : "") + " | " + suffix;
}

export function parseTasksMd(content: string): Record<TaskSection, string[]> {
  const sections: Record<string, string[]> = {};
  let current: TaskSection = "Not Started";
  for (const line of content.split("\n")) {
    const header = line.match(/^##\s+(.+)$/);
    if (header) {
      const title = header[1].trim();
      if (TASK_SECTIONS.includes(title as TaskSection)) {
        current = title as TaskSection;
        if (!sections[current]) sections[current] = [];
      }
      continue;
    }
    const task = line.match(/^-\s+\[([ x])\]\s+(.+)$/i);
    if (task) {
      if (!sections[current]) sections[current] = [];
      sections[current].push(`${task[1] === "x" ? "[x]" : "[ ]"} ${task[2].trim()}`);
    }
  }
  TASK_SECTIONS.forEach((s) => {
    if (!sections[s]) sections[s] = [];
  });
  return sections as Record<TaskSection, string[]>;
}

export function serializeTasksMd(sections: Record<TaskSection, string[]>): string {
  const lines = ["# Tasks", ""];
  TASK_SECTIONS.forEach((title) => {
    lines.push(`## ${title}`, "");
    (sections[title] ?? []).forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  });
  return lines.join("\n");
}

/** All task lines with section and index */
export function allTaskLines(sections: Record<TaskSection, string[]>): TaskLine[] {
  const out: TaskLine[] = [];
  TASK_SECTIONS.forEach((section) => {
    (sections[section] ?? []).forEach((raw, index) => {
      const meta = parseTaskMeta(raw);
      out.push({
        section,
        index,
        raw,
        title: taskTitle(raw),
        done: isTaskDone(raw),
        due: meta.due,
        goalId: meta.goalId,
      });
    });
  });
  return out;
}

/** Tasks that belong to a goal (or no goal when goalId is null) */
export function tasksForGoal(sections: Record<TaskSection, string[]>, goalId: string | null): TaskLine[] {
  return allTaskLines(sections).filter((t) => (goalId ? t.goalId === goalId : !t.goalId));
}

/** Count done vs total for a goal */
export function goalProgress(sections: Record<TaskSection, string[]>, goalId: string): { done: number; total: number } {
  const tasks = tasksForGoal(sections, goalId);
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length };
}
