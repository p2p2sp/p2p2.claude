# final review - review-01-code.md

## Gates

Delta under review: `git diff 3842058ec4e1ea4d3d87b7415c8ce36bbea9a2f1..HEAD` - one commit, `1a553e1` (Task 6), touching `CLAUDE.md`, `superdev/README.md` and the run's own bookkeeping files. On top of that delta this stage reads the whole build for the integration mandate.

Build blocks (every task's `#### Build`):

- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/adr` - exit 0, `FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/intent` - exit 0, `FAIL=0 WARN=1`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/phases` - exit 0, `FAIL=0 WARN=1`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan` - exit 0, `FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan` - exit 0, `FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild` - exit 0, `FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild` - exit 0, `FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/changelog-writer.md` - exit 0, `FAIL=0 WARN=1` (unchanged since the checkpoint round)
- Task 4 `#### Build` is `none - documentation only`, Task 6 `none - markdown only` - nothing to run

Test blocks:

- Task 1 - all five pass: `1`, `1`, exit 0, `1`, exit 0
- Task 2 - all five pass: `1`, `2`, `1`, `1`, exit 0 (test 1 run in the `.`-wildcard form the implementor recorded, the harness expanding `${CLAUDE_PLUGIN_ROOT}` in a verbatim run; the file content is byte-exact)
- Task 3 - both pass: `1`, exit 0
- Task 4 - all six pass: `1` per planner file, `1`, `1`, `1`, `1`, exit 0
- Task 5 - all nine pass: `test ! -e superdev/agents/adr-writer.md` exit 0; the recursive `adr-writer` guard exit 0; both `grep -c` pairs print `1` per file; `one line per ADR` prints `1`; `docs/adr/20260907140501` prints `2`; `git diff --quiet -- tests/` exit 0; `node --test tests/superdev/read-config.test.ts tests/superdev/bootstrap.test.ts` pass; `node --test "tests/**/*.test.ts"` pass; the dash guard exit 0
- Task 6 - all four pass now: the `adr-writer` guard exits 0, `grep -c '| \`adr\` |' superdev/README.md` prints `2`, `grep -c 'skills/adr' CLAUDE.md` prints `1`, the dash guard exits 0

Integration / e2e: `node --test "tests/**/*.test.ts"` - 705 tests, 705 pass, 0 fail, `tests/` itself untouched (`git diff --quiet -- tests/` exit 0). That is the only suite this host documents.

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | Absolute ADR path in changelog | ADDRESSED | superdev/agents/changelog-writer.md:48 - `## Write` requires the bullet to carry the path repository-relative, from the value's `docs/adr/` segment onward; :51 extends it to the `(ADR: ...)` citation and :60 adds the `## Validate` assertion. Unchanged by this round |
| M1 | Unrelated file in task commit | NOT ADDRESSED | docs/handoff.md:1 - still present and still inside `ee8ba13`; no `minor:` dispatch was made, and a Minor never affects the verdict |
| M2 | ADR task block fence unwrapping | NOT ADDRESSED | superdev/references/adr-task.md:29 - the four-backtick display fence around `## Task block` stands and `## Fill rules` (:7) still says nothing about dropping it |
| M3 | In-fence headings read as sections | NOT ADDRESSED | superdev/skills/adr/SKILL.md:66-67 - the optional `## Considered Options` / `## Consequences` still sit at column 0 inside the fenced body |
| M4 | Dead resume branch extended | NOT ADDRESSED | superdev/skills/intent/SKILL.md:109 - the `Resume:` bullet under `## Synthesis` is unchanged; both `## Resume from a file` branches still go straight to `## Handoff` |
| M5 | Input line still equates value and bullet | NOT ADDRESSED | superdev/agents/changelog-writer.md:23 - `## Input` still reads "Every one of those `adr:` values becomes an `ADR:` bullet of the entry" |
| M6 | Fix recorded with no test and no reason | NOT ADDRESSED | docs/.workflows/2026-09-16-adr-in-planning/implementation/fix-01-notes.md:1 - the status line is still a bare `I1: fixed`, with no test and no `no test: <reason>` |

## Findings

### Critical

- none

### Important

- none

### Needs decision

- none

## Debt

- M7 - ADR collection attributed to the writer - CLAUDE.md:59 - the `superdev` bullet says `changelog-writer` finds and links every ADR "through `git diff` over `docs/adr/`", but that `git diff --name-only --diff-filter=A <base>..HEAD -- <root>/docs/adr/` is run by the orchestrator (superbuild/SKILL.md:140, simplebuild/SKILL.md:130), which hands the agent ready `adr:` lines; `changelog-writer.md` runs no git command of its own beyond `date`/`rev-parse`. A maintainer following the root file would look for the collection step in the agent, where it does not exist. Fix: say the orchestrator collects them with `git diff` and passes them to `changelog-writer` as `adr:` lines.
- M8 - Resume entry point undocumented - CLAUDE.md:54 - the bullet says the `adr` skill is "invoked by `intent` only at the synthesis", and superdev/README.md:110 says "Invoked by `intent` at the synthesis, never by you", while `superdev/skills/intent/SKILL.md:26` invokes it a second time from the `## Resume from a file` reopened-decision branch, a path that never enters `## Synthesis`. Criterion `Resume` (#12) depends on that second call, so the two documents Task 6 owns describe one of the skill's two entry points. Fix: add the reopened-decision call to both sentences.

## Notes

- Integration mandate, `### Contracts` entries another task consumes, all verified against the delivered files: Task 1's `## ADR` block shape (`### <slug>`, `Decision:`, optional `Supersedes:`, one fenced markdown body) is consumed unchanged by `intent`'s synthesis and resume branches (SKILL.md:26, :110), by `phases` (`## Phase intents`:74, a verbatim copy with no parsing) and by `adr-task.md`'s `## Fill rules` (:9-25, which keys on exactly those four parts); the `decision: <n>` argument and the `ADR: <k> accepted` / `ADR: none` output line are consumed verbatim at `intent/SKILL.md:26` and :110; Task 4's `adr-task.md` `## Task block` is consumed by Task 5's `git diff` over `docs/adr/`, and its directory-declared `### Files` entry `- add - docs/adr/ (<slug>.md per ADR, ...)` does normalise to `docs/adr` through `commit-task.sh`'s parser (verb strip, then `${entry%% (*}`), so the stamped file names fall inside the declared set; Task 5's repeatable `adr:` label matches `changelog-writer`'s `## Input`:18 and :23.
- Cross-task failure branches: the `adr:` gate wording is duplicated across `intent/SKILL.md`:21, `superbuild/SKILL.md`:42 and `simplebuild/SKILL.md`:42 and the three agree exactly ("reads exactly `true`; anything else - `false`, absent, an unresolved block, a missing config file - means skip"), matching `read-config.sh`'s always-exit-0 fail-open contract. The wave 2 ADR paragraph is byte-identical in both orchestrators; the only difference between their `changelog-writer` dispatch lines is the Super-track-only `spec:` label, which is correct.
- `decompose.sh`'s `Covers:` parser extracts `#[0-9][0-9]*` tokens, so the ADR task's `- Covers: \`ADR\` (intent \`## ADR\`)` yields none and takes the warning path at :403 rather than the hard error at :410 - exactly what `adr-task.md`:77 tells the reader to expect.
- No `CARRY:` line exists anywhere under `implementation/`, so the integration mandate has none to close.
- No repeated default-literal or error-shape pattern appears across the changed files; the only cross-file repetition is the deliberate orchestrator duplication above. No two `UNDERSPECIFIED:` lines in the notes dir name the same field: Task 1's three concern offer sequencing, heading level and the fenced body's allowed content, Task 4's two concern the task title and the `- none` bullet form, and the fix round's one concerns the writer's path derivation; Task 1's "what else may appear inside the fenced ADR body" and Task 4's "`<title>` taken from the `# <Short title>` heading" agree.
- NOTE: plan defect - the worked example in `changelog-entry-format.md`:44 and :61 keeps the old `20260907140501` stamp shape while the new name pattern is `<YYYY-MM-DD-HHMMSS>`, so the file's one example contradicts the pattern the plan's own task writes. Task 5's Approach step 4 freezes that example on purpose and a test command pins the count at `2`; carried over from the checkpoint round, not re-raised.
- NOTE: plan defect - an accepted ADR whose `Decision:` names a decision that `phases` assigns to a later phase still lands in `phases/01-<slug>/intent.md` (`phases/SKILL.md`:74), leaving a pointer that phase 01's own `## Decisions` does not carry. Carried over from the checkpoint round, not re-raised.

## Assessment

The final delta is documentation only and lands Task 6 cleanly: no `adr-writer` reference survives anywhere under `superdev/`, `CLAUDE.md` or `README.md`, every gate is green including a fresh full run of the 705-test suite, and the integration mandate holds - each `### Contracts` entry is consumed in the shape its producing task declares, the two orchestrators stay in step, and the directory-declared ADR task file entry survives `commit-task.sh`'s parser. Two Minor documentation inaccuracies in the delta and six carried-over Minor stay open; none affects the verdict.

VERDICT: PASS
