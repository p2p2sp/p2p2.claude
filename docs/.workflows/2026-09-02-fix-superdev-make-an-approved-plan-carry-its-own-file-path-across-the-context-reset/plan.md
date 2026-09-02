# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "fix(superdev): make an approved plan carry its own file path across the context reset"
Plan: C:\Users\dario\.claude\plans\breezy-stirring-duckling.md

---
<!-- HEADER -->

## Goal
Every approved plan declares its own file path in its preamble, the `ExitPlanMode` gate refuses to approve a plan that does not, and both build orchestrators resolve the plan file from that declared path after verifying it still holds the same plan. `decompose.sh` leaves no working directory behind when it fails.

## Context
When a plan is approved with "clear context", the harness injects `Implement the following plan:` plus the full plan text and the path of the PREVIOUS transcript - it never passes the plan file's path. Both build orchestrators need a PATH (`decompose.sh <plan-file>`), so after the reset they have no input and start guessing; one real run guessed the spec path and produced a garbage working directory. The plan file itself survives at the plan-mode path, so the fix is to stop losing the path: the plan writes it into its own preamble, the existing `ExitPlanMode` hook enforces that it is there, and the builds read it back. A separate defect rides along: `decompose.sh` creates its working directory before it validates anything, so every failing run orphans a directory tree.

## Acceptance criteria
1. Both plan templates carry a `Plan:` preamble line, and both plan skills instruct filling it with the plan-mode-given path while drafting, before the reviewer runs.
2. `review-plan.sh` denies `ExitPlanMode` when the resolved plan file is readable and carries no `Plan:` line naming that same plan file, and the deny reason tells the author to add the line.
3. `review-plan.sh` keeps its fail-open policy on the new gate: an unresolved, missing, or unreadable plan file still exits 0 with parseable JSON and never denies because of the `Plan:` check.
4. `superdev/hooks/hooks.json` `description` names the plan-path gate alongside the format and reviewer gates.
5. `decompose.sh` removes the working directory on every non-zero exit that occurs before the decomposition commit and that this run created, and never removes a working directory that already existed before the run.
6. `superbuild` and `simplebuild` Step 1 resolve `<plan-file>` from the plan's `Plan:` line, verify the file's `Title:` against the plan in context, and STOP with an explicit message when the file is missing or holds a different plan.
7. `node --test "tests/**/*.test.ts"` passes, including new cases for the plan-path gate (deny plus fail-open) and for `decompose.sh` exit 3 asserting no orphaned working directory.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - add the Plan preamble line to both plan templates and their skills
- Covers: criteria #1
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/skills/simpleplan/templates/plan.md (preamble, after the `Title:` line)
- modify - superdev/skills/superplan/templates/plan.md (preamble, after the `Spec:` line)
- modify - superdev/skills/simpleplan/SKILL.md (`### Rules`, the "Save the plan to the file path" bullet)
- modify - superdev/skills/superplan/SKILL.md (`### Rules`, the "Save the plan to the file path" bullet)

### Test Commands
#### Build
- `grep -n '^Plan:' superdev/skills/simpleplan/templates/plan.md superdev/skills/superplan/templates/plan.md` (repo has no build step; run this AFTER the edit - it exits 1 while the line is still absent)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. In `superdev/skills/simpleplan/templates/plan.md`, insert the line `Plan: <absolute path of this plan file, exactly as given by plan mode>` directly below `Title: "<title>"`, keeping the blank line and `---` that follow. The angle brackets are deliberate - this is template text and matches the placeholder style the template already uses for `Title:`.
2. In `superdev/skills/superplan/templates/plan.md`, insert the same `Plan:` line directly below the `Spec:` line, so the preamble order is `Title:`, `Spec:`, `Plan:`.
3. In both SKILL.md files, extend the existing `### Rules` bullet "Save the plan to the file path given in the plan mode tool's own message - never a hardcoded or assumed directory - and pass that same path to the reviewer as `plan:`." with a clause requiring that same path to be written into the plan's `Plan:` preamble line while drafting, before the reviewer is invoked - never after a `VERDICT: PASS`, because a post-verdict write re-arms the approval gate.

### Edge cases
- The value is an absolute path (the plan file lives outside the host repo), which is a deliberate exception to the repo-relative-paths guidance - state it in the template placeholder so authors do not "fix" it into a relative path.
- `decompose.sh` parses only `^Title:` and `^Spec:`; the `Plan:` line must stay outside the `<!--` HEADER `-->` markers so it is neither copied into `plan-header.md` nor added to the stdout index, whose full text is asserted byte-for-byte by `tests/superdev/decompose.test.ts`.

### Contracts
- Plan preamble gains one line: `Plan: <absolute plan-file path>`, at column 0, before the `---` that opens the body.

### DoD
Both templates carry the `Plan:` line, both `### Rules` bullets require filling it before review, and `node --test "tests/**/*.test.ts"` is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - gate ExitPlanMode on the plan declaring its own path
- Covers: criteria #2, #3, #4, #7
- TDD: none

### Dependencies
- Task 1 - blocks: the gate enforces the preamble line that Task 1 introduces

### Files
- modify - superdev/hooks/scripts/review-plan.sh (new gate after the Step 1b format gate, reusing `plan_path` / `plan_base`)
- modify - superdev/hooks/hooks.json (`description`)
- modify - tests/superdev/review-plan.test.ts (fixtures at `writePlanFile` / `writeCustomPlanFile` call sites, plus new cases)

### Test Commands
#### Build
- `bash -n superdev/hooks/scripts/review-plan.sh`
- `node -e "JSON.parse(require('fs').readFileSync('superdev/hooks/hooks.json','utf8'))"`

#### Tests
- `node --test tests/superdev/review-plan.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. In `review-plan.sh`, immediately after the Step 1b format gate (the block ending in the "declare the plan format" `emit_deny`), add a Step 1c guarded by `[ -n "$plan_path" ] && [ -f "$plan_path" ] && [ -r "$plan_path" ]`: read the first `^Plan:` line with `grep -m1`, strip the label and surrounding whitespace with `sed`, and take its basename by stripping through the last `/` or `\` the same way `plan_base` is derived.
2. `emit_deny` when that basename is empty or differs from `plan_base`, with a reason instructing the author to add `Plan: <plan-file path>` to the plan preamble, re-run the plan reviewer, then retry `ExitPlanMode` - phrased like the sibling gates, ending with "(This is the normal approval gate, not an error.)".
3. Compare basenames, not full paths, so a separator or drive-case difference between the transcript-recorded path and the author-written path cannot cause a false deny; an unreadable plan file falls through to allow, preserving the file-level fail-open policy the format gate already uses.
4. Update the `description` in `superdev/hooks/hooks.json` so it names the plan-path gate next to the existing format and `VERDICT: PASS` gates.
5. In `tests/superdev/review-plan.test.ts`, add a `Plan: <path>` line to every fixture that writes a REAL plan file and expects `allow` or a deny attributed to a later gate: `DF` (`simple.md`), `DFS` (`super.md`), the both-markers case (`both.md`), the multiple-plan-writes case (only `bar.md`, the LAST write and therefore the sole file that becomes `plan_path`; `foo.md` needs no line), and `CF` (`plans-custom/foo.md`, whose assertion matches `/simpleplan-reviewer/` and must keep reaching the reviewer gate).
6. Add new cases: a readable plan file with no `Plan:` line and a reviewer PASS denies with a reason naming the plan path line; a plan whose `Plan:` line names a different file denies; and a transcript whose plan path does not exist on disk - carrying the reviewer call and a PASS, so every other gate is satisfied and only the `[ -f ]` guard can decide - still allows, proving the fail-open guard.

### Edge cases
- The ~30 existing cases built on the `PLAN` constant point at a path that never exists on disk; the `[ -f ]` guard must keep them untouched, exactly as the format gate does today.
- `UF` expects a deny naming the SimplePlan format, so the new gate must sit AFTER the format gate, never before it.
- A plan file that is present but unreadable must allow, not deny - hook faults always fail open.

### Contracts
- New deny reason string emitted by `review-plan.sh` when the plan does not declare its own path.
- `hooks.json` `description` text.

### DoD
`node --test tests/superdev/review-plan.test.ts` is green with the new deny and fail-open cases, `bash -n` on the hook is clean, `hooks.json` parses, and `node --test "tests/**/*.test.ts"` is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - stop decompose.sh from orphaning its working directory on failure
- Covers: criteria #5, #7
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/scripts/decompose.sh (between the `dir=` assignment and the first `mkdir -p`, plus a disarm before the commit section)
- modify - tests/superdev/decompose.test.ts (new cases using the existing `simplePlan` / `taskBlock` / `withGitRepo` fixtures)

### Test Commands
#### Build
- `bash -n superdev/scripts/decompose.sh`

#### Tests
- `node --test tests/superdev/decompose.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. After `dir="docs/.workflows/$(date +%F)-${slug}"` and before the first `rm -rf`/`mkdir -p`, record whether the directory already existed in a flag variable, then install an `EXIT` trap whose first statement captures `$?` and which removes `$dir` only when the status is non-zero AND the flag says this run created it, finally re-exiting with the captured status.
2. Disarm the trap with `trap - EXIT` immediately before the `--- commit dekompozycji ---` section, so a git failure leaves the fully built working directory in place rather than destroying finished work.
3. Add a `decompose.test.ts` case for exit 3: a plan with a `Title:` and a HEADER block but no TASK block asserts `status === 3`, `stderr` matching decompose.sh's exact "no ... blocks found" awk error message, and that `docs/.workflows/<date>-<slug>/` does not exist afterwards.
4. Add a case proving the exit-4 path (a `Spec:` line pointing at a missing file) likewise leaves no working directory behind.
5. Add a resume-safety case: run a valid plan to success, then re-run with a plan of the SAME title whose task blocks are removed, and assert the pre-existing working directory still exists with `status.md` and `base.md` intact.

### Edge cases
- Resume must survive: the trap may not touch a directory that existed before the run, which is what the pre-existing-directory flag encodes.
- The trap must capture `$?` as its very first statement, before any command inside the handler overwrites it.
- `rm -rf "$dir/tasks"` already runs before the trap can help on a resumed run; the trap restores nothing, it only prevents brand-new orphans - do not widen its remit.

### Contracts
- none

### DoD
`node --test tests/superdev/decompose.test.ts` is green including the three new cases, `bash -n superdev/scripts/decompose.sh` is clean, the previously asserted stdout index and resume behaviour are unchanged, and `node --test "tests/**/*.test.ts"` is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - resolve and verify the plan file in both build orchestrators
- Covers: criteria #6
- TDD: none

### Dependencies
- Task 1 - blocks: the builds read the preamble line that Task 1 introduces

### Files
- modify - superdev/skills/superbuild/SKILL.md (`## Step 1 - Decompose Plan`)
- modify - superdev/skills/simplebuild/SKILL.md (`## Step 1 - Decompose Plan`)

### Test Commands
#### Build
- `grep -n 'Plan:' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` (repo has no build step; run this AFTER the edit - it exits 1 while the line is still absent)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. In both Step 1 sections, prepend a resolution instruction: take `<plan-file>` from the `Plan:` line of the approved plan already in context, never from a `Spec:` line and never from a guessed directory.
2. Add the identity check before the `decompose.sh` call: `grep -m1 '^Title:' <plan-file>` must equal the approved plan's own `Title:` line.
3. Add the failure branch: a missing file or a differing `Title:` -> STOP, report that the plan file at that path is absent or holds a different plan (a plan-slug collision overwrote it), and do not decompose. No fallback, no rewriting the plan from context.
4. Keep both edits inside the existing Step 1 prose and its orchestrator voice - short status lines, no added prose elsewhere in either skill.

### Edge cases
- An approved plan with no `Plan:` line can only come from a pre-change plan; STOP on the same branch rather than guessing a path.
- The check reads the file with one command and does not paste plan content anywhere, preserving the orchestrators' "every value is a PATH" rule.

### Contracts
- Step 1 input contract of both builds: `<plan-file>` comes from the plan's `Plan:` line and is identity-checked against `Title:` before decomposition.

### DoD
Both Step 1 sections resolve the path from `Plan:`, verify `Title:`, and STOP on mismatch or a missing file, and `node --test "tests/**/*.test.ts"` is green.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
