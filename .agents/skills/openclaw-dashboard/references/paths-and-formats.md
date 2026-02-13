# Dashboard paths and formats

Use this when you need exact paths or JSON/format conventions so dashboard data parses correctly.

## Workspace root

Same as OpenClaw. Resolution: `DASHBOARD_WORKSPACE` or `OPENCLAW_WORKSPACE` or `~/.openclaw/workspace` (Windows: `%USERPROFILE%\.openclaw\workspace`). All paths below are relative to this root.

## Paths

| Path | Purpose |
|------|--------|
| `Dashboard/focus.txt` | Single line; current focus (Morning Brief). |
| `Dashboard/habits.json` | `{ habits: [{ id, name, color? }], logs: [{ habitId, date }] }`. Date: YYYY-MM-DD. |
| `Dashboard/TASKS.md` | GTD sections: Not Started, In Progress, Done. See task line format below. |
| `Dashboard/goals.json` | `{ goals: [{ id, name, status?, targetDate?, color?, milestones?, createdAt }] }`. status: Planning \| In Progress \| Done. |
| `Dashboard/calendar.json` | `{ events: [{ id, title, date, type?, color?, goalId? }] }`. date: YYYY-MM-DD. |
| `Dashboard/trades.json` | Trading log (array of trade objects with id, symbol, side, date, notes?, createdAt). |
| `Dashboard/trade-journal.md` | Free-form markdown. |
| `Dashboard/canvas.json` | Playground canvas (app-specific schema). |
| `Dashboard/chat-history.json` | `{ messages: [{ role: "user" \| "assistant", content }] }`. |
| `Dashboard/social-posts.json` | `{ posts: [{ id, platform?, content, status, scheduledAt?, publishedAt?, createdAt }] }`. status: draft \| in_review \| scheduled \| published. |
| `Dashboard/creator-ops.json` | `{ pipelines: [], partnerships: [], offers: [] }`. Pipeline: { id, name, stage, notes? }. stage: Outreach \| In conversation \| Negotiation \| Closed. Partnership: { id, name, status, notes? }. status: Prospecting \| Active \| Closed. Offer: { id, title, status, notes? }. status: Draft \| Live \| Expired. |
| `Dashboard/bi.json` | `{ reports: [], kpis: [], opportunities: [] }`. Report: { id, title, date, summary?, status? }. status: Draft \| In progress \| Published. Kpi: { id, name, value?, target? }. Opportunity: { id, title, type?, notes?, status? }. status: Idea \| Evaluating \| Pursuing \| Won \| Lost. |
| `Dashboard/untitled.md` | Default path for new file in Documents. |
| `memory/YYYY-MM-DD.md` | Daily journal; one file per day. |
| `MEMORY.md` | Optional long-term memory. |
| `research/` | Research docs; create e.g. `research/{topic}_{date}.md`. |

## Task line format (TASKS.md)

- Sections headed by `## Not Started`, `## In Progress`, `## Done`.
- Each task line: `[ ] Title` or `[x] ~~Title~~` with optional trailing ` | due:YYYY-MM-DD | goal:goalId`.
- Example: `[ ] Ship feature X | due:2025-02-15 | goal:g-123`.

## Goal colors

Use a consistent palette if adding goals; the dashboard maps color names to UI (e.g. emerald, amber, rose, cyan, sky, fuchsia, violet, blue). Store as `color` string on the goal object.

## Calendar events

- `date`: YYYY-MM-DD. `id`: unique string. `title`: string. Optional: `type`, `color`, `goalId`. Creating an event from a task due date often uses the task title and the task’s goalId if present.

## Chat history

Append new messages to the `messages` array; each item `{ role: "user" | "assistant", content: string }`. The Chat page loads this file on open; the dashboard also sends user messages to the Gateway (Responses API), so the agent receives them in session.

## Validation

All paths must stay under the workspace root (no `..`, no absolute escape). The dashboard’s Workspace API enforces this; when using read/write/edit, use relative paths from the workspace root.
