# OpenClaw Dashboard

Local-first **second brain** UI for your [OpenClaw](https://openclaw.ai/) workspace. It uses the **same workspace root** as OpenClaw and reads/writes the same files—documents, journal, calendar, habits, tasks, goals, trades, research, social posts, creator ops, BI, and chat—so you can view and manage everything from one place.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app uses a **dark theme** by default.

## Configuration

- **Workspace path** (optional): Set `DASHBOARD_WORKSPACE` or `OPENCLAW_WORKSPACE` if your OpenClaw workspace is not at `~/.openclaw/workspace`. Example: `DASHBOARD_WORKSPACE=C:\Users\You\.openclaw\workspace`
- **Chat** (optional): To talk to the agent from the dashboard, set:
  - `OPENCLAW_GATEWAY_URL` — default `http://127.0.0.1:18789`
  - `OPENCLAW_GATEWAY_TOKEN` or `OPENCLAW_GATEWAY_PASSWORD` — your Gateway auth token  
  Enable the OpenResponses endpoint in OpenClaw: `gateway.http.endpoints.responses.enabled: true` in your OpenClaw config.

## Features

### Core

- **Morning Brief** (`/`) — Focus line, habits (week view), goals, tasks summary, today’s journal, and recent docs in a 3-column layout. Focus is stored in `Dashboard/focus.txt`.
- **Documents** (`/documents`) — File tree and editor for the full workspace (same folder as OpenClaw). New file, delete, move; recent docs are remembered for Quick Open.
- **Journal** (`/journal`) — Daily entries from `memory/YYYY-MM-DD.md`; create today’s entry when missing; open any day in the editor.
- **Calendar** (`/calendar`) — Monthly view; events in `Dashboard/calendar.json`. Add/remove events; drag to reschedule. Events stay in sync with task due dates and goals; event colors reflect goal status.
- **Habits** (`/habits`) — Habit list and week log; data in `Dashboard/habits.json`.
- **Tasks** (`/tasks`) — GTD board from `Dashboard/TASKS.md`: columns **Not Started**, **In Progress**, **Done** (or view by goal). Add, toggle done, edit, drag between columns. Tasks support due dates and goal links; due dates sync to the calendar.
- **Goals** (`/goals`) — Kanban from `Dashboard/goals.json`: **Planning**, **In Progress**, **Done**. Target dates, task progress, linked tasks; add tasks from a goal; calendar events stay in sync.
- **Trading** (`/trading`) — Trade log in `Dashboard/trades.json`; link to full journal in Documents (`Dashboard/trade-journal.md`).
- **Playground** (`/playground`) — Node-based canvas; state in `Dashboard/canvas.json`.

### Specialist / agent surfaces

- **Research** (`/research`) — Lists markdown files in the workspace `research/` folder (e.g. `research/{topic}_{date}.md`). Create new research docs and open them in Documents.
- **Social Media** (`/social-media`) — Kanban for posts: **Draft** → **In review** → **Scheduled** → **Published**. Data in `Dashboard/social-posts.json`. Platform filter, character count, duplicate post, and a small “upcoming” schedule strip.
- **Creator Ops** (`/creator-ops`) — Three kanban tabs: **Pipelines** (Outreach → In conversation → Negotiation → Closed), **Partnerships** (Prospecting → Active → Closed), **Offers** (Draft → Live → Expired). Data in `Dashboard/creator-ops.json`.
- **Business Intelligence** (`/business-intelligence`) — **Reports** kanban (Draft → In progress → Published), **KPIs** as value/target cards with progress bars, **Opportunities** kanban (Idea → Evaluating → Pursuing → Won → Lost). Data in `Dashboard/bi.json`.

### Chat & navigation

- **Chat** (`/chat`) — Message your OpenClaw agent with streaming. History is persisted in `Dashboard/chat-history.json` (no localStorage). Requires Gateway env and OpenResponses enabled.
- **Quick Open** — ⌘K / Ctrl+K to jump to any page or a recent document.

## Data locations (workspace)

All app data lives under the workspace root. App-specific state uses the `Dashboard/` prefix:

| Path | Purpose |
|------|--------|
| `Dashboard/focus.txt` | Single line: current focus (Brief). |
| `Dashboard/habits.json` | Habits and logs. |
| `Dashboard/TASKS.md` | GTD task list (Not Started, In Progress, Done). |
| `Dashboard/goals.json` | Goals (Planning, In Progress, Done). |
| `Dashboard/calendar.json` | Calendar events. |
| `Dashboard/trades.json` | Trading log. |
| `Dashboard/trade-journal.md` | Trading journal. |
| `Dashboard/canvas.json` | Playground canvas. |
| `Dashboard/chat-history.json` | Chat message history. |
| `Dashboard/social-posts.json` | Social Media posts. |
| `Dashboard/creator-ops.json` | Creator Ops pipelines, partnerships, offers. |
| `Dashboard/bi.json` | BI reports, KPIs, opportunities. |
| `memory/YYYY-MM-DD.md` | Daily journal. |
| `research/` | Research outputs (e.g. `research/{topic}_{date}.md`). |

See **AGENTS.md** for full paths, file formats, and how agents (e.g. OpenClaw) should read/write these files.

## Tech

- **Stack**: Next.js 16 (App Router), TypeScript, Tailwind 4, shadcn/ui.
- **State**: No database—all state is file-based under the workspace directory.
- **API**: Workspace API (`/api/workspace`) for list/read/write/delete/move; Chat API (`/api/chat`) forwards to the OpenClaw Gateway Responses API.
