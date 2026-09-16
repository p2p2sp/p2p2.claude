# re-review review - checkpoint-01-re1.md

## Gates

Delta under review: `git diff 82792ffa69ea352bf42cd170d3870fcce8710251..HEAD` - one commit, `3842058` (fix round 1), touching `superdev/agents/changelog-writer.md` plus the run's own bookkeeping files.

Build blocks (every task's `#### Build`):

- `lint_skill.sh superdev/skills/adr` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/skills/intent` - exit 0, `FAIL=0 WARN=1`
- `lint_skill.sh superdev/skills/phases` - exit 0, `FAIL=0 WARN=1`
- `lint_skill.sh superdev/skills/simpleplan` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/skills/superplan` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/skills/superbuild` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/skills/simplebuild` - exit 0, `FAIL=0 WARN=0`
- `lint_skill.sh superdev/agents/changelog-writer.md` - exit 0, `FAIL=0 WARN=1` (the same single warning the prior round recorded; the fix added none)
- Task 4 `#### Build` is `none - documentation only`, Task 6 `none - markdown only` - nothing to run

Test blocks:

- Task 1 - all five pass (`1`, `1`, exit 0, `1`, exit 0)
- Task 2 - all five pass (`1`, `2`, `1`, `1`, exit 0)
- Task 3 - both pass (`1`, exit 0)
- Task 4 - all six pass (`1` + `1`, `1`, `1`, `1`, `1`, exit 0)
- Task 5 - all nine pass: `test ! -e superdev/agents/adr-writer.md` exit 0; the recursive `adr-writer` guard exit 0; both `grep -c` pairs print `1` per file; `one line per ADR` prints `1`; `docs/adr/20260907140501` prints `2`; `git diff --quiet -- tests/` exit 0; `node --test tests/superdev/read-config.test.ts tests/superdev/bootstrap.test.ts` - 23 tests, 23 pass, 0 fail; `node --test "tests/**/*.test.ts"` - 705 tests, 705 pass, 0 fail; the dash guard exit 0
- Task 6 - the `adr-writer` guard still FAILS (present in `superdev/README.md` / `CLAUDE.md`), the `adr` row count prints `1` (want `2`), `grep -c 'skills/adr' CLAUDE.md` prints `0` (want at least `1`). Task 6 is still not implemented; expected at a checkpoint taken while tasks remain, and not a finding

Integration / e2e re-run, mandatory at this stage: `node --test "tests/**/*.test.ts"` was re-run against the fixed tree, not carried over - 705 pass, 0 fail, `tests/` itself untouched. No other e2e or integration suite in this host.

Verification of the fix itself, read-only: the `adr:` value the orchestrators build is `<root>/<path printed by git diff --name-only>`, and that printed path is repository-root-relative and always begins `docs/adr/` (the pathspec is `<root>/docs/adr/`). Taking the value "from its `docs/adr/` segment onward" therefore yields exactly the repository-relative path, so the rule the fix states is derivable from the input the writer actually receives.

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | Absolute ADR path in changelog | ADDRESSED | superdev/agents/changelog-writer.md:48 - `## Write` now states the bullet carries the path repository-relative, from the value's `docs/adr/` segment onward, never the absolute value; :51 extends the same rule to the `(ADR: ...)` citation in `## Decisions`; :60 adds a `## Validate` bullet asserting every ADR path in the entry starts with `docs/adr/`. Fix option 1 of the finding was taken, so both orchestrators stay unchanged and Task 5's `### Contracts` line ("one absolute path per line") still holds |
| M1 | Unrelated file in task commit | NOT ADDRESSED | docs/handoff.md:1 - the file is still present and still inside `ee8ba13`; the round was not dispatched a `minor:` line, and a Minor never affects the verdict |
| M2 | ADR task block fence unwrapping | NOT ADDRESSED | superdev/references/adr-task.md:27 - the four-backtick display fence and the silent `## Fill rules` are unchanged |
| M3 | In-fence headings read as sections | NOT ADDRESSED | superdev/skills/adr/SKILL.md:66-67 - the optional `## Considered Options` / `## Consequences` still sit at column 0 inside the fenced body |
| M4 | Dead resume branch extended | NOT ADDRESSED | superdev/skills/intent/SKILL.md:109 - the `Resume:` bullet under `## Synthesis` is unchanged and still unreachable |

## Findings

### Critical

- none

### Important

- none

### Needs decision

- none

## Debt

- M5 - Input line still equates value and bullet - superdev/agents/changelog-writer.md:23 - the `## Input` section still reads "Every one of those `adr:` values becomes an `ADR:` bullet of the entry", which is now only true of the order and the count: `## Write` requires the bullet to carry a path derived from the value, not the value itself. The two sentences sit in the same file the fix touched; `## Write` and `## Validate` are explicit enough to win, but the input line is the first thing the writer reads about ADRs.
- M6 - Fix recorded with no test and no reason - docs/.workflows/2026-09-16-adr-in-planning/implementation/fix-01-notes.md:1 - the status line is a bare `I1: fixed` while the round added neither a test nor a gate command asserting the new rule (`git diff --quiet -- tests/` still exits 0, and no task's `### Test Commands` block greps for the repository-relative wording). The contract's fix-mode rule asks for a test that fails before the fix and passes after it, or the `I1: fixed - no test: <reason>` form when none can express it; neither was written, so nothing mechanical will catch a later edit that re-absolutises the bullet.

## Notes

- The fix went one step past the finding's text, extending the rule to the `## Decisions` `(ADR: ...)` citation and adding a `## Validate` assertion. Both are inside the same file and the same defect class, and the fix-notes record why; no new Critical or Important follows from that widening.
- `UNDERSPECIFIED: how the writer derives the repository-relative path` in `fix-01-notes.md` is the only recorded deviation of the round. The decision taken (segment-onward, not prefix-stripping) is the correct one for this agent: its prompt carries `workdir:` but no repository-root value, so prefix stripping was not available to it.
- The prior round's `NOTE: plan defect` lines about the frozen `changelog-entry-format.md` worked example and the phase-01 dangling decision pointer still stand; neither was touched by this round and neither is re-raised.
- Task 6 remains unimplemented, so its three gate commands still fail as designed for a checkpoint taken while tasks remain.

## Assessment

The one Important of the prior round is addressed at the right level: the rule now lives in the agent that writes the entry, covers both places an ADR path can appear, and is backed by a `## Validate` assertion, while the orchestrators and Task 5's contract stay untouched. Every gate is green on the fixed tree, including a fresh full run of the 705-test suite; the fix introduced no new Critical or Important, only two Minor observations about the same file and the round's bookkeeping.

VERDICT: PASS
