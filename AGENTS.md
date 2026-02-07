# OpenClaw Dashboard — Agent Setup & Project Guide

This document helps AI agents (including OpenClaw) understand the project, set it up correctly, and follow its conventions.

---

## 1. What This Project Is

- **Name**: OpenClaw Dashboard (repo may still be named "mission-control").
- **Role**: Local-first “second brain” dashboard for the [OpenClaw](https://openclaw.ai/) workspace. It reads and writes the **same files** OpenClaw uses (documents, journal, calendar, habits, tasks, goals, etc.) so users can manage everything from one place.
- **Stack**: Next.js 16 (App Router), TypeScript, Tailwind 4, shadcn/ui. **No database** — all state lives as files under a single workspace directory.

---

## 2. Workspace & Data Layout

### Workspace root

- The app uses a **workspace root** directory. All paths in code are **relative to this root**.
- Resolution order:
  1. `DASHBOARD_WORKSPACE` (if set)
  2. Else `OPENCLAW_WORKSPACE` (if set)
  3. Else `~/.openclaw/workspace` (or `%USERPROFILE%\.openclaw\workspace` on Windows)
- Example (custom root):  
  `DASHBOARD_WORKSPACE=C:\Users\You\.openclaw\workspace`

### App data prefix: `Dashboard/`

All app-specific data lives under the **`Dashboard/`** prefix inside the workspace (no longer `mission-control/`). Use these paths in code and docs.

| Path | Purpose |
|------|--------|
| `Dashboard/focus.txt` | Single line: current focus (shown on Morning Brief). |
| `Dashboard/habits.json` | Habits and daily logs (`{ habits: [], logs: [] }`). |
| `Dashboard/TASKS.md` | GTD-style task list (sections: Not Started, In Progress, Done). Task lines support `\| due:YYYY-MM-DD \| goal:goalId`. |
| `Dashboard/goals.json` | Goals with status, target dates, colors. |
| `Dashboard/calendar.json` | Calendar events (`{ events: [] }`); events can have `goalId`. |
| `Dashboard/trades.json` | Trading log. |
| `Dashboard/trade-journal.md` | Trading journal. |
| `Dashboard/canvas.json` | Playground node canvas. |
| `Dashboard/untitled.md` | Default path for “New file” when empty. |
| `memory/YYYY-MM-DD.md` | Daily journal entries (outside `Dashboard/`). |

- **Documents**: Users can create/edit any file under the workspace; “recent docs” are stored in **localStorage** under the key **`dashboard-recent-docs`** (not `mission-control-recent-docs`).

---

## 3. How to Run & Configure

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default theme is dark.

### Environment variables

| Variable | Purpose |
|----------|--------|
| `DASHBOARD_WORKSPACE` or `OPENCLAW_WORKSPACE` | Workspace root (overrides default `~/.openclaw/workspace`). |
| `OPENCLAW_GATEWAY_URL` | OpenClaw Gateway URL (default `http://127.0.0.1:18789`). |
| `OPENCLAW_GATEWAY_TOKEN` or `OPENCLAW_GATEWAY_PASSWORD` | Gateway auth for Chat. |
| `OPENCLAW_AGENT_ID` | Agent ID for chat (default `main`). |

Chat requires Gateway token and OpenResponses enabled in OpenClaw config:  
`gateway.http.endpoints.responses.enabled: true`.

---

## 4. API Surface

- **Workspace API** (`/api/workspace`):
  - **GET** `?path=<relativePath>` — list directory; `&file=1` returns file content + mtime.
  - **PUT** — body `{ path, content }` — create/overwrite file.
  - **DELETE** `?path=<relativePath>` — delete file.
  - **PATCH** — body `{ from, to }` — move/rename.
  All paths are validated to stay under the workspace root (no `..` or absolute escape).

- **Chat API** (`/api/chat`, POST): forwards to OpenClaw Gateway (Responses API); `user` is set to `"dashboard"`.

---

## 5. Conventions & Best Practices

- **Paths**: Use the **`Dashboard/`** prefix for all app data paths (see table above). Do not introduce `mission-control/` in new code.
- **localStorage**: Use **`dashboard-recent-docs`** for recent documents list (shared by Documents and Quick Open).
- **Drag-and-drop MIME type**: Use **`application/x-dashboard-path`** for path data in file-tree drag/drop (see `components/dashboard/file-tree.tsx`).
- **Shared logic**: Task parsing/serialization lives in **`lib/tasks.ts`** (`TASKS_PATH`, `parseTasksMd`, `serializeTasksMd`, etc.). Goal colors and helpers live in **`lib/goals.ts`** (`GOAL_COLOR_PALETTE`, `goalBorderClass`, `goalCardClass`, `goalPillClass`). Use these instead of duplicating.
- **No Convex**: This app is file-based only; do not add Convex or other DB unless the product direction changes.
- **Path validation**: All user/client-provided paths must go through the workspace API; the server uses `validatePath` and `resolveWorkspaceRoot()` from `lib/workspace.ts`.

---

## 6. Feature Map (for context)

- **Morning Brief** (dashboard home): Focus, Habits (week view), Goals, Tasks, Today’s Journal, Recent docs (3-column layout).
- **Documents**: File tree, editor, new file, delete, move; recent docs in localStorage.
- **Journal**: Daily notes under `memory/YYYY-MM-DD.md`.
- **Calendar**: Events from `Dashboard/calendar.json`; sync with task due dates and goals.
- **Habits**: Log and week view; data in `Dashboard/habits.json`.
- **Tasks**: `Dashboard/TASKS.md`; kanban by status or by goal; due dates and goal links.
- **Goals**: `Dashboard/goals.json`; kanban (Planning / In Progress / Done); linked tasks and calendar.
- **Chat**: Streaming chat with OpenClaw agent via Gateway.
- **Quick Open**: ⌘K / Ctrl+K; recent docs from `dashboard-recent-docs`.

---

## 7. Setup Checklist for an Agent

1. Ensure Node 20+ and `npm install` in the project root.
2. Set workspace root if not using default: `DASHBOARD_WORKSPACE` or `OPENCLAW_WORKSPACE`.
3. Create `Dashboard/` (and optionally `memory/`) under the workspace root if missing; create initial files (e.g. `Dashboard/goals.json` with `{ "goals": [] }`, `Dashboard/habits.json` with `{ "habits": [], "logs": [] }`, etc.) as needed.
4. For Chat: set `OPENCLAW_GATEWAY_TOKEN` (or `OPENCLAW_GATEWAY_PASSWORD`) and enable OpenResponses in OpenClaw.
5. Run `npm run dev` and open the app; confirm Documents can list and edit files under the workspace.
6. When editing code, use **`Dashboard/`** for all app data paths and **`dashboard-recent-docs`** for recent-docs localStorage; follow `lib/tasks.ts` and `lib/goals.ts` for shared behavior.
