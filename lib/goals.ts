/**
 * Shared goal color palette and class maps for dashboard, goals page, and calendar.
 * Each goal can have a color name stored in goals.json; we map to Tailwind classes.
 */

export const GOAL_COLOR_PALETTE = ["emerald", "amber", "rose", "cyan", "sky", "fuchsia", "violet", "blue"] as const;
export type GoalColorName = (typeof GOAL_COLOR_PALETTE)[number];

/** Left border / accent for goal cards (e.g. goals kanban, dashboard goal row) */
export const GOAL_COLOR_BORDER: Record<string, string> = {
  violet: "border-l-violet-500",
  blue: "border-l-blue-500",
  emerald: "border-l-emerald-500",
  amber: "border-l-amber-500",
  rose: "border-l-rose-500",
  cyan: "border-l-cyan-500",
  sky: "border-l-sky-500",
  fuchsia: "border-l-fuchsia-500",
};

/** Small dot/pill background for goal label (dashboard, calendar) */
export const GOAL_COLOR_PILL: Record<string, string> = {
  violet: "bg-violet-500/25 text-violet-200 border-violet-500/50",
  blue: "bg-blue-500/25 text-blue-200 border-blue-500/50",
  emerald: "bg-emerald-500/25 text-emerald-200 border-emerald-500/50",
  amber: "bg-amber-500/25 text-amber-200 border-amber-500/50",
  rose: "bg-rose-500/25 text-rose-200 border-rose-500/50",
  cyan: "bg-cyan-500/25 text-cyan-200 border-cyan-500/50",
  sky: "bg-sky-500/25 text-sky-200 border-sky-500/50",
  fuchsia: "bg-fuchsia-500/25 text-fuchsia-200 border-fuchsia-500/50",
};

/** Calendar event block (background + border + text) for goal-linked events */
export const GOAL_COLOR_EVENT: Record<string, string> = {
  violet: "bg-violet-500/25 border-violet-500/50 text-violet-200",
  blue: "bg-blue-500/25 border-blue-500/50 text-blue-200",
  emerald: "bg-emerald-500/25 border-emerald-500/50 text-emerald-200",
  amber: "bg-amber-500/25 border-amber-500/50 text-amber-200",
  rose: "bg-rose-500/25 border-rose-500/50 text-rose-200",
  cyan: "bg-cyan-500/25 border-cyan-500/50 text-cyan-200",
  sky: "bg-sky-500/25 border-sky-500/50 text-sky-200",
  fuchsia: "bg-fuchsia-500/25 border-fuchsia-500/50 text-fuchsia-200",
};

/** Task card (border + light bg) when task is linked to a goal */
export const GOAL_COLOR_CARD: Record<string, string> = {
  violet: "border-violet-500/40 bg-violet-500/10",
  blue: "border-blue-500/40 bg-blue-500/10",
  emerald: "border-emerald-500/40 bg-emerald-500/10",
  amber: "border-amber-500/40 bg-amber-500/10",
  rose: "border-rose-500/40 bg-rose-500/10",
  cyan: "border-cyan-500/40 bg-cyan-500/10",
  sky: "border-sky-500/40 bg-sky-500/10",
  fuchsia: "border-fuchsia-500/40 bg-fuchsia-500/10",
};

export function goalBorderClass(color?: string): string {
  return (color && GOAL_COLOR_BORDER[color]) ? GOAL_COLOR_BORDER[color] : "border-l-muted-foreground";
}

export function goalPillClass(color?: string): string {
  return (color && GOAL_COLOR_PILL[color]) ? GOAL_COLOR_PILL[color] : "bg-muted text-muted-foreground border-border";
}

export function goalEventClass(color?: string): string {
  return (color && GOAL_COLOR_EVENT[color]) ? GOAL_COLOR_EVENT[color] : "bg-muted border-border text-muted-foreground";
}

export function goalCardClass(color?: string): string {
  return (color && GOAL_COLOR_CARD[color]) ? GOAL_COLOR_CARD[color] : "border-violet-500/40 bg-violet-500/10";
}
