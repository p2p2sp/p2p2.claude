# Plan Review Checklist

Shared rubric for plan review. Authors (`simpleplan`, `superplan` self-review) and reviewers
(`simpleplan-reviewer`, `superplan-reviewer`) apply the exact same classes - a plan that passes
self-check should pass review.

Stack-agnostic: every class below refers only to the plan template's own sections
(`## Gate commands`, `### Files`, `### Dependencies`, `### Task Checks`, `### Approach`,
`### Failure modes`, `### Contracts`, `### DoD`, `TDD:`, `Kind:`, `Model:`, `Review:`,
`Covers:`) - never to a specific ecosystem's tools.

## Evidence rule

A reviewer verifies with Read/Grep/Glob ONLY and never executes a command - no build, no test, no
`git`, no shell of any kind. Path existence -> Glob; a symbol's or a command's presence in a file ->
Grep; content -> Read.

A Blocking finding must cite its class ID (B1-B23) plus concrete evidence gathered that way - quote
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
- B2 - Build/test command mismatch: a command in one of the header's `## Gate commands` subsections
  (`#### Build`, `#### Tests`, `#### Integration`) or in a task's `### Task Checks` contradicts the
  repo's actual build/test tooling as documented in a config or memory file read with Read/Grep - a
  `### Task Checks` line is checked on the same terms, its file-scoping form included. Tooling that
  cannot be confirmed that way is not B2 - it goes to NOTES.
- B3 - Criteria/task mapping broken: an acceptance criterion has no task covering it, or a task
  covers no acceptance criterion and is not traceable to the Goal or spec (scope creep beyond
  Goal-or-spec), or a task delivers something the `## Out of scope` list excludes.
- B4 - Contradictory or broken ordering: two steps (within one task's `### Approach`, or across
  tasks) contradict each other, or `### Dependencies` is circular, points at a nonexistent task, or
  orders a task before one it depends on.
- B5 - Leftover placeholder: a TODO, an unfilled `<placeholder>` template token, or a mandatory
  template section left empty survives in the submitted plan.
- B6 - Missing or invalid task marker: the template requires `TDD:`, `Kind:` and `Model:` on
  every task; one is absent, or carries a value outside its allowed set (`TDD:` `required` |
  `none`; `Kind:` `code` | `scaffold` | `text`; `Model:` `sonnet` | `opus`), or a
  `TDD: required` task is marked `Model: sonnet`. `Review:` is optional on a task of either track
  and never required, but where present it reads either `none` - the per-task reviewer is not
  dispatched at all - or one `Model:` value; every other spelling of that skip (`None`, `skip`,
  `-`, an empty value) is B6. An `Effort:` line is not a marker: the `Agent` tool takes no effort
  parameter and no consumer reads one, so a task carrying it is neither required to nor flagged
  for it. Settled by reading the task's marker lines alone - what a task runs as its own proof is
  B17, and whether its `Kind:` matches that proof is B22, not this.
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
- B13 - Test that cannot fail: a test described in `### Approach`, `## Gate commands`,
  `### Task Checks`, or `### DoD` whose assertion already holds without the change - a fixture equal
  to the expected value, an assertion on a constant, a throttle test with no throttled call. Read
  the planned test against the behaviour it is meant to prove.
- B14 - Contract or shared value with no consuming task: a `### Contracts` entry that another task's
  `### Approach` references while naming no consuming task
  (`` consumed by `<task title>` (Task <N>) ``), or a value the plan describes as produced and no
  task consumes. Grep the plan for the contract's name across all tasks.
- B15 - Reference with a bare number: a `Covers:`, `### Dependencies` or `consumed by` entry that
  names a criterion or task by number alone, or whose title differs from the heading or criterion
  line it points at; settled by reading the entry against the plan's task headings and the criteria
  source (the spec, or the plan's own `## Acceptance criteria`). A legacy criteria source with no
  short names is cited by the first clause of the criterion, per `review-contract.md`'s `## Naming`.
- B16 - Oversized TDD task: a `TDD: required` task whose `### Task Checks` carries two or more
  lines opening with a test file path, or none at all. Only a line that opens with a test file path
  counts here - a build, lint, type-check or grep line never does, however many of them the section
  holds. Such a task writes more than the one test file a TDD cycle drives, or drives none at all -
  it is split per test file, or its marker is wrong. Settled by reading that task's `TDD:` marker
  line against its `### Task Checks` section.
- B17 - Gate or check with no judgment: a `none` line carrying no reason, or carrying a reason the
  task's own `### Files` or the host's memory files (`CLAUDE.md`, `.claude/rules/`) contradict - in
  a `## Gate commands` subsection and in a task's `### Task Checks` alike. A task carrying no
  `### Task Checks` section at all is B17 too, as is a test-file line whose path is not declared
  under that task's `### Files`. Settled by reading those sections against `### Files` and the
  memory files.
- B18 - New endpoint with no contract: a task whose `### Approach` adds an HTTP endpoint, route or
  handler while its `### Contracts` carries no request shape, no response shape and no status codes
  for it. The implementor otherwise invents all three, and the task consuming that endpoint is
  written against an invention. Settled by reading that task's `### Approach` against its
  `### Contracts`.
- B19 - User-visible text with no owner: a task whose `### Approach` or `### Files` produces text a
  person reads (a message, a screen, an error message, a text resource) while neither section carries
  that text nor `### Contracts` carries a `copy: implementor, after <existing key or file>` line for
  it. That line is the one delegation form: it names the existing key or file whose wording the
  implementor follows, so unwritten text is a decision the plan hands over deliberately rather than
  one it forgot. Settled by reading those three sections.
- B20 - Mid-operation failure with no decision: a task whose `### Approach` has a step made of a
  persisted write followed by an outside action (a send, a call, a job hand-off) while its
  `### Failure modes` carries no bullet for a failure between the two - the write landed, the outside
  action did not. Settled by reading that task's `### Approach` against its `### Failure modes`.
- B21 - Whole-repository command outside the final gate: a `#### Build` or `#### Tests` line, or a
  task's `### Task Checks` line, that builds or tests the whole repository, solution or workspace
  while the host's runner and memory files (`CLAUDE.md`, `.claude/rules/`) offer a narrower scope -
  one project, one path, one suite - covering what the plan moves. Those two subsections run at every
  checkpoint and that section runs on every task, so the cost is paid over and over; a whole-repository
  build or a full suite belongs under `#### Integration` alone, which runs at the final review and its
  re-review only. Settled by reading the command against the host's memory files and the plan's
  `### Files`.
- B22 - Task kind contradicts its proof: a task whose `Kind:` value differs from the kind its own
  `### Task Checks` derives, or a `Kind: text` or `Kind: scaffold` task carrying `TDD: required` -
  neither of those two kinds writes the production code a TDD cycle drives. This table is the one
  owner of that derivation; the planning skills and the task implementors cite it, never copy it.
  Its rows are read top down - the first row matching any line of the section settles the kind:

  | `### Task Checks` holds | kind |
  | --- | --- |
  | a line opening with a test file path | `code` |
  | `none - manual verification: <what>` | `code` |
  | `none - covered by gate <Build\|Tests\|Integration>` | `code` |
  | a tool command with no test file path - a build, install, validate or generator command, `ls` of a directory, `grep` over paths or file names (`ls src/generated`, `grep -c '^superdev/' .gitattributes`) | `scaffold` |
  | any other `none - <reason>`, or `grep` alone whose pattern is about file content (`-l` included) | `text` |

  Settled by reading the task's `Kind:` and `TDD:` marker lines against its `### Task Checks`
  section.
- B23 - Gate over an outside value written as a deny-list: the validation rule B12 requires for a
  value from outside the process - under `### Contracts` or `### Failure modes` - is written as an
  enumeration of what is rejected (a list of forbidden characters, patterns, prefixes, names or
  shapes) rather than as the closed set of what is accepted (a grammar, a whitelist, a fixed
  vocabulary, a bounded range). A deny-list is a plan that leaks by construction: every form the
  author did not think of passes, and the build discovers them one review round at a time. The
  plan defines the accepted set and treats everything outside it as rejected; the same rule read
  as "accept these, reject the rest" is not B23. Settled by reading the rule's own wording in the
  task that consumes the value.

## Advisory (NOTES)

Everything real but not in B1-B23: wording, phrasing, style preferences, task-split preference
(one task vs. two), optional hardening not required by any acceptance criterion, "nice to have"
suggestions, a `Model:` or `Review:` that reads too low for what the task's `### Approach` has to
reason about (an algorithm, a state machine, a contract other tasks consume, a hard-to-undo
change), and a `scaffold` or `text` task carrying `Model: opus` or a per-task reviewer that its
`### Approach` gives no reason for - strength that reads too low or too high is named here and
never Blocking, and where it is too low the author rounds up, never down. One exception to that
last item: a host whose memory files (`CLAUDE.md`, `.claude/rules/`) declare that text is its
product - prompts, skill files, documentation shipped as the deliverable - has given every `text`
task its reason for a per-task reviewer, so a `Review:` marker on such a task is never noted and a
`Review: none` on it is what the note names instead.
These never block - they ride along as NOTES on a PASS.

Three named items ride here too, each real but never Blocking:

- Oversized `TDD: none` task: a `TDD: none` task whose `### Approach` delivers more than one
  behaviour, or whose `### Files` runs well past the few files one behaviour needs. The size rule
  aims such a task at one behaviour and a few files, so name the split it invites - but the marker
  is valid and the task is buildable, so it never blocks (a `TDD: required` task oversized the same
  way is B16, not this).
- Integration or e2e check in a task's own proof: a `### Task Checks` line whose command or file
  path names the integration or e2e command or directory the host's memory files (`CLAUDE.md`,
  `.claude/rules/`) document. Such a suite runs through the header's `#### Integration` at the final
  review, so a task carrying it under `### Task Checks` runs it at the wrong stage. Grep the memory
  files for that command or directory first: a suite the memory files do not document that way is
  not this item.
- Gate with nothing to run: a plan whose tasks move code while no `## Gate commands` subsection
  holds a command - all three read `none - <reason>`. Each reason may be sound on its own, so name
  what the build then has no gate over, but never block on it (a `none` with no reason, or with a
  reason the repo contradicts, is B17 instead).

## Never flag

- Content that already satisfies the template as written.
- Naming or style preferences with no functional effect.
- A hypothetical risk with no repo evidence behind it.
- An alternative to a decision the plan has already fixed (the decision is not up for re-litigation
  in review).
- Anything the build/test commands will deterministically catch during implementation (that is the
  build/test step's job, not review's).
- The `Write ADR` task built from `superdev/references/adr-task.md`, on all three counts: its
  `### Approach` carrying each ADR's text in full and verbatim (that text is the task's deliverable,
  not prose a planner failed to compress), its `Covers:` naming the intent's `## ADR` section
  instead of a numbered acceptance criterion (exempt from B3 and from B15's reference form alike),
  and its `### Files` declaring `docs/adr/` by directory because the file names are stamped at write
  time.

## Author self-check

Before submitting a plan for review, verify in the repo:

- Every `### Files` path and symbol referenced actually exists (or, for `add`, its parent directory
  does), and every path is literal - no `<…>`, `*` or `?`; a generated name is declared by its
  parent directory with a trailing slash.
- Every command in the header's `## Gate commands` and in each task's `### Task Checks` matches the
  repo's real build/test tooling, and each of the three gate subsections holds a runnable command or
  `none - <reason>` whose reason the repo does not contradict.
- The two-way mapping holds: every acceptance criterion is covered by at least one task, and every
  task covers at least one criterion or is traceable to the Goal/spec.
- Every task carries `TDD:`, `Kind:` and `Model:` with values from their allowed sets, no
  `TDD: required` task sits on `Model: sonnet`, and a `Review:` marker, where present, reads
  either `none` or one `Model:` value - no other spelling of the skip.
- Every task's `Kind:` is the kind B22's table derives from that task's own `### Task Checks`, and
  no `text` or `scaffold` task carries `TDD: required`.
- Every task carries a `### Task Checks` section: a `TDD: required` task carries exactly one line
  opening with a test file path, a `TDD: none` task carries one such line per test file it writes or
  changes, every test-file line names a path declared under that task's `### Files`, and a section
  with nothing to run reads `none - <reason>` whose reason `### Files` does not contradict.
- Every `### Failure modes` bullet carries its response, its log and its test; a `none` carries its
  one-word reason; no `### Approach` step decides a failure behaviour of its own.
- Every closed set a task extends lists that set's consumers under `### Contracts` (Grep the type
  name to find them).
- Every change of the response mechanism carries its method-and-status matrix under `### Contracts`.
- Every external value entering a path, query, command or routing decision carries its validation
  rule under `### Contracts` or `### Failure modes`, written as the closed set of what is accepted,
  never as a list of what is rejected.
- Every planned test can fail before the change it proves.
- Every contract another task consumes names that task (`` consumed by `<task title>` (Task <N>) ``),
  and no value the plan produces is left unconsumed.
- Every `Covers:`, `### Dependencies` and `consumed by` entry names its criterion or task in the
  reference form `` `<title>` (<pointer>) `` - the criterion's short name with `(#<n>)`, the task's
  heading title with `(Task <N>)` - never a bare number, and the title matches the line it points at.
- Every task that adds an endpoint, route or handler carries that endpoint's request shape, response
  shape and status codes under `### Contracts`.
- Every task producing text a person reads carries that text itself, or delegates it under
  `### Contracts` with one `copy: implementor, after <existing key or file>` line.
- Every `### Approach` step made of a persisted write followed by an outside action carries a
  `### Failure modes` bullet for the failure between the two.
- No `#### Build` line, `#### Tests` line or `### Task Checks` line builds or tests the whole
  repository, solution or workspace while the host's runner offers a narrower scope covering what the
  plan moves; a full build or a full suite rides under `#### Integration` alone.

Fix any violation inline before submitting - do not rely on the reviewer to catch it.
