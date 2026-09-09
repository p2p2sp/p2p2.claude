# Plan Review Checklist

Shared rubric for plan review. Authors (`simpleplan`, `superplan` self-review) and reviewers
(`simpleplan-reviewer`, `superplan-reviewer`) apply the exact same classes - a plan that passes
self-check should pass review.

Stack-agnostic: every class below refers only to the plan template's own sections
(`### Files`, `### Dependencies`, `### Test Commands`, `### Approach`, `### Edge cases`,
`### Contracts`, `### DoD`, `TDD:`, `Covers:`) - never to a specific ecosystem's tools.

## Evidence rule

A reviewer verifies with Read/Grep/Glob ONLY and never executes a command - no build, no test, no
`git`, no shell of any kind. Path existence -> Glob; a symbol's or a command's presence in a file ->
Grep; content -> Read.

A Blocking finding must cite its class ID (B1-B7) plus concrete evidence gathered that way - quote
the file, path, or command checked. A suspicion that cannot be verified with Read/Grep/Glob is not
Blocking: demote it to NOTES, phrased as a question.

## Blocking classes

A finding belongs in FINDINGS, drives `VERDICT: FAIL`, and must cite one of these IDs plus repo
evidence (see Evidence rule).

- B1 - File path or symbol wrong or missing: a path listed in `### Files` does not exist in the
  repo (for an `add` entry, its parent directory must exist); a named symbol does not exist in the
  file it is claimed to modify. Existence is settled with Glob, the symbol with Grep.
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
- B6 - Missing TDD marker: the template requires a `TDD:` marker on a task and it is absent.
- B7 - Undecidable step: an implementer cannot execute a step without a decision that is absent
  from the plan. Report B7 under BLOCKED, never under FINDINGS - it needs a decision, not a fix
  the reviewer can point at.

## Advisory (NOTES)

Everything real but not in B1-B7: wording, phrasing, style preferences, task-split preference
(one task vs. two), optional hardening not required by any acceptance criterion, "nice to have"
suggestions. These never block - they ride along as NOTES on a PASS.

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
  does).
- Every `### Test Commands` entry matches the repo's real build/test tooling.
- The two-way mapping holds: every acceptance criterion is covered by at least one task, and every
  task covers at least one criterion or is traceable to the Goal/spec.

Fix any violation inline before submitting - do not rely on the reviewer to catch it.
