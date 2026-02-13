---
name: openclaw-dashboard
description: Understand and operate the OpenClaw Dashboard—the workspace UI that shares the same files as OpenClaw. Use when (1) the user asks about the dashboard, (2) you need to read or update data that the dashboard displays (focus, tasks, goals, calendar, habits, journal, trading, research, social posts, creator ops, BI, chat history), (3) you need to create or edit files under Dashboard/ or memory/ or research/ so they appear correctly in the dashboard, or (4) you need to explain where something lives or how to use a dashboard page. Agent behavior and identity are defined by DASHBOARD_WORKFLOW.md (Daemon, COS, specialists, authority levels); this skill provides dashboard data and paths.
---

# OpenClaw Dashboard

**You operate exactly as described in DASHBOARD_WORKFLOW.md** (identity: Daemon; COS vs specialists; authority levels; communication protocol; anti-patterns). This skill covers only **dashboard data and paths**—where files live and how to read/write them so the dashboard UI stays correct.

The **OpenClaw Dashboard** is a local-first web UI that uses the **same workspace root** as OpenClaw. It does not use a database: every screen reads and writes **files in the workspace**. When you read, write, or edit those files with your tools (as the appropriate specialist or under COS delegation), the dashboard shows the result (after the user refreshes or the UI refetches).

## When to use this skill

- User asks what the dashboard is, how it works, or how to use a specific page.
- You need to **update data the dashboard shows** (e.g. add a task, set focus, add a calendar event, log a habit, add a post, move an opportunity).
- You need to **create or edit files** so they appear correctly in the dashboard (e.g. create `research/topic_2025-02-07.md`, update `Dashboard/goals.json`).
- User says something is "wrong on the dashboard" or "not showing"—check the correct path and format (see references/paths-and-formats.md).

## Workspace layout (summary)

- **App data prefix**: `Dashboard/` (all app state lives here).
- **Journal**: `memory/YYYY-MM-DD.md` (one file per day; no `Dashboard/` prefix).
- **Research**: `research/{topic}_{date}.md` (Research agent and Research page).
- Paths are **relative to the workspace root** (same as OpenClaw). No `mission-control/`; do not use paths outside the workspace root.

For the full list of paths and file formats, see [references/paths-and-formats.md](references/paths-and-formats.md).

## How to operate from the agent side

1. **Read** any `Dashboard/*` or `memory/*` or `research/*` file with your **read** (or workspace) tool.
2. **Write/update** with **write** or **edit** or **apply_patch**. Use the **exact formats** the dashboard expects (see references/paths-and-formats.md)—otherwise the UI may break or not show the data.
3. **Do not** rely on localStorage; the dashboard uses it only for "recent docs" in the browser. All persistent data is in workspace files.
4. **Chat**: Messages sent from the dashboard are stored in `Dashboard/chat-history.json` and sent to the Gateway; you see them in session context. To inject or fix history programmatically, write to `Dashboard/chat-history.json` with the same JSON shape.

## Dashboard pages → files (quick map)

| Page | Main file(s) |
|------|----------------|
| Morning Brief | `Dashboard/focus.txt`, `Dashboard/habits.json`, `Dashboard/goals.json`, `Dashboard/TASKS.md`, `memory/YYYY-MM-DD.md` |
| Calendar | `Dashboard/calendar.json`, `Dashboard/goals.json` |
| Goals | `Dashboard/goals.json`, `Dashboard/TASKS.md`, `Dashboard/calendar.json` |
| Tasks | `Dashboard/TASKS.md`, `Dashboard/goals.json`, `Dashboard/calendar.json` |
| Journal | `memory/YYYY-MM-DD.md` |
| Habits | `Dashboard/habits.json` |
| Trading | `Dashboard/trades.json`, `Dashboard/trade-journal.md` |
| Playground | `Dashboard/canvas.json` |
| Research | `research/*.md` (list dir; create `research/{topic}_{date}.md`) |
| Social Media | `Dashboard/social-posts.json` (posts with status: draft, in_review, scheduled, published) |
| Creator Ops | `Dashboard/creator-ops.json` (pipelines, partnerships, offers with stage/status) |
| Business Intelligence | `Dashboard/bi.json` (reports, kpis, opportunities; reports/opportunities have status) |
| Chat | `Dashboard/chat-history.json` |

## Rules

- **Paths**: Always use the `Dashboard/` prefix for app data; journal in `memory/`; research in `research/`. Never introduce `mission-control/` or absolute paths that escape the workspace.
- **Formats**: Preserve the expected JSON structure and task line format (see references). For example, `Dashboard/TASKS.md` uses GTD sections and optional ` | due:YYYY-MM-DD | goal:goalId` on lines; `Dashboard/goals.json` expects `{ goals: [ { id, name, status?, targetDate?, color?, ... } ] }`.
- **No database**: The dashboard has no separate DB; if you need to add a new "dashboard feature" that stores data, add a new file under `Dashboard/` and document it in the project’s AGENTS.md and in references/paths-and-formats.md.

## References

- **Paths and formats**: [references/paths-and-formats.md](references/paths-and-formats.md) — full table of paths, JSON shapes, and task/journal conventions. Load when you need exact field names or formats.
