# Spec: <title>
Intent: <path to the intent file, from the handoff; omit the line when none>

## Problem / context (Why)
<Problem being solved. No solution.>

Users lose track of work because tasks live in scattered notes.

## Goal (What)
<Observable end-state behavior. Not how it is achieved.>

- Add a single task (title required, due date optional).
- Client-side + server-side validation of the title.
- Optimistic insert into the visible list.

## Out of scope
<Explicitly non-goals.>

- Recurring tasks, reminders, notifications.
- Sharing tasks between users or any multi-user/collaboration logic.
- OAuth or any new auth flow - assume the user is already authenticated.

## User scenarios
<As a <role> I want <goal> so that <value>. Concrete, observable.>

## Acceptance criteria
<Numbered, TESTABLE, unambiguous. Each = one observable true/false condition.>
1. A signed-in user can add a task with a title and an optional due date.
2. The task appears immediately at the top of their task list and persists across page reloads.
3. An empty title is rejected with a visible error.
4. …

## Constraints / assumptions
<Non-implementation requirements: compliance, limits, product-level performance.>
