# SuperPlan
To build this plan use the `superbuild` skill.

Title: "superdev review loop and quality gates"
Spec: C:/Projects/p2p2.claude/docs/.workflows/2026-09-11-superdev-review-loop-and-quality-gates/spec.md
Intent: docs/.workflows/2026-09-11-superdev-review-loop-and-quality-gates/intent.md
Plan: C:\Users\dariu\.claude-p2p2\plans\fancy-booping-rocket.md

---

Global rules for every task (repo `CLAUDE.md` conventions, restated once here, referenced by the tasks):
- Every SKILL.md / agent `.md` change is made with the `supercc:skill-designer` skill (Skill tool) - it creates, refactors and lints the file; the implementor never hand-edits a skill or agent body without it.
- English in scripts, CLAUDE.md and README; no em dash (U+2014) and no en dash (U+2013) anywhere; plain hyphen only.
- Stack-agnostic wording in every skill/agent: no ecosystem names, no "test file" heuristics.
- `allowed-tools` never restricts the tool pool; a ban goes into `disallowed-tools`. A skill that `!`-preloads a script keeps `Bash` allowed.
- Tests: `node --test "tests/**/*.test.ts"` from the repo root; a bare directory argument does not work. Scripts are invoked in tests exactly as the SKILL.md invokes them (`bash <script>`), via `runScript` from `tests/harness/run.ts` and `withGitRepo` / `withTempDir` from `tests/harness/tmp.ts`; compare printed paths with `slash()` from `tests/harness/paths.ts`.
- The single owner of the review vocabulary (labels, IDs, report skeleton, notes line formats, verdict rules) is Task 1's `superdev/references/review-contract.md`. Every later task references that file's sections by name and never restates a rule in its own words.

<!-- TASK -->

## Task 1 - docs(superdev): add the shared review contract reference
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #11, #12, #14, #15, #16

### Dependencies
- none - blocks: 5, 7, 8, 9, 10, 11, 12

### Files
- add - superdev/references/review-contract.md (`## Labels`, `## Finding IDs`, `## Report skeleton`, `## Gates`, `## Verdict rules`, `## Debt file`, `## Decisions file`, `## Notes line formats`, `## Implementor fix-mode input`)

### Test Commands
#### Build
- `! grep -n $'\r' superdev/references/review-contract.md` - expected: no output, exit 0 (LF endings only)

#### Tests
- `grep -c '^## ' superdev/references/review-contract.md` - expected: `9`
- `grep -n 'stage: checkpoint|final|re-review' superdev/references/review-contract.md` - expected: one hit under `## Labels`
- `grep -n 'VERDICT: BLOCKED' superdev/references/review-contract.md` - expected: at least one hit under `## Verdict rules`
- `! grep -n $'\u2013\|\u2014' superdev/references/review-contract.md` - expected: no output, exit 0

### Approach
1. Write `superdev/references/review-contract.md` in the style of `superdev/references/plan-review-checklist.md` (a stack-agnostic rubric shared by several skills, opening with which files consume it: the three build reviewers, the two task implementors, the task reviewer, the two orchestrators).
2. `## Labels` - the fork/agent input labels the orchestrators pass on top of the existing `plan:` / `spec:` / `plan-header:` / `notes:` / `report:` lines: `stage: checkpoint|final|re-review` (required for every build reviewer call), `since: <SHA>` (required; the diff under review is `git diff <since>..HEAD`; for the build's first review round it equals the `base:` value from the decompose index), `prior: <path to the previous report>` (required for `stage: re-review` and for any round after an earlier report; omitted only in the build's first review round), `decisions: <path to decisions.md>` (optional; each line is a user-accepted criterion change with the force of the plan), `refs: <absolute references dir>` (for agents: where this contract lives), `more: <path>` (implementor fix mode only, optional, repeatable: an additional findings report handled in the same dispatch). State the input errors: missing `stage` or `since`, or missing `prior` on `stage: re-review` -> `VERDICT: FAIL` with `REASON: missing input <label>`, no report written. The old `base:` label is retired; `since` replaces it.
3. `## Finding IDs` - `C<n>` / `I<n>` / `M<n>` per severity, assigned in the round that raises the finding, never renumbered; a later round continues numbering from the highest `<n>` per class found in `prior`. `## Report skeleton` - the exact on-disk report structure every build reviewer writes: title line `# <stage> review - <report basename>`; `## Gates` (one line per build/test/e2e command run with its result, or the single sentence `no e2e or integration suite in this host`); `## Prior findings` (only when `prior` was given: a table `| ID | Verdict | Evidence |` with `ADDRESSED` / `NOT ADDRESSED` and a file:line); `## Findings` with `### Critical` and `### Important` (one bullet per finding: `- <ID> - file:line - what is wrong - why it matters - how to fix`); `### Needs decision` (BLOCKED items: ID, the criterion or plan task, why no code change can clear it); `## Debt` (the round's Minor with IDs, also appended to the debt file); `## Notes` (advisory lines including `NOTE: plan defect - <what>`); `## Assessment` ending with the bare line `VERDICT: PASS`, `VERDICT: FAIL` or `VERDICT: BLOCKED`. No `Strengths`, no `Recommendations` section exists.
4. `## Gates` - run before reading code at every stage: the build, every `Test Commands` block of the plan, and the host's integration/e2e command when the plan or the host's memory files document one; each command and its result goes into the report's `## Gates`; on `re-review` after a fix that touched a non-test file the e2e/integration command is rerun; a documented e2e/integration command that cannot start in this environment -> `VERDICT: BLOCKED` with the reason under `### Needs decision`; a host with no such command documented -> the single skeleton sentence, never BLOCKED; a criterion that needs a run and got none is never marked met. `## Verdict rules` per stage: `checkpoint` and `final` first pass - review the whole `git diff <since>..HEAD`; new Critical/Important allowed for any defect in that delta; `final` additionally judges seams across the whole build (a `### Contracts` entry consumed by another task, `CARRY:` lines from the notes dir, failure branches crossing tasks) and may raise Critical/Important for a seam even in code before `since`; `re-review` - verdict every `prior` ID first, then read only `git diff <since>..HEAD`; a new Critical/Important only for a defect the fix itself introduced; an ID that was `M<n>` in `prior` never returns as `I<n>`; FAIL only on `NOT ADDRESSED` Critical/Important or a new fix-introduced Critical/Important. `BLOCKED` - returned when a criterion is unmet because of a decision recorded in the plan, the notes or the decisions file (not because code is missing), or when a documented e2e/integration command (plan `Test Commands` or host memory) exists but cannot run in this environment; BLOCKED outranks FAIL in the return line, and the `REVIEW:` line is returned on both. A behaviour recorded under a task's `### Failure modes` is a decision: disagreement is a `NOTE: plan defect` line, never a Critical or Important. Minor never affects the verdict. State the return channel: line 1 `VERDICT: PASS|FAIL|BLOCKED`, line 2 `REVIEW: <report path>` on FAIL and BLOCKED.
5. `## Debt file` - `<workdir>/implementation/debt.md`, appended by the reviewer (never overwritten, never read by the fix implementor), one line per Minor: `- <ID> - <round report basename> - file:line - <what>`. `## Decisions file` - `<workdir>/implementation/decisions.md`, one line per accepted criterion change: `- <ID> - <criterion or task> - accepted: <what the user accepted> - <date>`; written only through `scripts/record-decision.sh`; a reviewer given `decisions:` treats every line as plan text. `## Notes line formats` - lines the implementors write into `*-notes.md`: `touched: <repo-relative path>` (one per file changed outside the task's `### Files`, and one per file changed by a fix round), `CARRY: <path> - <known problem outside this task's Files, to close in the final review>`, per-finding status in fix mode `<ID>: fixed` / `<ID>: fixed - no test: <reason>` / `<ID>: skipped - <reason>`, plus the existing `UNDERSPECIFIED:` and `no deviations` lines. `## Implementor fix-mode input` - the `task:` (and each `more:`) file is a report in the skeleton above; only `### Critical` and `### Important` IDs are fixed; `## Debt` IDs are touched only when the dispatch prompt lists them explicitly on a `minor: <ID>[, <ID>]` line; every fixed Critical/Important gets a test that fails before and passes after the fix, or the `no test:` status line.

### Edge cases
- A `prior` report written before this change (no IDs) - the reviewer treats every bullet under Critical/Important as an unnumbered prior finding, assigns fresh IDs in the verdict table, and says so in `## Notes`.
- `since` equal to `none` (build without git) - the review is unbounded over the working tree; the report says so under `## Gates`.

### Contracts
- The whole file is the contract consumed by Tasks 7-12; those tasks reference its `## <section>` names and never restate the rules.

### DoD
`superdev/references/review-contract.md` exists with the nine sections above, portability sweep green, no dash characters, every rule in the spec's stories D, E, F, G, H expressible by pointing at one section of this file.

<!-- /TASK -->

<!-- TASK -->

## Task 2 - feat(scripts): commit-task.sh stages only the declared set and prints the commit SHA
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: criteria #26, #27, #28, #29

### Dependencies
- none - blocks: 11, 12

### Files
- modify - superdev/scripts/commit-task.sh (argument parsing, `declared_paths()`, `undeclared_changes()`, staging, `commit:` line)
- modify - tests/superdev/commit-task.test.ts (new cases, header comment)

### Test Commands
#### Build
- `bash -n superdev/scripts/commit-task.sh` - expected: no output, exit 0

#### Tests
- `node --test "tests/superdev/commit-task.test.ts"` - expected: all tests pass, including the six new cases named in DoD
- `node --test "tests/**/*.test.ts"` - expected: all tests pass
- `! grep -n 'git add -A$\|git add \.$' superdev/scripts/commit-task.sh` - expected: no output, exit 0 (the only `git add` left is pathspec-limited)

### Approach
1. Extend the header contract and argument parsing: `commit-task.sh <message> [task-file] [--notes <notes-file>] [--path <pathspec>]...`. Keep `message` as `$1` and an optional positional `task-file` as `$2` (existing callers), then parse the options in a `while` loop. A fresh repository's initial commit declares the whole tree explicitly with `--path .` (Task 11 uses that in its git-init branch); there is no flag that stages without a pathspec.
2. `declared_paths()` builds the staged set: from `task-file`, every `### Files` bullet's path (the line shape `- <add|modify|delete> - <path> (<symbol>)`: strip the leading `- <verb> - `, then everything from the first ` (`; trim); from `--notes`, every `touched: <path>` line (first colon split, trim); every `--path` value; plus the run directory derived as `dirname(dirname(task-file))` or `dirname(dirname(notes-file))` when either is given. Drop entries that neither exist in the tree nor are tracked (`git ls-files --error-unmatch` fails) so a planned-but-uncreated file never aborts the commit.
3. `undeclared_changes()` lists `git status --porcelain=v1 --untracked-files=all -z`, drops every entry whose path equals a declared path or starts with a declared directory (with trailing `/`), and drops every entry under `.temp/`. Any remaining entry -> print `undeclared: <path>` per line on stdout, print `error: undeclared changes in the working tree - nothing committed` on stderr, exit 2. The status bump via `status-update.sh` still runs first (unchanged), and the git-repo guard (`Not a git repository - skipping commit.`, exit 0) stays before any staging.
4. Stage with `git add -A -- "${declared[@]}" ':(exclude).temp'` (pathspec-limited, so deletions under `### Files` `delete` entries are staged too, and `.temp/` never enters even under `--path .`), keep `Nothing to commit.` on an empty index, otherwise `git commit -m "$message"` and then print `commit: $(git rev-parse HEAD)` as the last stdout line.
5. Update `tests/superdev/commit-task.test.ts`: the existing "message + task file" case gets a task file with a `### Files` section naming `work.txt`; the existing message-only cases ("stages and commits a pending change", "newline, quote and non-ASCII") pass `--path a.txt`; add the cases from DoD; every case that expects a stop asserts exit 2, the `undeclared:` line, and that `git log` is unchanged.

### Edge cases
- A declared directory (`--path <workdir>` or `--path .`) also declares every file below it, including new untracked ones.
- `.gitignore`d files never appear in porcelain output, so they are neither undeclared nor staged; `.temp/` is excluded even when the host has no `.gitignore` entry for it.
- A `### Files` path with `delete` verb whose file is already gone: `git add -A -- <path>` stages the deletion; a path that never existed is dropped silently.
- No task file, no notes, no `--path` (message only): declared set is empty; any change in the tree is undeclared -> exit 2; a clean tree -> `Nothing to commit.`.
- Windows: paths from porcelain are `/`-separated already; declared paths from the task file may carry `\` - normalise `\` to `/` before comparing.

### Contracts
- stdout lines consumed by the orchestrator: `commit: <sha>` (success), `undeclared: <path>` (one per offending path, exit 2), `Nothing to commit.` (exit 0), `Not a git repository - skipping commit.` (exit 0).
- Exit codes: 0 committed / nothing / no repo; 1 missing message or status-update failure; 2 undeclared changes.
- `touched:` line shape as in Task 1 `## Notes line formats`.

### DoD
`commit-task.sh` never stages outside the declared set; the six new tests pass - tracked file modified outside the set -> exit 2 + `undeclared:` + no commit; untracked file outside the set and outside `.gitignore` -> the same; untracked file under `.temp/` -> commit succeeds without it; `touched:` path from `--notes` is in the commit; `--path <dir>` stages a new file below it; stdout ends with `commit: <sha>` equal to `git rev-parse HEAD`. Full suite green.

<!-- /TASK -->

<!-- TASK -->

## Task 3 - feat(scripts): decompose.sh commits only its run directory, prints the repo root and works from any cwd
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #25, #28, #30

### Dependencies
- none - blocks: 11, 12

### Files
- modify - superdev/scripts/decompose.sh (repo-root `cd`, `root:` index line, pathspec-limited commit, header comment)
- modify - tests/superdev/decompose.test.ts (two new cases, `root:` line in the happy-path assertion)

### Test Commands
#### Build
- `bash -n superdev/scripts/decompose.sh` - expected: no output, exit 0

#### Tests
- `node --test "tests/superdev/decompose.test.ts"` - expected: all tests pass
- `node --test "tests/**/*.test.ts"` - expected: all tests pass
- `! grep -n 'git add -A$' superdev/scripts/decompose.sh` - expected: no output, exit 0

### Approach
1. Right after argument validation, resolve `$plan` to an absolute path (`cd "$(dirname "$plan")" && pwd` joined with the basename), then, when `git rev-parse --show-toplevel` succeeds, `cd` into that toplevel so every path the script derives (`docs/.workflows/...`) is repo-root-relative regardless of the caller's cwd; outside a repo keep the current behaviour (cwd stays).
2. Print a new index line `root: <absolute toplevel path>` directly after `workdir:` (outside a repo: the absolute cwd). Document it in the header's index block; `workdir:` stays repo-relative because `cleanup-run.sh` requires that shape.
3. Replace `git add -A` with `git add -A -- "$dir"` so only the run directory enters the decomposition commit; keep the noise-on-stderr and `nothing to commit` behaviour.
4. Add the test "a dirty working tree: a pre-existing modified tracked file and an untracked stray file are not part of the decomposition commit" (assert `git show --name-only HEAD` lists only paths under `docs/.workflows/`) and "run from a subdirectory of the repo: the working dir is created under the repo root and the index prints root:" (run with `cwd: path.join(repo.dir, "sub")` and a plan path relative to that subdirectory).
5. Extend the happy-path assertion so the index order is `workdir:`, `root:`, `status:`/`base:`... and `root:` equals `slash(repo.dir)` (use the harness `slash()` from `tests/harness/paths.ts`; on Windows `git rev-parse --show-toplevel` under Git-Bash prints `C:/...`, so compare case-insensitively on the drive letter).

### Edge cases
- Plan path already absolute: the resolution step is a no-op.
- Repo root path containing spaces: every `cd` and pathspec is quoted.
- Outside a git repository: no `cd`, `root:` is the absolute cwd, commit skipped as today.

### Contracts
- New index line `root: <absolute path>` consumed by Task 10's orchestrators to build absolute paths for every fork/agent label.

### DoD
`decompose.sh` run from `<repo>/sub` with `../plan.md` builds `<repo>/docs/.workflows/<run>/`, prints `root:`, and its commit contains only the run directory; the two new tests and the full suite pass.

<!-- /TASK -->

<!-- TASK -->

## Task 4 - feat(scripts): resolve-input.sh resolves relative paths against the repository root
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #30, #32

### Dependencies
- none - blocks: 12

### Files
- modify - superdev/scripts/resolve-input.sh (`repo_root` resolution in `value_of` callers, header comment)
- modify - tests/superdev/resolve-input.test.ts (two new cases)

### Test Commands
#### Build
- `bash -n superdev/scripts/resolve-input.sh` - expected: no output, exit 0

#### Tests
- `node --test "tests/superdev/resolve-input.test.ts"` - expected: all tests pass (existing cases untouched: the `## <label> (<path>)` heading still prints the value as given)
- `node --test "tests/**/*.test.ts"` - expected: all tests pass

### Approach
1. Compute `root="$(git rev-parse --show-toplevel 2>/dev/null || true)"` once at the top; empty outside a repo.
2. In pass 1, after `p="$(value_of "$label")"`, derive `resolved="$p"`; when `$p` is non-empty, relative (does not start with `/` and does not match a drive-letter prefix like `C:`), and `$root` is set, and `[[ ! -f "$p" ]]`, set `resolved="$root/$p"`; validate existence on `$resolved`, store `resolved` in `paths[]` and keep `$p` as the display value in a parallel `shown[]` array.
3. In pass 2, print `## <label> (<shown>)` and `cat "<resolved>"`, so the heading is unchanged for callers that already resolve correctly and the content comes from the repo-root path otherwise.
4. Add the tests: "inside a git repo, run from a subdirectory: a repo-root-relative path resolves and injects its content" (use `withGitRepo`, create `sub/`, run with `cwd: sub`, block `plan: docs/plan.md`; assert stdout `## plan (docs/plan.md)\n\n<content>\n\n`) and "a cwd-relative path that exists is preferred over the repo-root candidate" (both files exist with different content; the cwd one is injected).

### Edge cases
- Path exists both relative to cwd and to root: cwd wins (backward compatible).
- Windows absolute path `C:/x/y.md` is treated as absolute (drive-letter check), never prefixed with root.
- The `?label` optional convention and the fail-soft `## INPUT ERROR` block are unchanged: a path missing in both places is still "not found: <shown>".

### Contracts
- Output format of `resolve-input.sh` is unchanged (heading shows the label value as given).

### DoD
A fork started with cwd `src/` injects `docs/.workflows/<run>/plan.md` correctly; new tests pass; existing 16 cases unchanged and green; full suite green.

<!-- /TASK -->

<!-- TASK -->

## Task 5 - feat(scripts): add record-decision.sh and checkpoint-update.sh run bookkeeping
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: criteria #7, #22

### Dependencies
- 1 - blocks: 11, 12

### Files
- add - superdev/scripts/record-decision.sh (`record-decision.sh <workdir> <id> <subject> <accepted-text>`)
- add - superdev/scripts/checkpoint-update.sh (`checkpoint-update.sh <workdir> <since-sha> <prior-report>`)
- add - tests/superdev/record-decision.test.ts
- add - tests/superdev/checkpoint-update.test.ts

### Test Commands
#### Build
- `bash -n superdev/scripts/record-decision.sh && bash -n superdev/scripts/checkpoint-update.sh` - expected: no output, exit 0

#### Tests
- `node --test "tests/superdev/record-decision.test.ts"` - expected: all tests pass
- `node --test "tests/superdev/checkpoint-update.test.ts"` - expected: all tests pass
- `node --test "tests/**/*.test.ts"` - expected: all tests pass

### Approach
1. Write both scripts in the style of `superdev/scripts/status-update.sh` (English header with usage, parameters, behaviour; `set -euo pipefail`; `#!/usr/bin/env bash`; mode 100755 via `git update-index --chmod=+x` after staging).
2. `record-decision.sh`: validate four arguments (missing -> usage on stderr, exit 1); `mkdir -p "<workdir>/implementation"`; append one line in the shape from Task 1 `## Decisions file` (`- <id> - <subject> - accepted: <accepted-text> - <date +%F>`) to `<workdir>/implementation/decisions.md`; print `decision: <workdir>/implementation/decisions.md -> <id>` on stdout; exit 0.
3. `checkpoint-update.sh`: validate three arguments; overwrite `<workdir>/checkpoint.md` with exactly two lines `since: <since-sha>` and `prior: <prior-report>`; print `checkpoint: <workdir>/checkpoint.md -> <since-sha>` on stdout; exit 0. `decompose.sh` already preserves any file in an existing run dir other than `tasks/`, so the file survives a resume.
4. Tests for record-decision: happy path creates the file with exactly one line in the documented shape; a second call appends (two lines, first unchanged); missing argument -> exit 1 with usage on stderr; an accepted text containing a colon and a non-ASCII character round-trips verbatim. Tests for checkpoint-update: first call creates the two-line file; a second call overwrites both lines; missing argument -> exit 1 with usage on stderr.

### Edge cases
- `<workdir>` given with a trailing `/` or a leading `./`: normalise like `cleanup-run.sh` does before printing.
- Existing `decisions.md` without a trailing newline: append starts on a fresh line.

### Contracts
- stdout lines `decision: <path> -> <id>` and `checkpoint: <path> -> <sha>` consumed by Task 11's orchestrators; `checkpoint.md` (`since:` / `prior:` lines) read by the orchestrators at resume; decisions line shape owned by Task 1 `## Decisions file`.

### DoD
Both scripts and both test files in place, 100755 in the index, full suite green.

<!-- /TASK -->

<!-- TASK -->

## Task 6 - feat(superplan): plan template Failure modes and Contracts, checklist B9-B14, plan skills and reviewers
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #1, #2, #3

### Dependencies
- none - blocks: 7, 8, 9, 10, 12

### Files
- modify - superdev/skills/superplan/templates/plan.md (`### Edge cases` -> `### Failure modes`, `### Contracts`, `### Approach` instruction lines)
- modify - superdev/skills/simpleplan/templates/plan.md (same three sections)
- modify - superdev/references/plan-review-checklist.md (`## Blocking classes` B9-B14, stack-agnostic preamble section list, `B1-B8` -> `B1-B14`, `## Author self-check`)
- modify - superdev/skills/superplan/SKILL.md (`**File Structure**` rules for Failure modes / Contracts / Approach, `### Self-Review` `B1-B8` -> `B1-B14`)
- modify - superdev/skills/simpleplan/SKILL.md (same two places)
- modify - superdev/skills/superplan-reviewer/SKILL.md (`## Buckets` `B1-B8` -> `B1-B14`)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (`## Buckets` `B1-B8` -> `B1-B14`)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass

#### Tests
- `grep -rn 'Edge cases' superdev/skills/superplan superdev/skills/simpleplan superdev/skills/superplan-reviewer superdev/skills/simpleplan-reviewer` - expected: no output
- `grep -c 'Edge cases' superdev/references/plan-review-checklist.md` - expected: `1` (the B9 compatibility sentence only)
- `grep -c '^- B1[0-4] \|^- B9 ' superdev/references/plan-review-checklist.md` - expected: `6`
- `grep -rn 'B1-B8' superdev` - expected: no output
- `grep -n '### Failure modes' superdev/skills/superplan/templates/plan.md superdev/skills/simpleplan/templates/plan.md` - expected: one hit per file
- `node --test "tests/superdev/decompose.test.ts"` - expected: all tests pass (the decomposer does not parse these sections)

### Approach
1. Through `supercc:skill-designer`, replace `### Edge cases` in both templates with `### Failure modes` whose placeholder reads: one bullet per failure of the fixed shape `when <X fails | input is invalid | two <X> run concurrently> -> response <Y>, log <Z>, test <T>`; `none` allowed only as `none - <one-word reason>`. Extend `### Contracts` placeholder: data shapes / signatures; for a change of the response mechanism a method-and-status matrix; for an extended closed set the list of its consumers (found by Grep); every contract another task consumes names that task (`consumed by Task <N>`). Tighten `### Approach` placeholder: symbol + signature + algorithm, never line-by-line code, never a failure decision (those live under Failure modes).
2. In `superdev/references/plan-review-checklist.md` add B9-B14 to `## Blocking classes`, each with its Read/Grep/Glob evidence rule: B9 a `### Failure modes` entry (or the section as `none` without a reason) that lacks the response, the log or the test, or a `### Approach` step that decides a failure behaviour (`catch`, fallback, default on error) not listed under Failure modes; B10 a closed set extended (a new enum member, variant, status, kind named in Approach or Contracts) with no consumer list under Contracts (Grep the repo for the type name to list them); B11 a change of the response mechanism (redirect vs rewrite, proxy vs direct, status code family) without a method-and-status matrix under Contracts; B12 an external value (header, path segment, query, form field, environment) entering a path, query, command or routing decision with no validation rule under Contracts or Failure modes; B13 a planned test whose assertion holds without the change (fixture equal to the expected value, assertion on a constant, a throttle test with no throttled call); B14 a contract or shared value with no consuming task named (`consumed by Task <N>` absent while another task's Approach references it, or a value described as produced but never consumed). Update the preamble's section list (`### Failure modes` instead of `### Edge cases`), every `B1-B8` mention to `B1-B14`, and `## Author self-check` with one line per new class.
3. In both plan SKILL.md files, under `**File Structure**`, add the authoring rules that mirror B9-B14 (every failure branch decided under Failure modes in the fixed shape; every extended closed set lists its consumers; every transport change carries its matrix; every external value carries its validation; every shared contract names its consuming task; Approach never carries failure decisions or line-by-line code) and change `B1-B8` to `B1-B14` in `### Self-Review`; in both plan reviewers change `B1-B8` to `B1-B14` under `## Buckets`.
4. Verify `superdev/scripts/decompose.sh` needs no change (it parses only `<!-- TASK -->` markers, the `## Task` title, `Model:`, `Effort:`, `Covers:`) by running its test file.

### Edge cases
- A plan written before this change (still carrying `### Edge cases`): the reviewer treats the section as `### Failure modes` and applies B9 to it (state this in the checklist's B9 text).
- `### Failure modes` of a pure function task: `none - pure` is valid.

### Contracts
- Section names `### Failure modes` and `### Contracts` and classes B9-B14 are consumed by Task 7 (task reviewer) and Task 8 (implementors), which reference them by name.

### DoD
Both templates, the checklist, both plan skills and both plan reviewers updated; a plan whose task has `### Failure modes` equal to bare `none` or a consumed contract without `consumed by Task <N>` is classifiable as B9 / B14 by reading the checklist alone; greps in Test Commands hold; portability sweep green.

<!-- /TASK -->

<!-- TASK -->

## Task 7 - feat(agents): task reviewer failure pass and plan-defect rule
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #4, #5

### Dependencies
- 1, 6 - blocks: 12

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Input` task shape, `## Check`, new `## Failure pass`, `## Calibration`, `## Output format`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md` - expected: last line `FAIL=0 WARN=<n>`, exit 0

#### Tests
- `grep -n '## Failure pass' superdev/agents/superbuild-task-reviewer.md` - expected: one hit
- `grep -n 'C<n>' superdev/agents/superbuild-task-reviewer.md` - expected: at least one hit (IDs in the report)
- `grep -n 'Failure modes' superdev/agents/superbuild-task-reviewer.md` - expected: at least two hits (input shape and plan-defect rule)
- `! grep -n 'Edge cases' superdev/agents/superbuild-task-reviewer.md` - expected: no output, exit 0
- `grep -n 'plan defect' superdev/agents/superbuild-task-reviewer.md` - expected: one hit

### Approach
1. Through `supercc:skill-designer`, rename `Edge cases` to `Failure modes` in the `## Input` task shape and in `## Check`, and add `CARRY:` awareness: a `CARRY:` line in `notes` (shape from Task 1 `## Notes line formats`) is not an unrecorded deviation.
2. Add `## Failure pass` after `## Check`, run on the task's diff: (a) every new `catch`, fallback or default-on-error branch: what the caller receives and what is logged, both must match a `### Failure modes` entry or be an obvious bug; (b) every new member of a closed set (enum, variant, status, kind): Grep the repo for the type name and confirm every switch/map/consumer handles it; (c) every changed response mechanism: the methods and status codes match the task's `### Contracts` matrix; (d) every header, path segment, query or form value that enters a path, query, command or routing decision: a validation exists; (e) every new test: it fails without the change (an assertion on a constant, a fixture equal to the expectation, or a throttle test with no throttled call is a finding). A failed point is a Critical (a, b, d when reachable from outside; e when the test guards a criterion) or Important (the rest) in the report.
3. Add to `## Calibration` the rule from Task 1 `## Verdict rules`: a behaviour recorded under the task's `### Failure modes` is a decision; disagreement is a `NOTE: plan defect - <what>` line in the report, never a Critical or Important.
4. Rewrite `## Output format` so the FAIL report uses Task 1 `## Report skeleton` (title `# task review - <report basename>`, `## Findings` with `### Critical` / `### Important` bullets carrying `C<n>` / `I<n>` IDs, `## Notes`, `## Assessment` with the bare `VERDICT: FAIL` line; `## Gates`, `## Prior findings` and `## Debt` omitted - this gate has no Minor and no prior); the return channel stays `VERDICT: PASS` alone or `VERDICT: FAIL` + `REVIEW: <path>`; a PASS with plan-defect notes still returns the single `VERDICT: PASS` line and writes the notes to the report path.
5. Keep the agent under 85 lines; lint with `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md` (expected: `FAIL=0`).

### Edge cases
- A task with `### Failure modes` equal to `none - <reason>`: the failure pass still runs on the diff; any new failure branch found is Important (it was not planned).
- A findings-list task (fix mode): the failure pass runs on the fix diff only.

### Contracts
- Consumes Task 1 `## Notes line formats` (`CARRY:`) and `## Verdict rules` (plan-defect NOTE); consumes Task 6 section names.

### DoD
The agent file carries the five failure-pass points, the plan-defect rule and the `Failure modes` names; greps hold; portability sweep green.

<!-- /TASK -->

<!-- TASK -->

## Task 8 - feat(agents): implementors prove fixes, declare touched files and carry known problems
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #17, #18, #19, #33

### Dependencies
- 1, 6 - blocks: 11, 12

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## Input` labels `refs`, `more`, `minor`; `## 1. Implement` fix-mode rules; `## 3. Record notes`; temp-file rule)
- modify - superdev/agents/simplebuild-task-implementor.md (same sections; `## 4. Record notes`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md && bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md` - expected: `FAIL=0` on both, exit 0

#### Tests
- `grep -c 'touched:' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: at least `1` per file
- `grep -c 'CARRY:' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: at least `1` per file
- `grep -n 'no test:' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: one hit per file
- `grep -n '\.temp/' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: one hit per file
- `! grep -n 'Edge cases' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: no output, exit 0

### Approach
1. Through `supercc:skill-designer`, in both agents: rename `Edge cases` to `Failure modes` in the task shape and in the "honor its ..." rule; add the labels `refs` (required: the references dir; the agent reads `<refs>/review-contract.md` before acting on a findings-list task), `more` (optional, repeatable: additional findings reports) and `minor` (optional: comma-separated Minor IDs allowed in this dispatch), as defined in Task 1 `## Labels` and `## Implementor fix-mode input`.
2. Replace the fix-mode bullet in `## 1. Implement` with: fix every `### Critical` and `### Important` ID from `task` and each `more` report; touch a `## Debt` ID only when listed on `minor:`; never touch any other Minor; every fixed Critical/Important gets a test that fails before the fix and passes after it (write and run the test first, then the fix), or, when no test can express it, the `no test:` status line in the notes; `## Notes`, `## Gates` and `## Prior findings` sections of a report are context, not work items.
3. In the notes step: keep the existing deviation, `UNDERSPECIFIED:` (superbuild only) and `no deviations` lines; add one `touched: <path>` line per file changed outside `### Files` (plan task) and per file changed at all (fix mode); one `CARRY: <path> - <problem>` line per known problem seen outside the task's `### Files` and left in place; in fix mode one status line per ID from the reports (`<ID>: fixed`, `<ID>: fixed - no test: <reason>`, `<ID>: skipped - <reason>`), shapes from Task 1 `## Notes line formats`.
4. Add one rule in both agents: every temporary file (a probe, a log, a scratch test) lives under `.temp/` and never in the repo tree; anything else the agent creates is a deliverable listed under `### Files` or a `touched:` line.
5. Keep both agents within their current length plus 15 lines; lint with `lint_skill.sh`.

### Edge cases
- A fix-mode dispatch with a `task` report in the pre-change format (no IDs): fix every Critical/Important bullet, number them `C1..`/`I1..` in the status lines in order of appearance, and say so in the notes.
- A plan task whose `### Files` lists a file the implementor did not need to touch: no `touched:` line, and a deviation line explaining why.

### Contracts
- Consumes Task 1 `## Labels`, `## Notes line formats`, `## Implementor fix-mode input`; the `touched:` lines are consumed by Task 2's `commit-task.sh --notes`.

### DoD
Both agents carry the new labels, the fix-mode rules, the three notes line shapes and the `.temp/` rule; greps hold; portability sweep green.

<!-- /TASK -->

<!-- TASK -->

## Task 9 - feat(superdev): code reviewers review by stage with IDs, debt file and BLOCKED
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: criteria #5, #8, #10, #12, #13, #14, #15, #16, #21, #33

### Dependencies
- 1, 6 - blocks: 11, 12

### Files
- modify - superdev/skills/superbuild-reviewer-change/SKILL.md (`## Input` preloads for `stage`, `since`, `prior`, `decisions`; `## Contract`; `## Scope` per stage; `## Gates`; `## Review`; `## Calibration`; `## Report`; `## Output format`)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (same sections; plan-alignment gate kept for `checkpoint`/`final`, skipped on `re-review`; BLOCKED for header criteria)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass (every new `!` preload is a `printf | tr | sed | head` pipeline like the existing `report:` one, or a quoted `resolve-input.sh` call)

#### Tests
- `grep -c "sed -n 's/^\[\[:space:\]\]\*\(stage\|since\|prior\|decisions\):" superdev/skills/superbuild-reviewer-change/SKILL.md` - expected: `4`
- `grep -c "sed -n 's/^\[\[:space:\]\]\*\(stage\|since\|prior\|decisions\):" superdev/skills/simplebuild-reviewer/SKILL.md` - expected: `4`
- `! grep -n 'Strengths\|base:' superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md` - expected: no output, exit 0
- `grep -n 'VERDICT: BLOCKED' superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md` - expected: at least one hit per file
- `grep -n 'review-contract.md' superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md` - expected: one hit per file
- `grep -n 'debt.md' superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md` - expected: at least one hit per file

### Approach
1. Through `supercc:skill-designer`, in both skills replace the `Base SHA:` preload with four preloads of the existing `report:` pipeline shape for `stage:`, `since:`, `prior:` and `decisions:` (the `resolve-input.sh` preload keeps `plan spec` / `plan-header plan`; `prior` and `decisions` are optional file paths the skill Reads itself when non-empty). Add a `## Contract` line: Read `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` first; its `## Labels`, `## Finding IDs`, `## Report skeleton`, `## Verdict rules`, `## Debt file` and `## Decisions file` sections are binding; a missing `stage`/`since`, or a missing `prior` on `stage: re-review`, returns `VERDICT: FAIL` + `REASON: missing input <label>` and writes no report.
2. Rewrite `## Scope` (in `simplebuild-reviewer` this section does not exist yet - add it before `## Review`) per stage exactly as Task 1 `## Verdict rules` defines them (checkpoint: full read of `git diff <since>..HEAD`; final: the same plus the integration mandate over the whole build - contracts consumed across tasks per the plan's `### Contracts`, `CARRY:` lines from the notes dir, failure branches crossing tasks; re-review: verdict table for every `prior` ID first, then only the fix diff, no rank inflation, new Critical/Important only when fix-introduced). Style, polish and naming are never findings at any stage.
3. Add `## Gates` as the first working step, referencing Task 1 `## Gates` for the whole procedure (which commands, rerun rule after a fix, BLOCKED on an unrunnable documented command, the no-suite sentence) - no restatement.
4. Keep the existing quality/architecture/testing/production-readiness checks and the duplicated-derived-value greps (`??`, `||`, defaults, `UNDERSPECIFIED:` pairs), reword `## Calibration`: IDs per Task 1 `## Finding IDs`; Minor go to `## Debt` and are appended to `<workdir>/implementation/debt.md` (path = the `report` path's directory + `debt.md`) and never affect the verdict; a behaviour recorded under a task's `### Failure modes` or in the decisions file is a decision -> `NOTE: plan defect`, never Critical/Important; drop the "acknowledge what was done well" instruction. In `simplebuild-reviewer` keep the plan-alignment gate for `checkpoint` and `final`, skip it on `re-review`, and add BLOCKED for a header criterion unmet through a recorded decision.
5. Replace `## Report` with the skeleton reference (write the report in the exact `## Report skeleton` shape from the contract; always write it) and `## Output format` with the three-verdict return channel (`VERDICT: PASS|FAIL|BLOCKED`, `REVIEW: <path>` on FAIL and BLOCKED). Lint both with `lint_skill.sh`; keep each file under 110 lines.

### Edge cases
- `since` is `none` (no git): unbounded review, stated under `## Gates`; `prior` still verdicted by ID.
- A `prior` report in the pre-change format: handled per Task 1 `## Finding IDs` (fresh IDs, note in `## Notes`).
- A `decisions` file present: every line is plan text; a criterion listed there is neither Critical nor BLOCKED again.
- Both BLOCKED and FAIL conditions present: return `VERDICT: BLOCKED` (the report still lists the Critical/Important findings).

### Contracts
- Consumes Task 1 in full; the report on disk is consumed by Task 8's implementors (fix mode) and by the next round's reviewer as `prior`.

### DoD
Both reviewer skills implement the stage semantics, gates, IDs, debt file, decisions input, plan-defect rule and the three-verdict channel by referencing `review-contract.md`; greps hold; portability sweep green.

<!-- /TASK -->

<!-- TASK -->

## Task 10 - feat(superdev): spec reviewer runs the full suite first and returns BLOCKED
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #11, #20, #21

### Dependencies
- 1, 6 - blocks: 11, 12

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (`## Input` preloads for `stage`, `since`, `prior`, `decisions`; `## Contract`; new `## Gates` first step; `## Review`; `## Calibration`; `## Report`; `## Output format`)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass

#### Tests
- `grep -c "sed -n 's/^\[\[:space:\]\]\*\(stage\|since\|prior\|decisions\):" superdev/skills/superbuild-reviewer-spec/SKILL.md` - expected: `4`
- `grep -n '^## Gates\|^## Review' superdev/skills/superbuild-reviewer-spec/SKILL.md` - expected: two hits, `## Gates` on the lower line number
- `grep -n 'VERDICT: BLOCKED' superdev/skills/superbuild-reviewer-spec/SKILL.md` - expected: at least one hit
- `! grep -n 'base:' superdev/skills/superbuild-reviewer-spec/SKILL.md` - expected: no output, exit 0

### Approach
1. Through `supercc:skill-designer`, replace the `Base SHA:` preload with the four label preloads (`stage`, `since`, `prior`, `decisions`) in the existing `report:` pipeline shape and add the `## Contract` line pointing at `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` with the same missing-input rule as Task 9.
2. Insert `## Gates` as the first working step, referencing Task 1 `## Gates` for the procedure (results recorded before the coverage table) - no restatement.
3. In `## Review` keep the per-criterion coverage, plan consumption and deviations checks; on `stage: re-review` verdict every `prior` ID first (table per skeleton) and re-check only the criteria those IDs map to plus `git diff <since>..HEAD`; in `## Calibration` replace "Missing or partial -> Critical" with: missing or partial because code is missing -> Critical; unmet because of a decision recorded in the plan, the notes or the `decisions` file -> `### Needs decision` entry and `VERDICT: BLOCKED`; a `decisions` line is plan text.
4. Rewrite `## Report` to the contract skeleton with the spec-specific `## Coverage` table placed between `## Gates` and `## Prior findings`, and `## Output format` to the three-verdict channel. Lint with `lint_skill.sh`; keep the file under 100 lines.

### Edge cases
- No `Test Commands` in the plan and no documented command: `## Gates` states it and the review proceeds on reading alone, never PASS-by-assumption for a criterion that needs a run (say so in the coverage line).
- Criterion unmet by a plan-sanctioned fallback (the plan says "if the measurement does not confirm, revert"): BLOCKED, not Critical.

### Contracts
- Consumes Task 1; the report is consumed by Task 8's implementors via `task:`/`more:`.

### DoD
The spec reviewer runs the gates first, verdicts prior IDs on re-review, returns BLOCKED for decision-bound or unrunnable criteria, and writes the skeleton report; greps hold; portability sweep green.

<!-- /TASK -->

<!-- TASK -->

## Task 11 - feat(superdev): orchestrators run checkpoints, budgeted final review, BLOCKED and limit escalation without editing files
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: criteria #6, #7, #9, #22, #23, #24, #25, #28

### Dependencies
- 1, 2, 3, 5, 8, 9, 10 - blocks: 12

### Files
- modify - superdev/skills/superbuild/SKILL.md (frontmatter `allowed-tools`/`disallowed-tools`; `## Mandatory Rules` interruption states; `## Step 1` `root:` and `<refs>`; `## Step 2` commit call, `### Checkpoint`; `## Step 3` final review; `## Step 4` close-out commit pathspec)
- modify - superdev/skills/simplebuild/SKILL.md (same sections with `simplebuild-reviewer` in both reviewer roles)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass

#### Tests
- `grep -n '^disallowed-tools: Edit, Write, NotebookEdit' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - expected: one hit per file
- `! grep -n '^allowed-tools:.*\(Edit\|Write\)' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - expected: no output, exit 0
- `grep -c 'stage: ' superdev/skills/superbuild/SKILL.md` - expected: at least `6`
- `grep -n '### Checkpoint' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - expected: one hit per file
- `grep -n 'record-decision.sh' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - expected: at least one hit per file
- `grep -n 'checkpoint-update.sh' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - expected: at least one hit per file
- `! grep -n '\bcd \|base: <base SHA' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - expected: no output, exit 0
- `diff <(sed -n '/^## Mandatory Rules/,/^## Config/p' superdev/skills/superbuild/SKILL.md) <(sed -n '/^## Mandatory Rules/,/^## Config/p' superdev/skills/simplebuild/SKILL.md)` - expected: no output (the two sections stay byte-identical)

### Approach
1. Through `supercc:skill-designer`, in both frontmatters remove `Write` and `Edit` from `allowed-tools` and add `disallowed-tools: Edit, Write, NotebookEdit`; in `## Mandatory Rules` add two named states after the existing tool-pool rule: "interrupted by limit" (an `Agent` or `Skill` result that reports the run ended early on an API error, a spend limit, a session limit or an HTTP 429 - the current harness phrasing is `Agent terminated early due to an API error: You've hit your ... limit` in a `failed` task notification; treat the phrasing as an example, match on the meaning) and "no report" (a reviewer returning without a `VERDICT:` line, or with `REVIEW:` naming a file that does not exist); in both states the only action is `AskUserQuestion` (retry after reset / abort); a retry re-dispatches the same call with the same arguments; neither state counts as a round or as an implementor FAIL; no work is ever finished from disk and no review is ever done by the orchestrator. Also state: never `cd`; every path handed to a fork, an agent or a script is absolute, built from the decompose index's `root:` line.
2. `## Step 1`: describe the new `root:` index line; compute `<refs>` (`printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"`) here instead of Step 4 and reuse it; the git-init branch calls `commit-task.sh "chore: initial commit" --path .` (the whole fresh tree declared explicitly). Define the tracked values the loop keeps: `head` (SHA from the last `commit:` line, initially `base:`), `since` (SHA of the last closed checkpoint, initially `base:`), `prior` (path of the last closed checkpoint report, initially none), `total` (task count from the index).
3. `## Step 2`: add `refs: <refs>` to every implementor dispatch; the task commit becomes `commit-task.sh "<task title>" <task-file> --notes <notes path>`; on exit 2 (`undeclared:` lines) escalate `AskUserQuestion` (include the listed paths: the user removes or stashes them, or names the ones to include - then retry the commit with `--path <path>` per included file / drop / abort); on success record `head` from `commit:`. After the commit of task `N` where `N` is a multiple of 5 and `N < total`, run `### Checkpoint` (a new subsection): invoke the code reviewer (`superbuild-reviewer-change` / `simplebuild-reviewer`) with `stage: checkpoint`, `since: <since>`, `prior: <prior>` (omit when none), `decisions: <workdir>/implementation/decisions.md` (only when the file exists), the existing `plan:`/`spec:` or `plan-header:`/`plan:`, `notes: <workdir>/implementation/`, `report: <workdir>/implementation/checkpoint-KK.md` (KK = checkpoint ordinal `01`, `02`, ...); then `### Fix loop` (shared subsection used by checkpoint and final): on `PASS` -> `since := head`, `prior := report`, then `bash "${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint-update.sh" <workdir> <since> <prior>` (also after every re-review PASS or user "accept" below, so `checkpoint.md` always holds the last closed checkpoint); on `BLOCKED` -> `AskUserQuestion` per finding under `### Needs decision` (accept as changed / fix / abort); every accepted item -> `bash "${CLAUDE_PLUGIN_ROOT}/scripts/record-decision.sh" <workdir> <ID> "<subject>" "<accepted text>"`, then re-run the same reviewer call with `decisions:` set (does not count as a round); on `FAIL` -> dispatch the implementor (`Agent`, no `model:`/`effort:`) with `refs:`, `plan-header:`, `plan:` (+ `spec:` on superbuild), `task: <report>`, `notes: <workdir>/implementation/fix-NN-notes.md` (NN = fix ordinal across the build), await `VERDICT:`; PASS -> `commit-task.sh "<fix title>" --notes <fix notes>` (exit 2 handled as above), `fix_since := head`, `head` from `commit:`; then re-review: same reviewer with `stage: re-review`, `since: <fix_since>`, `prior: <report>`, `report: <report basename>-reR.md` (R = re-review ordinal, `1` first); re-review `PASS` -> `since := head`, `prior := re-review report`; re-review `FAIL` or `BLOCKED` -> `AskUserQuestion` listing the open IDs (another round / accept with open findings / abort); "another round" repeats the fix dispatch and re-review with the next NN and R and asks again after it, every time; "accept" -> `since := head`, `prior := last report`, continue.
4. `## Step 3 - Final Review`: superbuild - invoke `superbuild-reviewer-spec` with `stage: final`, `since: <since>`, no `prior:` (the spec dimension has no earlier report), `decisions:` when the file exists, `report: <workdir>/implementation/review-01-spec.md`, then `superbuild-reviewer-change` with `stage: final`, `since: <since>`, `prior: <prior>` (omit when none), `report: <workdir>/implementation/review-01-code.md` - both before any fix; simplebuild - one `simplebuild-reviewer` call with `stage: final` and `report: <workdir>/implementation/review-01.md`. Any `BLOCKED` -> the BLOCKED branch of `### Fix loop` first. Any `FAIL` -> one implementor dispatch carrying every failed report (`task: <code report>`, `more: <spec report>` when both failed; `task: <spec report>` when only the spec failed) and one fix commit, then one `stage: re-review` per reviewer that had Critical/Important (`since: <fix_since>`, `prior: <its report>`, `report: <its report basename>-reR.md`); all PASS -> Step 4; otherwise `AskUserQuestion` (another round / accept with open findings / abort), repeated after every further round (each further round increments the fix NN and the re-review R). Reports commit: `commit-task.sh "chore(<track>): final review reports" --path <workdir>`.
5. `## Step 4`: pass `refs:` from Step 1; the close-out commit becomes `commit-task.sh "chore(<track>): close out adr, memory, rules and changelog" --path <workdir>` plus one `--path <path>` per path relayed in the writers' `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` lines. Keep the two `## Mandatory Rules` sections byte-identical between the skills; keep status-line style; lint both with `lint_skill.sh`.

### Edge cases
- `total <= 5`: no checkpoint; the final review runs with `since = base`, no `prior`.
- `total` an exact multiple of 5 (10, 15): the checkpoint after the last task is skipped; the final review's `since` is the SHA after the last closed checkpoint.
- Resume (`status: NN`): `head` from one read-only `git rev-parse HEAD`; `since` and `prior` from `<workdir>/checkpoint.md` (`since:` / `prior:` lines, written by `checkpoint-update.sh`) when the file exists, otherwise `since := base:` and no `prior` - so no task committed after the last closed checkpoint is ever skipped by the next one.
- `base:` equal to `none` (no git): no checkpoints, no commits, final review with `since: none`.
- The implementor returns `VERDICT: FAIL` + `REASON:` in a fix round: `AskUserQuestion` (retry / accept / abort), as today.

### Contracts
- Consumes Task 1 `## Labels` (every label line), Task 2's `commit-task.sh` options and stdout lines, Task 3's `root:` index line, Task 5's `record-decision.sh` and `checkpoint-update.sh` (+ `checkpoint.md`), Task 8's `refs:`/`more:`/`minor:` labels, Task 9/10's three-verdict channel. Report file names owned here: `checkpoint-KK.md`, `review-01-spec.md`, `review-01-code.md` (superbuild), `review-01.md` (simplebuild), and `<basename>-reR.md` for every re-review (`checkpoint-01-re1.md`, `review-01-code-re1.md`, `review-01-re2.md`, ...); `fix-NN-notes.md` numbered across the whole build.

### DoD
Both orchestrators: no `Edit`/`Write`; checkpoint every 5 committed tasks while tasks remain; final review with the 1 fix + 1 re-review budget and `AskUserQuestion` after every further round; BLOCKED handled via `record-decision.sh`; limit and no-report states escalate only; every path absolute from `root:`; greps and the Mandatory-Rules diff hold; portability sweep green.

<!-- /TASK -->

<!-- TASK -->

## Task 12 - docs(superdev): document the review chain, verify dashes and run the suite
- TDD: none
- Model: opus
- Effort: medium
- Covers: criteria #31, #34, #35

### Dependencies
- 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 - blocks: none

### Files
- modify - superdev/.claude-plugin/plugin.json (`description` of the plugin unchanged; verify `skills[]`/`agents[]` need no entry: no skill or agent was added, renamed or removed)
- modify - superdev/README.md (`## How it works` step 5, `### Simple track`, `### Super track` rows for the build orchestrators, implementors, task reviewer and the three reviewers)
- modify - CLAUDE.md (the `superdev` bullet under `## What this repo is`, the agents paragraph under `## Cross-plugin architecture invariants` naming the task reviewer, and the `docs/.workflows/` layout line listing the new run files)
- modify - superdev/hooks/content/manifest.md (new `## Build chain` section; the en dash on line 4 replaced by a hyphen)
- modify - superdev/skills/intent/SKILL.md (the two en dashes on lines 45 and 81 replaced by hyphens, through `supercc:skill-designer`)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass

#### Tests
- `node --test "tests/**/*.test.ts"` - expected: all tests pass
- `! grep -rn $'\u2013\|\u2014' superdev` - expected: no output, exit 0
- `! grep -rn $'\u2013\|\u2014' CLAUDE.md README.md` - expected: no output, exit 0
- `grep -n 'BLOCKED' superdev/README.md superdev/hooks/content/manifest.md` - expected: at least one hit per file
- `node -e "const p=require('./superdev/.claude-plugin/plugin.json'); console.log(p.skills.length, p.agents.length)"` - expected: `20 7`

### Approach
1. In `superdev/README.md` rewrite step 5 of the flow and the track tables to describe: the per-task gate with its failure pass (Super track), the checkpoint review every 5 committed tasks while tasks remain, the final review as an integration round with a budget of one fix dispatch and one scoped re-review followed by the user's decision, finding IDs and the `debt.md` / `decisions.md` / `checkpoint-KK.md` files, the `BLOCKED` verdict, and that the orchestrator never edits files and escalates every interruption.
2. In the root `CLAUDE.md` update the `superdev` bullet (the build pipeline description), the `docs/.workflows/` layout entry (new files under `implementation/`), and the agents paragraph so the task reviewer's failure pass and the reviewers' stage contract are named; add `superdev/references/review-contract.md` next to the mention of `superdev/references/`.
3. In `superdev/hooks/content/manifest.md` add a short `## Build chain` section (four lines: per-task gate with failure pass on the Super track; checkpoint review every 5 committed tasks while tasks remain; final review as an integration round with a budget of one fix dispatch and one scoped re-review, then the user decides; `BLOCKED` means a criterion needs the user's decision, not more code) and replace the en dash on its line 4 with a hyphen. Open `superdev/.claude-plugin/plugin.json`; confirm `skills[]` and `agents[]` need no entry (no skill or agent added, renamed or removed) and record that in the notes.
4. Replace the two en dashes in `superdev/skills/intent/SKILL.md` (lines 45 and 81) with hyphens, then run the full suite and both dash greps; fix any dash introduced by earlier tasks in `superdev/`, `CLAUDE.md` or `README.md` (plain hyphen).

### Edge cases
- A dash found inside a file this build did not touch and not listed above: fix it anyway (the criterion is repo-wide for `superdev/`), and record the file as a `touched:` line.

### Contracts
- none

### DoD
README and root CLAUDE.md describe the chain as built by Tasks 6-11; no dash characters under `superdev/`, `CLAUDE.md`, `README.md`; `node --test "tests/**/*.test.ts"` green.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
