# OpenClaw Dashboard

Local-first Second Brain dashboard for your [OpenClaw](https://openclaw.ai/) workspace. View and edit the same documents OpenClaw uses; manage journal, calendar, habits, tasks, goals, and chat with the agent from one place.

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

- **Documents** — Browse and edit workspace files (same folder as OpenClaw). New file, delete file, reload from disk, refresh tree. Recent docs remembered for quick open.
- **Journal** — Daily entries from `memory/YYYY-MM-DD.md`; create today’s entry when missing; open any day in Documents.
- **Morning Brief** — Home page: Focus & Habits, Today’s Journal & Recent docs, Goals & Tasks (3 columns). Shortcuts in each card header.
- **Calendar** — Monthly view; events in `Dashboard/calendar.json`. Add/remove events; drag events to reschedule. Events from tasks (with due dates) and goals stay in sync: moving an event updates the task due date; deleting a task or goal removes its calendar events. Event colors reflect goal status (Planning / In Progress / Done).
- **Habits** — Log habits and week view; data in `Dashboard/habits.json`.
- **Playground** — Node-based canvas (`Dashboard/canvas.json`); draggable nodes, add/link/remove.
- **Tasks** — `Dashboard/TASKS.md` in three columns: **Not Started**, **In Progress**, **Done**. Add, toggle done, edit, move between columns (or view by goal). Tasks can have a due date and optional goal; due dates sync to the calendar.
- **Goals** — Goals in `Dashboard/goals.json`; kanban columns: Planning, In Progress, Done. Target dates, task progress, and linked tasks. Add tasks from a goal (syncs to calendar when due); deleting a goal removes its calendar events. Status colors: grey / amber / green.
- **Trading** — Trade log in `Dashboard/trades.json`; open full journal in Documents.
- **Chat** — Message your OpenClaw agent with streaming (requires Gateway env and OpenResponses enabled).
- **Quick open** — ⌘K / Ctrl+K to jump to a page or a recent document.

## Tech

Next.js 16 (App Router), TypeScript, Tailwind 4, Shadcn. No database — documents and app state live in the workspace directory.
