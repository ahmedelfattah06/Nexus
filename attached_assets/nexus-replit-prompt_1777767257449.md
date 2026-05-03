# Nexus — Replit AI Prompt: Fix All Issues & Add Missing Features

---

## Context

You are working on **Nexus**, a full-stack productivity workspace app built as a pnpm monorepo. The stack is:

- **Frontend**: React 19 + Vite + TailwindCSS v4 + shadcn/ui + wouter + TanStack Query v5 + Clerk v6
- **Backend**: Node.js 24 + Express 5 + Drizzle ORM + PostgreSQL + Clerk Express v6 + Zod v4 + Pino
- **AI**: Claude (`claude-sonnet-4-6`) via Replit AI proxy
- **Code generation**: Orval reads `lib/api-spec/openapi.yaml` and generates Zod schemas + React Query hooks automatically

Structure:
```
workspace-root/
├── artifacts/nexus/          ← Frontend
├── artifacts/api-server/     ← Backend
├── lib/db/                   ← Drizzle schema + migrations
├── lib/api-spec/             ← openapi.yaml
├── lib/api-zod/              ← generated Zod schemas
└── lib/api-client-react/     ← generated React Query hooks
```

---

## What needs to be done — work through these in order

---

### ISSUE 1 — Authorization: Resource Ownership Checks (CRITICAL SECURITY BUG)

**Problem:** Every route extracts `userId` from Clerk, but there is no check confirming the user *owns* the resource they are trying to read/update/delete. A user who knows another user's workspace ID can currently delete it.

**Fix:** In every route that operates on a specific resource by ID, add an ownership check BEFORE performing the operation. The pattern is: fetch the record, verify `record.userId === userId`, and return 403 if they don't match.

Apply this fix to all of the following route files in `artifacts/api-server/src/routes/`:

- `workspaces.ts` — GET /:id, PATCH /:id, DELETE /:id
- `pages.ts` — GET /:id, PATCH /:id, DELETE /:id
- `tasks.ts` — PATCH /:id, DELETE /:id
- `snippets.ts` — DELETE /:id
- `habits.ts` — DELETE /:id, POST /:id/log, DELETE /:id/log/today
- `bookmarks.ts` — DELETE /:id
- `reading.ts` — PATCH /:id, DELETE /:id
- `flashcards.ts` — GET /:id/cards, POST /:id/cards, DELETE /:id (sets), DELETE /:id (cards)
- `goals.ts` — PATCH /:id, DELETE /:id
- `conversations.ts` (inside `anthropic.ts`) — GET /:id/messages, DELETE /:id

The pattern to implement in each affected route:

```typescript
// Example for PATCH /workspaces/:id
const workspace = await db.query.workspaces.findFirst({
  where: eq(workspaces.id, parseInt(req.params.id))
});

if (!workspace) {
  return res.status(404).json({ error: 'Not found' });
}

if (workspace.userId !== userId) {
  return res.status(403).json({ error: 'Forbidden' });
}

// proceed with update...
```

Also make sure that when fetching workspace pages or tasks, the parent workspace is verified to belong to the requesting user.

---

### ISSUE 2 — Centralized Error Handling Middleware

**Problem:** There is no consistent error handling. Each route handles errors differently (or not at all), making debugging hard and exposing raw errors to clients.

**Fix:** Create `artifacts/api-server/src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger'; // use existing Pino instance
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  if (err instanceof Error) {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.status(500).json({ error: 'Unknown error' });
}
```

Then register it in `artifacts/api-server/src/index.ts` as the LAST middleware:

```typescript
import { errorHandler } from './middleware/errorHandler';
// ... after all routes:
app.use(errorHandler);
```

Also wrap every async route handler with a try/catch that calls `next(err)` instead of swallowing errors or sending raw error messages. Go through all files in `artifacts/api-server/src/routes/` and ensure every async handler follows this pattern:

```typescript
router.get('/', async (req, res, next) => {
  try {
    // ... handler logic
  } catch (err) {
    next(err);
  }
});
```

---

### ISSUE 3 — Pagination for List Endpoints

**Problem:** All GET list endpoints return ALL records with no limit. This will break when users have large amounts of data.

**Fix:** Add cursor-based or offset pagination to the following endpoints:

- `GET /api/bookmarks`
- `GET /api/flashcard-sets`
- `GET /api/flashcard-sets/:id/cards`
- `GET /api/reading`
- `GET /api/habits`
- `GET /api/goals`
- `GET /api/moods`
- `GET /api/nex/conversations`
- `GET /api/nex/conversations/:id/messages`
- `GET /api/snippets`

Use simple offset pagination with a default limit of 50:

**Query params:** `?page=1&limit=50` (page is 1-indexed, limit max is 100)

**Response shape** (wrap existing array responses):

```typescript
{
  data: [...],
  pagination: {
    page: 1,
    limit: 50,
    total: 243,
    totalPages: 5,
    hasNextPage: true,
    hasPrevPage: false
  }
}
```

**Implementation pattern for each route:**

```typescript
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
const offset = (page - 1) * limit;

const [items, countResult] = await Promise.all([
  db.select().from(table)
    .where(eq(table.userId, userId))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(table.createdAt)),
  db.select({ count: count() }).from(table)
    .where(eq(table.userId, userId))
]);

const total = countResult[0]?.count ?? 0;
const totalPages = Math.ceil(total / limit);

res.json({
  data: items,
  pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }
});
```

After updating the backend, update `lib/api-spec/openapi.yaml` to add `page` and `limit` query parameters to all affected endpoints, and update the response schemas to include the `pagination` object wrapper. Then re-run codegen:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Update the frontend pages that use these hooks to handle the new response shape (`data.data` instead of `data` for the array).

---

### ISSUE 4 — Daily Quote Caching

**Problem:** The daily quote endpoint calls Claude on every request. There is no caching implementation.

**Fix:** Implement in-memory caching in `artifacts/api-server/src/routes/anthropic.ts`:

```typescript
interface CacheEntry {
  quote: { quote: string; author: string };
  expiresAt: number;
}

const quoteCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Inside GET /daily-quote handler:
const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
const cacheKey = `daily-quote:${userId}:${today}`;

const cached = quoteCache.get(cacheKey);
if (cached && cached.expiresAt > Date.now()) {
  return res.json(cached.quote);
}

// ... call Claude ...
const result = { quote, author };

quoteCache.set(cacheKey, {
  quote: result,
  expiresAt: Date.now() + CACHE_TTL_MS
});

res.json(result);
```

Also add a cleanup to prevent memory leaks — purge expired entries every hour:

```typescript
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of quoteCache.entries()) {
    if (entry.expiresAt < now) quoteCache.delete(key);
  }
}, CACHE_TTL_MS);
```

---

### ISSUE 5 — Habit Streak Algorithm

**Problem:** The streak calculation is not implemented — the docs say "it's calculated from habit_logs" but give no algorithm.

**Fix:** Implement the streak calculation in `artifacts/api-server/src/routes/habits.ts`. Add a helper function:

```typescript
function calculateStreak(logs: { date: string }[]): number {
  if (logs.length === 0) return 0;

  // Sort dates descending
  const dates = logs
    .map(l => l.date)
    .sort((a, b) => b.localeCompare(a));

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday to be "active"
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
```

In `GET /api/habits`, fetch all habit_logs for each habit and include the computed streak in the response:

```typescript
// For each habit, fetch its logs and compute streak
const habitsWithStreak = await Promise.all(
  habits.map(async (habit) => {
    const logs = await db.select({ date: habitLogs.date })
      .from(habitLogs)
      .where(eq(habitLogs.habitId, habit.id))
      .orderBy(desc(habitLogs.date));

    return {
      ...habit,
      streak: calculateStreak(logs),
      completedToday: logs[0]?.date === new Date().toISOString().split('T')[0]
    };
  })
);

res.json(habitsWithStreak);
```

Update `lib/api-spec/openapi.yaml` to reflect that the habit response now includes `streak: integer` and `completedToday: boolean`.

---

### ISSUE 6 — Drag & Drop Library for Kanban

**Problem:** The Kanban tasks page claims to support drag & drop, but no DnD library is listed in the frontend dependencies.

**Fix:** Install and implement `@dnd-kit/core` and `@dnd-kit/sortable` (preferred over react-beautiful-dnd because it's actively maintained and supports React 19):

```bash
pnpm --filter @workspace/nexus add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

In `artifacts/nexus/src/pages/tasks.tsx`, implement drag and drop between columns using:

```typescript
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

Wrap the three columns in `<DndContext>`. Each task card should use `useSortable`. On `onDragEnd`, call `PATCH /api/tasks/:id` with the new `status` value matching the column it was dropped into (`'todo'`, `'in_progress'`, or `'done'`).

---

### ISSUE 7 — Database: Add Missing Indexes and Cascade Deletes

**Problem:** The Drizzle schema has no indexes on `userId` columns and no cascade delete rules. This causes slow queries and orphaned records when a workspace is deleted.

**Fix:** Update `lib/db/src/schema.ts` to add:

**Indexes on userId** (for every table that has userId — this is a query that runs on every request):
```typescript
// Example pattern — apply to ALL tables with userId
export const workspacesUserIdx = index('workspaces_user_idx').on(workspaces.userId);
export const pagesUserIdx = index('pages_user_idx').on(pages.userId);
// ... repeat for tasks, snippets, focus_sessions, conversations, messages (via conversationId),
//     habits, habit_logs, goals, moods, bookmarks, reading_items, flashcard_sets, flashcards
```

**Cascade deletes** (to prevent orphaned records):
```typescript
// In pages table definition:
workspaceId: integer('workspace_id')
  .notNull()
  .references(() => workspaces.id, { onDelete: 'cascade' }),

// In tasks table definition:
workspaceId: integer('workspace_id')
  .notNull()
  .references(() => workspaces.id, { onDelete: 'cascade' }),

// In messages table definition:
conversationId: integer('conversation_id')
  .notNull()
  .references(() => conversations.id, { onDelete: 'cascade' }),

// In habit_logs table definition:
habitId: integer('habit_id')
  .notNull()
  .references(() => habits.id, { onDelete: 'cascade' }),

// In flashcards table definition:
setId: integer('set_id')
  .notNull()
  .references(() => flashcardSets.id, { onDelete: 'cascade' }),
```

**Unique constraint** on habit_logs to prevent duplicate logs for the same day:
```typescript
// In habit_logs table:
export const habitLogsUniqueIdx = uniqueIndex('habit_logs_habit_date_unique')
  .on(habitLogs.habitId, habitLogs.date);
```

After updating the schema, run:
```bash
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run push
```

---

### ISSUE 8 — SSE Streaming: Proper Error Handling and Cleanup

**Problem:** The SSE streaming for Nex chat has no timeout handling, no client disconnect detection, and errors during streaming are not handled properly.

**Fix:** Update the SSE handler in `artifacts/api-server/src/routes/anthropic.ts`:

```typescript
router.post('/chat', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Important for Nginx
    res.flushHeaders();

    // Send keepalive comment every 15s to prevent timeout
    const keepalive = setInterval(() => {
      if (!res.writableEnded) res.write(': keepalive\n\n');
    }, 15000);

    // Detect client disconnect
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
      clearInterval(keepalive);
    });

    // ... build messages array, call Claude ...

    let fullResponse = '';

    for await (const chunk of stream) {
      if (clientDisconnected) break;

      const text = chunk.delta?.text ?? '';
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      }
    }

    clearInterval(keepalive);

    if (!clientDisconnected) {
      // Save messages to DB
      await saveMessages(conversationId, userMessage, fullResponse);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    }

  } catch (err) {
    if (!res.headersSent) {
      next(err);
    } else {
      // Headers already sent, we're in SSE mode — send error event
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});
```

On the **frontend** in `artifacts/nexus/src/pages/nex.tsx`, update the EventSource/fetch streaming handler to:
1. Listen for `type: 'error'` events and display an error toast
2. Listen for `type: 'done'` to finalize the message and invalidate the messages query
3. Handle `EventSource` closure gracefully with a reconnect message if dropped mid-stream

---

### ISSUE 9 — Input Validation: Add Zod Validation to All POST/PATCH Routes

**Problem:** POST and PATCH routes accept body data without validation, meaning invalid or malicious data goes straight to the database.

**Fix:** Add Zod validation at the top of every mutating route. Use `drizzle-zod` to generate base schemas from the DB schema, then extend/pick from them.

Example pattern for `POST /api/workspaces`:

```typescript
import { createInsertSchema } from 'drizzle-zod';
import { workspaces } from '@workspace/db';
import { z } from 'zod';

const createWorkspaceSchema = createInsertSchema(workspaces, {
  name: z.string().min(1, 'Name is required').max(100),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color').optional(),
}).pick({ name: true, icon: true, color: true });

router.post('/', async (req, res, next) => {
  try {
    const body = createWorkspaceSchema.parse(req.body);
    // ... rest of handler
  } catch (err) {
    next(err); // ZodError is caught by errorHandler and returns 400
  }
});
```

Apply this pattern to ALL POST and PATCH routes across:
- `workspaces.ts`, `pages.ts`, `tasks.ts`, `snippets.ts`
- `habits.ts`, `bookmarks.ts`, `reading.ts`, `flashcards.ts`
- `goals.ts`, `moods.ts`, `sessions.ts`

Key validation rules to enforce:
- String fields: `min(1)` if required, `max()` sensible limits (names ≤ 100 chars, descriptions ≤ 1000 chars, content ≤ 100000 chars)
- `progress` fields: `z.number().int().min(0).max(100)`
- `score` (mood): `z.number().int().min(1).max(5)`
- `priority`: `z.enum(['low', 'medium', 'high'])`
- `status` (tasks): `z.enum(['todo', 'in_progress', 'done'])`
- `status` (goals): `z.enum(['active', 'completed', 'paused'])`
- `status` (reading): `z.enum(['want_to_read', 'reading', 'completed'])`
- `role` (messages): `z.enum(['user', 'assistant'])`
- `color` (hex): `z.string().regex(/^#[0-9A-Fa-f]{6}$/)`
- `url`: `z.string().url()`
- `tags` (bookmarks): `z.array(z.string()).max(20).optional()`
- `duration` (focus sessions): `z.number().int().min(1).max(480)` (max 8 hours in minutes)

---

### ISSUE 10 — Duplicate Mood Log Prevention

**Problem:** A user can log their mood multiple times on the same day, with no uniqueness constraint.

**Fix (Backend):** In `artifacts/api-server/src/routes/moods.ts`, before inserting a new mood, check if one already exists for today:

```typescript
router.post('/', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { score, note } = moodSchema.parse(req.body);
    const today = new Date().toISOString().split('T')[0];

    const existing = await db.select().from(moods)
      .where(and(eq(moods.userId, userId), eq(moods.date, today)))
      .limit(1);

    if (existing.length > 0) {
      // Update existing instead of inserting
      const [updated] = await db.update(moods)
        .set({ score, note, createdAt: new Date() })
        .where(eq(moods.id, existing[0].id))
        .returning();
      return res.json(updated);
    }

    const [mood] = await db.insert(moods)
      .values({ userId, score, note, date: today })
      .returning();

    res.status(201).json(mood);
  } catch (err) {
    next(err);
  }
});
```

**Fix (Frontend):** In `artifacts/nexus/src/pages/mood.tsx`, after successfully submitting a mood, check if a mood for today already exists in the list and update the UI accordingly (show "update today's mood" instead of "log mood" if one exists).

---

### ISSUE 11 — Dashboard Stats: Real Streak Calculation

**Problem:** The dashboard shows "أيام متواصلة" (streak days) but this stat doesn't have a clear source — it needs to be connected to the habit streak.

**Fix:** Update `artifacts/api-server/src/routes/dashboard.ts` in `GET /api/dashboard/stats` to include the longest current streak across all user habits:

```typescript
// Fetch all habits with their logs
const userHabits = await db.select().from(habits)
  .where(eq(habits.userId, userId));

let maxStreak = 0;
for (const habit of userHabits) {
  const logs = await db.select({ date: habitLogs.date })
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habit.id))
    .orderBy(desc(habitLogs.date));
  
  const streak = calculateStreak(logs); // reuse the same function from Issue 5
  if (streak > maxStreak) maxStreak = streak;
}

// Include in stats response:
res.json({
  tasksCompleted,
  focusSessions,
  pagesWritten,
  longestStreak: maxStreak // ← add this
});
```

Import and reuse the `calculateStreak` function — move it to `artifacts/api-server/src/utils/streak.ts` so both `habits.ts` and `dashboard.ts` can import it.

---

### ISSUE 12 — Rate Limiting on AI Endpoints

**Problem:** The `/api/nex/chat` and `/api/nex/daily-quote` endpoints call Claude with no rate limiting, making them vulnerable to abuse.

**Fix:** Install `express-rate-limit`:

```bash
pnpm --filter @workspace/api-server add express-rate-limit
```

In `artifacts/api-server/src/routes/anthropic.ts`:

```typescript
import rateLimit from 'express-rate-limit';

const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const quoteRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour per IP
  message: { error: 'Too many requests.' },
});

router.post('/chat', chatRateLimit, async (req, res, next) => { ... });
router.get('/daily-quote', quoteRateLimit, async (req, res, next) => { ... });
```

---

### Final Steps After All Changes

1. Run TypeScript check to make sure nothing is broken:
```bash
pnpm run typecheck
```

2. If you modified `openapi.yaml` for Issues 3 or 5, regenerate client code:
```bash
pnpm --filter @workspace/api-spec run codegen
```

3. Push DB schema changes (Issues 7):
```bash
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run push
```

4. Do NOT restart the dev servers manually — Replit Workflows handle that.

---

## Priority Order (if you need to implement one at a time)

| Priority | Issue | Why |
|---|---|---|
| 1 | Issue 1 — Authorization | Security bug, data leak risk |
| 2 | Issue 2 — Error Handling | Crashes expose raw DB errors |
| 3 | Issue 9 — Input Validation | Data integrity, crash prevention |
| 4 | Issue 7 — DB Indexes + Cascades | Performance + orphaned data |
| 5 | Issue 5 — Habit Streak | Core feature not implemented |
| 6 | Issue 6 — Drag & Drop | Core feature not working |
| 7 | Issue 10 — Duplicate Mood | UX bug |
| 8 | Issue 8 — SSE Cleanup | Reliability |
| 9 | Issue 4 — Quote Caching | Cost + performance |
| 10 | Issue 3 — Pagination | Scalability |
| 11 | Issue 11 — Dashboard Streak | Data accuracy |
| 12 | Issue 12 — Rate Limiting | Abuse prevention |
