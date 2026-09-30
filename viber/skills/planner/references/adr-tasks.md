# ADR tasks

Read only under `planning.adr: true`, once the whole plan is written and `plan-index.sh` exits 0; a draft never reads it. What is a record is `viber:adr-screener`'s call alone: never add a line of your own to its result, never drop or reword one.

## 1. Screen

Dispatch the `viber:adr-screener` agent with these lines, `input:` last:

```
plan: <absolute path of the plan file>
refs: <the plugin reference directory>
input:
<the confirmed viber:intent summary or viber:fixer diagnosis in context, verbatim>
```

- A reply with no `VERDICT:` line gets one `SendMessage`, `Finish your task, then return your output lines.`; a second reply without one is handled as `VERDICT: DENIED` with `REASON: no verdict returned`.
- `VERDICT: DENIED` - one `AskUserQuestion` naming the refused call from its `REASON:` line: permission added and retry, or continue with no record task.
- `VERDICT: NONE` - ask nothing, add nothing and go back to the skill.
- `VERDICT: FOUND` - ask.

## 2. Ask

Put every line of the result to the user in one prose question, each line on its own: an `ADR:` line as its decision, the rejected option and the reversal cost; a `DEPRECATE:`, `APPEND:`, `ROUTE: comment` or `ROUTE: rule` line as what it would change; and let them accept or drop each. A `ROUTE: ops` line, a `ROUTE: rule` line under `build.rules: false` (the config block's `build.rules:` line) and a route naming no task of the plan are shown as information only, never offered.

- Recommend nothing, ask once and never argue a dropped line back in.
- Dropping every line, or the question, leaves the plan with no record task and no record criterion, exactly as under `planning.adr: false`.

## 3. Apply what was accepted

With nothing accepted, go back to the skill. Otherwise, in this order:

1. Append every accepted `ROUTE: comment` to the `Delivers` of the task it names, as a comment that task's code carries, and under `build.rules: true` every accepted `ROUTE: rule`, as a convention that task's coder names in its notes. Every route lands before any task is added, so its task id still names the task it was given for.
2. When item 3 or 4 adds a task, add one acceptance criterion for the records and point the `Covers` of every such task at it.
3. One task per accepted `ADR:` line, appended after the plan's last task, never renumbering one:
   - `Files: docs/adr/<yyyyMMddHHmmss>-<slug>.md`, the stamp from `date +%Y%m%d%H%M%S` so the path is exact - it is a commit file map, not a pattern.
   - `TDD: none`, `Uses: none`, `Depends-on: none`, and nothing ever depends on it.
   - `Delivers` carries the whole record in the shape below, `Status: accepted` dated from `date +%Y-%m-%d`, because the task file is all its writer gets. From the code it names only `### File map` paths and `## Contracts` names.
   - `Verification: test -f <path> && grep -q '^Status: accepted' <path> -> exit 0`, that path written out in full both times.
   - `DoD`: the record exists there and carries every part of the shape.
4. One task per accepted `DEPRECATE:` or `APPEND:` line, editing that existing record and never deleting it: `DEPRECATE:` rewrites its `Status:` line to `deprecated (<yyyy-mm-dd>)`, or to `superseded by <docs/adr/ path> (<yyyy-mm-dd>)` when the accepted `ADR:` line its sentence names replaces it; `APPEND:` appends the fragment.
   - A `DEPRECATE:` superseded that way merges into that `ADR:` line's task, both paths in its `Files`.
   - Any other one follows item 3 with the existing record's path as its `Files`, its `Verification` grepping that record for its new `Status:` line or a phrase of the fragment.

Then run `plan-index.sh` again; it must exit 0.

## Record shape

```
# <decision title>

Status: accepted (<yyyy-mm-dd>) | deprecated (<yyyy-mm-dd>) | superseded by <docs/adr/ path> (<yyyy-mm-dd>)

<1-3 sentences: context, decision, why>

Rejected: <strongest rival> - <why not>

Consequences: <only a non-obvious one not visible in the code; line omitted otherwise>
```
