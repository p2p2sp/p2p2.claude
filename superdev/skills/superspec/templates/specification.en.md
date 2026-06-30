# <Feature Title>

## 1. Goal & Outcome

<!-- State the observable result, not the feature name. Answer: what can the user do,
     and how do we know it worked? Include the "why" in one line. -->

**Why:** Users lose track of work because tasks live in scattered notes.

**Outcome (definition of done):** A signed-in user can add a task with a title and an optional due date. The task appears immediately at the top of their task list and persists across page reloads. An empty title is rejected with a visible error.

## 2. Scope

<!-- The out-of-scope list matters as much as the in-scope list. Agents expand scope by
     default — close the door explicitly. -->

**In scope**
- Add a single task (title required, due date optional).
- Client-side + server-side validation of the title.
- Optimistic insert into the visible list.

**Out of scope** (do NOT build these, even if they seem natural)
- Editing or deleting tasks.
- Recurring tasks, reminders, notifications.
- Sharing tasks between users or any multi-user/collaboration logic.
- OAuth or any new auth flow — assume the user is already authenticated.

## 3. Stack, Constraints & Fixed Decisions

<!-- Be concrete, with versions. List the stack, anything that constrains implementation
     choices, and any decision already locked in (schema, library, pattern) so the agent
     doesn't re-decide. -->

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS.
- **Backend:** Node.js 20 + Express, PostgreSQL 16, Prisma ORM.
- **Existing modules to reuse:** `auth/session.ts` (gives `getCurrentUserId()`), `db/client.ts` (exported Prisma client). Do not create new DB clients.
- **Constraints:** Title max length 200 chars. P95 API latency < 200 ms. No new third-party dependencies without approval.
- **Fixed decisions:** Persistence is PostgreSQL via Prisma (not in-memory, not localStorage). New table `tasks`: `id` (uuid, pk), `user_id` (fk), `title` (text), `due_date` (date, nullable), `created_at` (timestamptz, default now()). IDs are generated server-side (uuid v4); the client never sets `id`.

## 4. Behavior Contract

<!-- Define external behavior precisely: inputs/outputs, pre/postconditions, error cases,
     and any state transitions. This is what makes a spec implementable, not just readable. -->

**Endpoint:** `POST /api/tasks`

**Request body**
```json
{ "title": "Buy milk", "dueDate": "2026-07-04" }   // dueDate optional, ISO 8601
```

**Success — 201 Created**
```json
{ "id": "9f1c...", "title": "Buy milk", "dueDate": "2026-07-04", "createdAt": "2026-06-30T10:00:00Z" }
```

**Error cases (exact shapes)**
- Empty/whitespace title → `400` `{ "error": "Title is required" }`
- Title > 200 chars → `400` `{ "error": "Title too long" }`
- No valid session → `401` `{ "error": "Unauthorized" }`

**Preconditions:** Caller is authenticated; `getCurrentUserId()` returns a non-null id.
**Postconditions:** Exactly one row added to `tasks`, owned by the current user.

## 5. Acceptance Criteria

<!-- Not "does it work" but: which tests pass and which edge cases are handled. Give
     concrete input → expected output examples where useful. -->

- [ ] `POST /api/tasks` with a valid title returns `201` and the created task.
- [ ] Empty title returns `400` with `{ "error": "Title is required" }`.
- [ ] 201-char title returns `400` with `{ "error": "Title too long" }`.
- [ ] Request without a session returns `401`.
- [ ] After a successful add, the task is visible at the top of the list and survives a reload.
- [ ] `npm test` passes; `npm run lint` reports no new errors.