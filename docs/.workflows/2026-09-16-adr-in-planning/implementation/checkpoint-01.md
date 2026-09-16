# checkpoint review - checkpoint-01.md

## Gates

Delta under review: `git diff c26bbca4f42ae43188232bc98389dc0a4923d802..HEAD` (Tasks 1-5 committed; Task 6 not yet implemented).

Build blocks (every task's `#### Build`):

- `lint_skill.sh superdev/skills/adr` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/skills/intent` - exit 0, `FAIL=0 WARN=1` (the frontmatter italics false positive the implementor recorded; the block accepts `FAIL=0 WARN=<n>`)
- `lint_skill.sh superdev/skills/phases` - exit 0, `FAIL=0 WARN=1`
- `lint_skill.sh superdev/skills/simpleplan` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/skills/superplan` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/skills/superbuild` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/skills/simplebuild` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/agents/changelog-writer.md` - exit 0, `FAIL=0 WARN=1`
- Task 4 `#### Build` is `none - documentation only`, Task 6 `none - markdown only` - nothing to run

Test blocks:

- Task 1 - all five pass (`1`, `1`, exit 0, `1`, exit 0); the failure-mode test `grep -c Supersedes` prints `4` (>= 2)
- Task 2 - all five pass (`1`, `2`, `1`, `1`, exit 0); the failure-mode test on the "exactly true" phrase prints `3` (>= 1). Command 1 was run with a `.` in place of the literal `$` because the harness expands `${CLAUDE_PLUGIN_ROOT}` before grep sees it; the file line itself is byte-exact as planned
- Task 3 - both pass (`1`, exit 0)
- Task 4 - all six pass (`1` + `1`, `1`, `1`, `1`, `1`, exit 0); the failure-mode test on "no longer resolves" prints `1`
- Task 5 - all nine pass: `test ! -e superdev/agents/adr-writer.md` exit 0; the recursive `adr-writer` guard exit 0 (no hit outside README.md); both `grep -c` pairs print `1` per file; "one line per ADR" prints `1`; `docs/adr/20260907140501` prints `2`; `git diff --quiet -- tests/` exit 0; `node --test "tests/**/*.test.ts"` - **705 tests, 705 pass, 0 fail**; the dash guard exit 0. Both failure-mode tests print `1` per file
- Task 6 - the `adr-writer` guard FAILS (still present in `superdev/README.md` / `CLAUDE.md`), the `adr` row count prints `1` (want `2`), `grep -c 'skills/adr' CLAUDE.md` prints `0` (want >= 1). Task 6 is not implemented yet; expected at a checkpoint taken while tasks remain, and not a finding

Independent verification of the one new runtime mechanism (Task 5, wave 2), read-only git only:

- `git diff --name-only --diff-filter=A <base>..HEAD -- <root-absolute>/docs/.workflows/` run from a repository SUBDIRECTORY - exit 0, prints repository-root-relative paths, exactly as the instruction claims
- the same command against a path that does not exist (`<root>/docs/adr/`) - exit 0, no output; the ordinary no-ADR build does not trip the "exits non-zero" branch
- `decompose.sh` lines 400-405 confirmed: a `Covers:` line carrying no `#<n>` token takes the `warning: ... has no 'Covers:' criteria - none appended` branch and continues, exactly as `adr-task.md` documents
- `commit-task.sh` `### Files` parser confirmed: the trailing-comment cut reduces the ADR task's `docs/adr/ (<slug>.md per ADR, name stamped at write time)` entry to `docs/adr`, so the directory declaration does stage the generated file

No e2e or integration suite in this host beyond `node --test "tests/**/*.test.ts"`, which ran green above.

## Findings

### Critical

- none

### Important

- I1 - Absolute ADR path in changelog - superdev/agents/changelog-writer.md:48 (also superdev/skills/superbuild/SKILL.md:140 and superdev/skills/simplebuild/SKILL.md:130) - the orchestrators derive the ADR list from `git diff --name-only`, which prints repository-root-relative paths, then deliberately re-absolutise it ("join it with `root:` and carry it as one `adr: <root>/<printed path>` line"), and `changelog-writer` writes "one header bullet `- ADR: <path>` per `adr:` value, in the order given" with no step turning the value back into a repository-relative path. The committed entry therefore reads `- ADR: C:/Projects/p2p2.claude/docs/adr/<stamp>-<slug>.md`. Why it matters: the changelog entry is a version-controlled deliverable read from other clones and other machines, every other path it carries is repository-relative, `superdev/references/changelog-entry-format.md` shows the bullet repository-relative in its own worked example (line 44) and warns to link only to durable artifacts under `docs/adr/` (line 73), and `intent`'s history agent is the documented consumer that follows those links and reports "its repo-relative path" (superdev/skills/intent/SKILL.md:42 and :49) - an absolute machine path breaks that consumer everywhere but this working copy. How to fix: keep the absolute value on the `adr:` label (the writer must Read the file) and state in `changelog-writer.md` `## Write` that the `- ADR:` bullet carries the path repository-relative, i.e. the `adr:` value with the repository-root prefix stripped; or have the orchestrators carry the repository-relative path `git diff` already printed on its own label and absolutise only for reading.

### Needs decision

- none

## Debt

- M1 - Unrelated file in task commit - docs/handoff.md:1 - a pre-existing 180-line decision document about the PREVIOUS run (`2026-09-16-reviewer-gates-through-executor`) is committed inside `ee8ba13` (Task 1) although it appears in no task's `### Files`, in no `touched:` line, and outside the run directory. `task-01-review-1.md` recorded it as untracked and concluded it "cannot be swept into this task's commit"; it was. Reverting Task 1 now also reverts an unrelated document.
- M2 - ADR task block fence unwrapping - superdev/references/adr-task.md:27 - `## Task block` is wrapped in a four-backtick display fence whose content holds a nested ```markdown fence that must survive the copy. `## Fill rules` is otherwise exhaustive about what to strip (angle-bracket annotations, marker order) yet never says to drop the outer fence, so a planner may copy it into the plan, where a task block is never fenced.
- M3 - In-fence headings read as sections - superdev/skills/adr/SKILL.md:66-67 - the optional `## Considered Options` / `## Consequences` sit at column 0 inside the block's fenced body, so an `intent.md` carrying one has a `##`-prefixed line between `## ADR` and `## History` that is not a section. `phases` copies "the master's `## ADR` section ... verbatim" (superdev/skills/phases/SKILL.md:74) by name; a reader that stops at the next column-0 `##` truncates the ADR, and the plan's ADR task then writes a truncated file.
- M4 - Dead resume branch extended - superdev/skills/intent/SKILL.md:109 - the `## Synthesis` `Resume:` bullet gained an ADR clause, but both branches of `## Resume from a file` go straight to `## Handoff` and never enter `## Synthesis`, so the clause is unreachable. The implementor recorded this in `task-02-notes.md` and kept it as the safety net Approach step 3 asked for; it is dead instruction text either way.

## Notes

- NOTE: plan defect - Task 5 Approach step 4 deliberately freezes the `changelog-entry-format.md` worked example at the old `20260907140501` stamp shape, and the Task 5 test `grep -c 'docs/adr/20260907140501'` prints `2` enforces it, so the one reference the changelog writer reads now illustrates a filename shape the new ADR task can never produce (`<YYYY-MM-DD-HHMMSS>`). The spec puts the changelog format out of scope beyond the one bullet, so this is the recorded decision, not a code defect.
- The ADR block's `Decision: <question> (decision <n>)` pointer survives into phase 01 verbatim while `phases` copies only that phase's own `## Decisions` blocks, so a phase-01 intent can carry an ADR whose decision number is absent from its own `## Decisions`. That is exactly what criterion `Fazy` (#13) asks for (one ADR, written exactly once) - recorded so the dangling pointer is on the record, not raised as a finding.
- `read-config.sh` resolves `.claude/superdev.yml` against the process cwd, so `intent`'s new `## Config` preload reads every switch as `false` when the session started in a subdirectory. Identical to the existing `superbuild` / `simplebuild` preload and outside this delta; the documented failure mode (a missing config file means skip) covers the outcome.
- Task 5's claim that `superdev/hooks/content/manifest.md` owes this change nothing was verified: the manifest matches neither `adr` nor `ADR`.

## Assessment

Tasks 1-5 are coherent and every declared gate is green, including the full 705-test suite with `tests/` untouched, and the one genuinely new runtime mechanism - the wave 2 `git diff` over `docs/adr/` - was verified end to end against real git, including from a subdirectory and against a path that does not exist. One Important remains: the ADR path handed to `changelog-writer` is absolutised on the way in and written straight into the committed entry, breaking the repository-relative convention the changelog format and `intent`'s history agent both depend on.

VERDICT: FAIL
