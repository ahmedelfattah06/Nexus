# Nexus — AI-Powered Productivity Workspace

## Overview

Full-stack Notion alternative for developers and students. Built as a pnpm monorepo with React+Vite frontend, Express 5 API server, PostgreSQL database, Clerk authentication, and Claude AI ("Nex" assistant).

## Architecture

```
artifacts/
  nexus/          — React+Vite frontend (port via $PORT, preview at /)
  api-server/     — Express 5 REST API (port 8080, routed at /api)
  mockup-sandbox/ — Component preview server (port 8081)
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

- **Fonts**: Cormorant Garamond (serif headings) + DM Sans (body)
- **Colors**: Warm gold `#D4890A` (primary), teal accent, cream background
- **Modes**: Dark/light toggle (CSS variables via `data-theme`)

## Features

- **Daily Cockpit** — dashboard with stats, streaks, recent activity
- **Workspaces** — organize notes by project/topic
- **Pages Editor** — rich text notes within workspaces
- **Kanban Tasks** — per-workspace task boards with status columns
- **Code Snippets** — personal snippet library with language filter
- **Focus Mode** — Pomodoro timer with session recording
- **Nex AI** — Claude-powered chat assistant with streaming SSE

## Key Schema Facts (ground truth for API/frontend)

- `CreateWorkspaceBody`: `name`, `icon`, `color` — NO description
- `CreateSnippetBody`: `language`, `code`, `description` — NO title (description is the label)
- `CreateSessionBody`: `duration` (minutes int), `focusScore`, `tasksCompleted`, `date?` (ISO string)
- `FocusSession.date`: `string` (ISO date-time) in TypeScript interface
- `Workspace` type: no `description` field

## Clerk API Notes (v6)

- Use `Show when="signed-in"` / `Show when="signed-out"` (NOT `SignedIn`/`SignedOut` components)
- `publishableKeyFromHost` from `@clerk/react/internal`
- `UserButton` has no `afterSignOutUrl` prop — remove it

## Key Commands

```bash
pnpm run typecheck            # full typecheck (builds libs first)
pnpm run typecheck:libs       # build composite libs (api-zod, etc.)
pnpm --filter @workspace/api-spec run codegen   # regenerate hooks from OpenAPI
pnpm --filter @workspace/db run push            # push schema to DB (dev only)
```

## CSS Rule

Google Fonts `@import url(...)` MUST be the very first line in index.css, before `@import "tailwindcss"`.
