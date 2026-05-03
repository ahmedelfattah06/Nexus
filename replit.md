# Nexus — AI-Powered Productivity Workspace

## Overview

Full-stack Notion alternative for developers and students. Built as a pnpm monorepo with React+Vite frontend, Express 5 API server, PostgreSQL database, Clerk authentication, and Claude AI ("Nex" assistant).

## Architecture

```
artifacts/
  nexus/          — React+Vite frontend (port via $PORT, preview at /)
  api-server/     — Express 5 REST API (port via $PORT, routed at /api)
  mockup-sandbox/ — Component preview server
lib/
  db/                         — Drizzle ORM schema + migrations
  api-spec/                   — OpenAPI spec (openapi.yaml) + Orval codegen
  api-zod/                    — Generated Zod validation schemas
  api-client-react/           — Generated React Query hooks + TypeScript types
  integrations-anthropic-ai/  — Anthropic Claude client via Replit AI proxy
```

## Tech Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9
- **Frontend**: React 19, Vite, TailwindCSS v4, shadcn/ui
- **Backend**: Express 5, Node 24, Pino logging
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk v6 (`@clerk/react`, `@clerk/express`)
- **AI**: Anthropic claude-sonnet-4-6 via Replit AI Integrations (SSE streaming)
- **API codegen**: Orval from OpenAPI spec → React Query hooks + Zod schemas
- **Validation**: Zod v4, drizzle-zod

## Design System

- **Fonts**: Inter (EN body), Cairo (AR body), Cormorant Garamond (EN serif headings)
- **Colors**: Warm gold `#D4890A` (primary), teal accent, cream background
- **Modes**: Dark/light toggle (CSS variables via `data-theme`)
- **i18n**: Full Arabic/English with RTL layout switching (`LanguageContext`, `localStorage`)

## Features

### Core
- **Daily Cockpit** — dashboard with stats, streaks, daily AI quote, quick links
- **Workspaces** — organize notes by project/topic
- **Pages Editor** — rich text notes within workspaces
- **Kanban Tasks** — per-workspace task boards with drag & drop
- **Code Snippets** — personal snippet library with language filter
- **Focus Mode** — Pomodoro timer with session recording
- **Nex AI** — Claude-powered chat assistant with streaming SSE

### Productivity
- **Habit Tracker** — daily check-in, streaks, color/icon customization
- **Goals** — title/description/date/progress/status tracking
- **Mood Tracker** — 1–5 scale with notes and history
- **Analytics** — weekly focus bar chart, session stats

### Knowledge
- **Bookmarks** — save links with tags, favicon display, search
- **Reading List** — want-to-read/reading/completed with progress slider
- **Flashcards** — sets with card flip study mode

## Key Updates

- Ownership checks are enforced on user-owned resources.
- List endpoints use paginated `{ data, pagination }` responses where applicable.
- AI routes include rate limiting, quote caching, and SSE cleanup on disconnect.
- Habit streaks are calculated from `habit_logs` and duplicate daily mood entries are blocked.
- Database indexes and cascade deletes are in place for the main user-owned tables.

## Key Commands

```bash
pnpm run typecheck            # full typecheck (builds libs first)
pnpm run typecheck:libs       # build composite libs (api-zod, etc.)
pnpm --filter @workspace/api-spec run codegen   # regenerate hooks from OpenAPI
pnpm --filter @workspace/db run push            # push schema to DB (dev only)
```

## CSS Rule

Google Fonts `@import url(...)` MUST be the very first line in index.css, before `@import "tailwindcss"`.
