# Plan Review Checklist

Shared rubric for plan review. Authors (`simpleplan`, `superplan` self-review) and reviewers
(`simpleplan-reviewer`, `superplan-reviewer`) apply the exact same classes - a plan that passes
self-check should pass review.

Stack-agnostic: every class below refers only to the plan template's own sections
(`### Files`, `### Dependencies`, `### Test Commands`, `### Approach`, `### Failure modes`,
`### Contracts`, `### DoD`, `TDD:`, `Model:`, `Effort:`, `Covers:`) - never to a specific
ecosystem's tools.

## Evidence rule

A reviewer verifies with Read/Grep/Glob ONLY and never executes a command - no build, no test, no
`git`, no shell of any kind. Path existence -> Glob; a symbol's or a command's presence in a file ->
Grep; content -> Read.

A Blocking finding must cite its class ID (B1-B15) plus concrete evidence gathered that way - quote
the file, path, or command checked. A suspicion that cannot be verified with Read/Grep/Glob is not
Blocking: demote it to NOTES, phrased as a question.

## Blocking classes

A finding belongs in FINDINGS, drives `VERDICT: FAIL`, and must cite one of these IDs plus repo
evidence (see Evidence rule).

- B1 - File path or symbol wrong or missing: a path listed in `### Files` does not exist in the
  repo (for an `add` entry, its parent directory must exist); a named symbol does not exist in the
  file it is claimed to modify. Existence is settled with Glob, the symbol with Grep. A path that is
  not literal - it carries `<`, `>`, `*` or `?` - is B1 too, whatever exists around it: the commit
  script matches `### Files` by prefix, so a placeholder declares nothing and the real file lands as
  an undeclared change. A generated name (a migration timestamp, a snapshot hash, a dated file) is
  declared by its parent directory with a trailing slash instead.
- B2 - Build/test command mismatch: a command in `### Test Commands` contradicts the repo's actual
  build/test tooling as documented in a config or memory file read with Read/Grep. Tooling that
  cannot be confirmed that way is not B2 - it goes to NOTES.
- B3 - Criteria/task mapping broken: an acceptance criterion has no task covering it, or a task
  covers no acceptance criterion and is not traceable to the Goal or spec (scope creep beyond
  Goal-or-spec), or a task delivers something the `## Out of scope` list excludes.
- B4 - Contradictory or broken ordering: two steps (within one task's `### Approach`, or across
  tasks) contradict each other, or `### Dependencies` is circular, points at a nonexistent task, or
  orders a task before one it depends on.
- B5 - Leftover placeholder: a TODO, an unfilled `<placeholder>` template token, or a mandatory
  template section left empty survives in the submitted plan.
- B6 - Missing or invalid task marker: the template requires `TDD:`, `Model:` and `Effort:` on
  every task; one is absent, or carries a value outside its allowed set (`TDD:` `required` |
  `none`; `Model:` `sonnet` | `opus`; `Effort:` `low` | `medium` | `high` | `xhigh`), or a
  `TDD: required` task is marked `Model: sonnet`. Settled by reading the task's marker lines.
- B7 - Undecidable step: an implementer cannot execute a step without a decision that is absent
  from the plan. Report B7 under BLOCKED, never under FINDINGS - it needs a decision, not a fix
  the reviewer can point at.
- B8 - Duplicated derived value: a default, fallback formula, validation-error shape, or other
  derived rule is defined independently in the `### Approach` of two or more tasks instead of
  owned by one task and referenced by the rest. Grep the plan for the same data field or rule
  name described separately across multiple tasks' `### Approach` sections.
- B9 - Failure branch with no decision: a `### Failure modes` bullet that omits its response, its
  log or its test; the section left as a bare `none` with no one-word reason; or a `### Approach`
  step that decides a failure behaviour (a `catch`, a fallback, a default on error) which no
  `### Failure modes` bullet covers. A plan drafted before the rename still carries `### Edge cases`
  in place of `### Failure modes`: treat that section as `### Failure modes` and apply B9 to it.
  Settled by reading the task's `### Approach` and `### Failure modes` together.
- B10 - Extended closed set with no consumer list: `### Approach` or `### Contracts` adds a member
  to a closed set (an enum member, a union variant, a status, a kind) and `### Contracts` lists no
  consumers of that set. Grep the repo for the set's type name - every hit that branches on it is a
  consumer the plan owes a line.
- B11 - Response mechanism changed with no matrix: a task changes how a response is produced
  (redirect vs rewrite, proxy vs direct call, a status code family) and `### Contracts` carries no
  method-and-status matrix for it - one line per method with the status codes before and after.
  Settled by reading that task's `### Approach` against its `### Contracts`.
- B12 - External value used unvalidated: a value from outside the process (a header, a path segment,
  a query parameter, a form field, an environment variable) enters a path, a query, a command, or a
  routing decision, and neither `### Contracts` nor `### Failure modes` states its validation rule.
  Grep the plan for the value's name, then read both sections of the task that consumes it.
- B13 - Test that cannot fail: a test described in `### Approach`, `### Test Commands`, or `### DoD`
  whose assertion already holds without the change - a fixture equal to the expected value, an
  assertion on a constant, a throttle test with no throttled call. Read the planned test against the
  behaviour it is meant to prove.
- B14 - Contract or shared value with no consuming task: a `### Contracts` entry that another task's
  `### Approach` references while naming no consuming task
  (`` consumed by `<task title>` (Task <N>) ``), or a value the plan describes as produced and no
  task consumes. Grep the plan for the contract's name across all tasks.
- B15 - Reference with a bare number: a `Covers:`, `### Dependencies` or `consumed by` entry that
  names a criterion or task by number alone, or whose title differs from the heading or criterion
  line it points at; settled by reading the entry against the plan's task headings and the criteria
  source (the spec, or the plan's own `## Acceptance criteria`). A legacy criteria source with no
  short names is cited by the first clause of the criterion, per `review-contract.md`'s `## Naming`.

## Advisory (NOTES)

Everything real but not in B1-B15: wording, phrasing, style preferences, task-split preference
(one task vs. two), optional hardening not required by any acceptance criterion, "nice to have"
suggestions, and a `Model:` / `Effort:` that reads too low for what the task's `### Approach`
has to reason about (an algorithm, a state machine, a contract other tasks consume, a hard-to-undo
change) - the author rounds up, never down, but the choice itself is not Blocking. These never
block - they ride along as NOTES on a PASS.

## Never flag

- Content that already satisfies the template as written.
- Naming or style preferences with no functional effect.
- A hypothetical risk with no repo evidence behind it.
- An alternative to a decision the plan has already fixed (the decision is not up for re-litigation
  in review).
- Anything the build/test commands will deterministically catch during implementation (that is the
  build/test step's job, not review's).

## Author self-check

Before submitting a plan for review, verify in the repo:

- Every `### Files` path and symbol referenced actually exists (or, for `add`, its parent directory
  does), and every path is literal - no `<…>`, `*` or `?`; a generated name is declared by its
  parent directory with a trailing slash.
- Every `### Test Commands` entry matches the repo's real build/test tooling.
- The two-way mapping holds: every acceptance criterion is covered by at least one task, and every
  task covers at least one criterion or is traceable to the Goal/spec.
- Every task carries `TDD:`, `Model:` and `Effort:` with values from their allowed sets, and no
  `TDD: required` task sits on `Model: sonnet`.
- Every `### Failure modes` bullet carries its response, its log and its test; a `none` carries its
  one-word reason; no `### Approach` step decides a failure behaviour of its own.
- Every closed set a task extends lists that set's consumers under `### Contracts` (Grep the type
  name to find them).
- Every change of the response mechanism carries its method-and-status matrix under `### Contracts`.
- Every external value entering a path, query, command or routing decision carries its validation
  rule under `### Contracts` or `### Failure modes`.
- Every planned test can fail before the change it proves.
- Every contract another task consumes names that task (`` consumed by `<task title>` (Task <N>) ``),
  and no value the plan produces is left unconsumed.
- Every `Covers:`, `### Dependencies` and `consumed by` entry names its criterion or task in the
  reference form `` `<title>` (<pointer>) `` - the criterion's short name with `(#<n>)`, the task's
  heading title with `(Task <N>)` - never a bare number, and the title matches the line it points at.

Fix any violation inline before submitting - do not rely on the reviewer to catch it.
