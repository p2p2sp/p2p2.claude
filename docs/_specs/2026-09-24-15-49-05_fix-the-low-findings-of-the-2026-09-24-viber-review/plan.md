---
source: C:/Users/dario/.claude-p2p2/plans/spicy-growing-giraffe.md
---

# Fix the Low findings of the 2026-09-24 viber review

Build: skill `implementor`

## Goal

The 2026-09-24 review of the viber plugin (`docs/reviews/2026-09-24_viber-review.md`) left 43 open Low findings: script edge cases (unanchored plan markers, count-based unfinished checks, unvalidated `--skip`, heredocs the repo forbids, a plan gate that denies where it promised to fail open), contradictions between skill, agent and reference texts, stale documentation and stale dev-time rules. Every one was re-verified on the current tree and is still present. This change fixes each one that lives outside a `CLAUDE.md` and marks it done in the review document.

## Acceptance criteria

1. `config.sh` counts a switch as on only when its key starts at column 0 with the exact key name and its value is `true` in any letter case; an indented `qa: true` inside a group stays off; the tier comment says four tiers.
2. `plan-gate.sh` allows `ExitPlanMode` when its dispatch/verdict pairing read yields no well-formed result, and its `Contract:` header states argv, cwd, env and the files it reads.
3. No shipped viber script holds a heredoc; `merge-settings.sh` runs its merge program from a sibling `merge-settings.js` with unchanged behaviour.
4. `plan-index.sh`, `plan-path.sh`, `commit-task.sh` and `archive-run.sh` treat a TASK open or close marker as one only when it stands alone on its line, so a marker mentioned inside prose creates no task.
5. `archive-run.sh` and `plan-path.sh` decide "unfinished" by comparing the set of plan task ids against the ids listed under `done:` and `skipped:`, ignoring unknown and duplicate ids; a failed `git rm` in `archive-run.sh` exits 5.
6. `commit-task.sh --skip` refuses an id that is not a task of the plan (exit 3) and a task already done (exit 2), matching the id literally, never as a regex; a `--defer` target id is checked the same literal way.
7. `commit-task.sh` stages only `review-<id>-<n>.md` reports of the committed task, strips a leading `./` from every plan and argument path (so `./.temp/x` is refused like `.temp/x`), and its header documents the stdout lines of every form.
8. `plan-index.sh` rejects a contract block without `File:` outside `--split` even when no block of the plan has one, keeps the legacy exemption under `--split`, and its header example titles carry no Conventional Commits type.
9. `check-playwright.sh` reports `@playwright/test: found` when any tracked `package.json`, not only the root one, names the package; `bootstrap.sh` recognises `/.temp`, `/.temp/`, `.temp/*`, `.temp/**` and `**/.temp/` as an existing ignore entry and appends no duplicate.
10. No viber agent carries `permissionMode:`; `planner-review` carries `effort: medium` and states that its input is fully resolved; `.claude/rules/agent-frontmatter.md` states that no agent carries `permissionMode:`.
11. The implementor skill gives a retry after a short `DOD:` line a non-empty reason, states once that only coder, reviewer and repair dispatches carry `model`, drops `Read` from `allowed-tools`, and ties `<plan>` to the `path:` value.
12. The test-runner agent no longer promises a one-line report or returns an unread `FAILED:` line.
13. The planner skill's "keep every section" admits the sections a template comment says to drop, and the idea skill's draft-mode rule admits the round question of a returning draft.
14. The QA format gives the handoff file its own `## Out of scope` section, names the run directory without a hardcoded `docs/_specs/`, and qa-writer places an uncovered criterion in whichever document it writes.
15. The e2e skill's no-argument fallback searches both the runs and the specifications directories, skips the commit when no spec was kept and no BLOCKED was returned, and drops the untrue permission-classifier sentence.
16. The rules layer measures the directory budget over the rule files `Glob` returns, passes `**` as the scope of a repo-wide rule, limits admission to two new conventions per run, and drops rules-writer's redundant read line.
17. memory-writer drops its redundant read line.
18. Every node and rule budget is stated in bytes, the unit `wc -c` measures, in the scripts' headers, the doctrine, both map skills and the writer agents.
19. The setup skill states that a template `ask` entry leaves `deny`; the viber README names `node` (setup) and Playwright (e2e) as optional dependencies.
20. `test-strategy.md` scopes the unit-test rule to hosts with a test layer and criteria carrying a decision; `plan-rules.md` describes the commit subject as `T<n> - <title>` with no type prefix and splits the Exclusive, Reproduced and Block body rules into their script-enforced and review-gated halves.
21. `.claude/viber.yml` matches the setup template's comments and `tiers:` block with `adr: false` kept; `.claude/rules/_common.md` holds no em dash; the script and skill counters in `shell-preload-contract.md`, `shell-script-header.md` and `plugin-manifests.md` match the tree.
22. Every Low item of the review document fixed by this build carries the `WYKONANE - ` prefix.

## Scope

### File map

- modify - viber/scripts/config.sh - switch resolution, tier comment
- modify - tests/viber/config.test.ts - switch cases
- modify - viber/hooks/scripts/plan-gate.sh - fail-open pairing read, Contract header
- modify - tests/viber/plan-gate.test.ts - fail-open case
- modify - viber/skills/memory/scripts/memory-map.sh - heredoc-free loops, byte wording
- modify - viber/skills/rules/scripts/rules-map.sh - heredoc-free loop, byte wording
- modify - viber/skills/setup/scripts/merge-settings.sh - calls the sibling program
- add - viber/skills/setup/scripts/merge-settings.js - the settings merge program
- modify - viber/scripts/plan-index.sh - anchored markers, contract File rule, header titles
- modify - tests/viber/plan-index.test.ts - marker and File cases
- modify - viber/scripts/plan-path.sh - anchored markers, id-set progress
- modify - tests/viber/plan-path.test.ts - marker and id-set cases
- modify - viber/scripts/archive-run.sh - anchored marker, id-set gate, git rm exit
- modify - tests/viber/archive-run.test.ts - id-set cases
- modify - viber/scripts/commit-task.sh - anchored markers, skip/defer validation, trail filter, path normalization, header
- modify - tests/viber/commit-task.test.ts - skip, defer, trail, path cases
- modify - viber/scripts/check-playwright.sh - nested package.json probe
- modify - tests/viber/check-playwright.test.ts - monorepo case
- modify - viber/skills/setup/scripts/bootstrap.sh - .temp variants
- modify - tests/viber/bootstrap.test.ts - variant cases
- modify - viber/agents/*.md (ten with `permissionMode:`, plus planner-review) - frontmatter
- modify - .claude/rules/agent-frontmatter.md - permissionMode line
- modify - viber/skills/implementor/SKILL.md - retry reason, model line, allowed-tools, plan path
- modify - viber/agents/test-runner.md - report and return lines
- modify - viber/skills/planner/SKILL.md, viber/skills/idea/SKILL.md - contradictions
- modify - viber/references/qa-format.md, viber/agents/qa-writer.md - out-of-scope home, run directory
- modify - viber/skills/e2e/SKILL.md - fallback, skip rule, classifier sentence
- modify - viber/agents/rules-writer.md, viber/skills/rules/SKILL.md, viber/references/rule-admission.md - rules layer text
- modify - viber/agents/memory-writer.md, viber/agents/memory-node-writer.md, viber/skills/memory/SKILL.md, viber/references/node-doctrine.md - memory layer text
- modify - viber/skills/setup/SKILL.md, viber/README.md - merge description, dependencies
- modify - viber/references/test-strategy.md, viber/references/plan-rules.md - rule wording
- modify - .claude/viber.yml, .claude/rules/_common.md, .claude/rules/shell-preload-contract.md, .claude/rules/shell-script-header.md, .claude/rules/plugin-manifests.md - repo config and counters
- modify - docs/reviews/2026-09-24_viber-review.md - done marks

### Out of scope

- The three Low items whose fix is a `CLAUDE.md` edit (`viber/CLAUDE.md` repair tier and frozen `plan.md` lines, root `CLAUDE.md` e2e directory wording), plus the matching commit-subject and `merge-settings.js` wording in `viber/CLAUDE.md`: with `memory: true` that layer belongs to the build's close alone. Those items stay unmarked.
- The "Input is fully resolved" sentence missing from `task-reviewer.md` and `test-runner.md`: not a review finding.
- Making `plan-path.sh` and `plan-index.sh` independent of the working directory.
- Any High or Medium item, and any change to budget values.

## Tasks

<!-- TASK -->
### T1 - Tighten config switch resolution
- TDD: required
- Covers: #1
- Uses: C1
- Depends-on: none
- Files: viber/scripts/config.sh, tests/viber/config.test.ts
- Delivers: switch resolution by the C1 line shape, header lines stating the same rule, tier comment naming four tiers, tests for an indented switch, an upper-case key and an upper-case value.
- Verification: node --test tests/viber/config.test.ts -> every test passes
- DoD: an indented `qa: true` under a group resolves to off; `memory: TRUE` at column 0 resolves to on; `MEMORY: true` resolves to off; `directories.*` and `tiers.*` values resolve as before; the header describes the column-0, exact-key, any-case-value rule; the tier comment says four tiers
<!-- /TASK -->

<!-- TASK -->
### T2 - Make the plan gate pairing read fail open
- TDD: required
- Covers: #2, #3
- Uses: none
- Depends-on: none
- Files: viber/hooks/scripts/plan-gate.sh, tests/viber/plan-gate.test.ts
- Delivers: a pairing read with no heredoc whose empty or malformed result allows, a `Contract:` header naming argv, cwd, env and the files read, and a test producing the empty result through a failing `awk` stub first on PATH (`withStub`).
- Verification: node --test tests/viber/plan-gate.test.ts -> every test passes; grep -nE '<<[^<]' viber/hooks/scripts/plan-gate.sh -> no output
- DoD: an empty or malformed pairing result emits `allow`; every existing plan-gate test still passes; the header states argv, cwd, env and the transcript and plan files it reads; the script holds no heredoc
<!-- /TASK -->

<!-- TASK -->
### T3 - Remove heredocs from the memory and rules maps
- TDD: none
- Covers: #3, #18
- Uses: none
- Depends-on: none
- Files: viber/skills/memory/scripts/memory-map.sh, viber/skills/rules/scripts/rules-map.sh
- Delivers: the four loops of memory-map and the one of rules-map fed without a heredoc, keeping their counters in the current shell; header budget wording in bytes.
- Verification: node --test tests/viber/memory-map.test.ts tests/viber/rules-map.test.ts -> every test passes; grep -nE '<<[^<]|characters' viber/skills/memory/scripts/memory-map.sh viber/skills/rules/scripts/rules-map.sh -> no output
- DoD: neither script holds a heredoc; both test files pass unchanged; both headers state the budgets in bytes
<!-- /TASK -->

<!-- TASK -->
### T4 - Move the settings merge program into its own file
- TDD: none
- Covers: #3
- Uses: C2
- Depends-on: none
- Files: viber/skills/setup/scripts/merge-settings.sh, viber/skills/setup/scripts/merge-settings.js
- Delivers: the merge program as `merge-settings.js` beside the script, invoked per C2, program logic unchanged.
- Verification: node --test tests/viber/merge-settings.test.ts -> every test passes; grep -nE '<<[^<]' viber/skills/setup/scripts/merge-settings.sh -> no output; grep -n 'merge-settings.js' viber/skills/setup/scripts/merge-settings.sh -> one match
- DoD: `merge-settings.sh` holds no heredoc; `merge-settings.js` exists and reads its two paths as C2 states; the merge test file passes unchanged; the no-node fallback still prints the block
<!-- /TASK -->

<!-- TASK -->
### T5 - Anchor markers and require contract File lines in plan-index
- TDD: required
- Covers: #4, #8
- Uses: C3
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: TASK marker recognition per C3 in validation, split and count; the missing-`File:` rejection applied to every plan outside `--split`, exemption kept under `--split`; header text and example titles updated.
- Verification: node --test tests/viber/plan-index.test.ts -> every test passes
- DoD: a plan mentioning the marker mid-sentence in prose validates with its real task count; a plan whose contract appendix has no `File:` at all fails validation without `--split`; the same plan passes under `--split`; the header example titles carry no `chore:` or `feat:` prefix
<!-- /TASK -->

<!-- TASK -->
### T6 - Count plan-path progress by task ids
- TDD: required
- Covers: #4, #5
- Uses: C3
- Depends-on: none
- Files: viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: TASK marker recognition per C3 in progress and draft detection; progress computed from the set of plan task ids met by `done:` and `skipped:` ids.
- Verification: node --test tests/viber/plan-path.test.ts -> every test passes
- DoD: a run whose `done:` lists an unknown id or a duplicate id still reports as open; a plan mentioning the marker in prose keeps its real task count; a draft mentioning the marker in prose is still a draft
<!-- /TASK -->

<!-- TASK -->
### T7 - Gate archiving on task id sets
- TDD: required
- Covers: #4, #5
- Uses: C3
- Depends-on: none
- Files: viber/scripts/archive-run.sh, tests/viber/archive-run.test.ts
- Delivers: TASK marker recognition per C3; the unfinished gate comparing id sets; exit 5 on a failed `git rm`.
- Verification: node --test tests/viber/archive-run.test.ts -> every test passes
- DoD: a run whose settled lists name an unknown id in place of a real task is refused as unfinished; a run with every task in `done` or `skipped` archives; the `git rm` step exits 5 on failure
<!-- /TASK -->

<!-- TASK -->
### T8 - Validate skip and defer ids in commit-task
- TDD: required
- Covers: #4, #6
- Uses: C3, C4
- Depends-on: none
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: TASK marker recognition per C3 at every parse site; `--skip` and `--defer` id checks per C4; header exit lines updated.
- Verification: node --test tests/viber/commit-task.test.ts -> every test passes
- DoD: `--skip` with a contract id exits 3; `--skip` with `.*` exits 3; `--skip` with a done task exits 2; `--skip` with an open task still records it; `--defer` naming a contract id is refused with a warning; a plan mentioning the marker in prose keeps its real task total
<!-- /TASK -->

<!-- TASK -->
### T9 - Normalize paths and filter the review trail in commit-task
- TDD: required
- Covers: #7
- Uses: C5
- Depends-on: T8
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: leading `./` stripped from plan `Files` entries, claimant lookups and every path argument; the task trail staging only the task's own `review-<id>-<n>.md` reports; the stdout header per C5.
- Verification: node --test tests/viber/commit-task.test.ts -> every test passes
- DoD: a path argument `./.temp/x` is refused; a plan entry `./src/a.ts` stages `src/a.ts` without an unclaimed warning; committing task `T1` leaves a `review-T1-b-1.md` report unstaged; the header lists the C5 stdout lines
<!-- /TASK -->

<!-- TASK -->
### T10 - Probe nested package.json files for Playwright
- TDD: required
- Covers: #9
- Uses: none
- Depends-on: none
- Files: viber/scripts/check-playwright.sh, tests/viber/check-playwright.test.ts
- Delivers: the `@playwright/test` probe over the root and every tracked nested `package.json`, stdout lines unchanged, header updated.
- Verification: node --test tests/viber/check-playwright.test.ts -> every test passes
- DoD: a repo naming `@playwright/test` only in a tracked `apps/web/package.json` reports `found`; a repo naming it nowhere reports `not found`; an untracked nested `package.json` is not probed
<!-- /TASK -->

<!-- TASK -->
### T11 - Recognise .temp ignore variants in bootstrap
- TDD: required
- Covers: #9
- Uses: none
- Depends-on: none
- Files: viber/skills/setup/scripts/bootstrap.sh, tests/viber/bootstrap.test.ts
- Delivers: the existing-entry check accepting the `.temp` variants of criterion 9.
- Verification: node --test tests/viber/bootstrap.test.ts -> every test passes
- DoD: a `.gitignore` holding `/.temp/` gains no second `.temp` entry; one holding `.temp/**` gains none; one holding `!.temp/` still gains the entry
<!-- /TASK -->

<!-- TASK -->
### T12 - Align viber agent frontmatter
- TDD: none
- Covers: #10
- Uses: none
- Depends-on: none
- Files: viber/agents/closeout.md, viber/agents/e2e-writer.md, viber/agents/memory-auditor.md, viber/agents/memory-writer.md, viber/agents/qa-writer.md, viber/agents/rules-auditor.md, viber/agents/rules-writer.md, viber/agents/task-coder.md, viber/agents/task-reviewer.md, viber/agents/test-runner.md, viber/agents/planner-review.md, .claude/rules/agent-frontmatter.md
- Delivers: `permissionMode:` removed from the ten agents; `effort: medium` and "Input is fully resolved - never ask the user." in planner-review; one line in the agent-frontmatter rule stating that no agent carries `permissionMode:` because plugin subagents ignore it. Edited per supercc:skill-designer.
- Verification: grep -l permissionMode viber/agents/*.md -> no output; grep -c 'effort: medium\|Input is fully resolved' viber/agents/planner-review.md -> 2; grep -c permissionMode .claude/rules/agent-frontmatter.md -> 1; the skill-designer lint on each edited agent -> zero FAIL
- DoD: no viber agent file holds `permissionMode:`; planner-review holds `effort: medium`; planner-review's body opens with its role and the resolved-input sentence; the agent-frontmatter rule names the field as never carried
<!-- /TASK -->

<!-- TASK -->
### T13 - Fix the implementor skill's loose contract lines
- TDD: none
- Covers: #11
- Uses: none
- Depends-on: none
- Files: viber/skills/implementor/SKILL.md
- Delivers: retry `reason:` naming the short `DOD:` line when a PASS falls short; one skill-wide line that only coder, reviewer and repair dispatches carry `model`, replacing the local mentions; `Read` removed from `allowed-tools`; `<plan>` defined as the `path:` value of `plan-path.sh`. Edited per supercc:skill-designer.
- Verification: grep -n '^allowed-tools:' viber/skills/implementor/SKILL.md | grep -c 'Read' -> 0; grep -n 'path:' viber/scripts/plan-path.sh viber/skills/implementor/SKILL.md -> the script declares the line and the skill ties `<plan>` to it; the skill-designer lint on viber/skills/implementor -> zero FAIL
- DoD: the retry entry carries a reason for a short `DOD:` line; the skill states once that only coder, reviewer and repair dispatches carry `model`; no dispatch line repeats the no-model note; `allowed-tools` holds no `Read`; `<plan>` is defined as the `path:` value
<!-- /TASK -->

<!-- TASK -->
### T14 - Settle the test-runner report and return lines
- TDD: none
- Covers: #12
- Uses: none
- Depends-on: T12
- Files: viber/agents/test-runner.md
- Delivers: description and report instruction no longer promising one line; the `FAILED:` return line removed. Edited per supercc:skill-designer.
- Verification: grep -c 'FAILED:' viber/agents/test-runner.md viber/skills/implementor/SKILL.md -> 0 for both; the skill-designer lint on viber/agents/test-runner.md -> zero FAIL
- DoD: the agent returns no `FAILED:` line; its description no longer says one-line verdict; the report instruction describes one line per failure without calling the report one line
<!-- /TASK -->

<!-- TASK -->
### T15 - Remove the planner and idea self-contradictions
- TDD: none
- Covers: #13
- Uses: none
- Depends-on: none
- Files: viber/skills/planner/SKILL.md, viber/skills/idea/SKILL.md
- Delivers: planner's keep-every-section line admitting the sections a template comment says to drop; idea's never-offer-draft line admitting the round question of a returning draft. Edited per supercc:skill-designer.
- Verification: grep -n 'drop this section' viber/skills/planner/templates/spec-lite.md -> a match; grep -c 'template comment says to drop' viber/skills/planner/SKILL.md -> 1; grep -c 'returning draft' viber/skills/idea/SKILL.md -> 1; the skill-designer lint on viber/skills/planner and viber/skills/idea -> zero FAIL
- DoD: the planner rule names the template-comment exception; the idea draft-mode rule names the returning-draft exception; neither skill grows by more than one clause per rule
<!-- /TASK -->

<!-- TASK -->
### T16 - Give the QA handoff its own out-of-scope section
- TDD: none
- Covers: #14
- Uses: none
- Depends-on: T12
- Files: viber/references/qa-format.md, viber/agents/qa-writer.md
- Delivers: a `## Out of scope` section in the handoff template; the opening line naming the build's own run directory without a path; qa-writer placing an uncovered criterion in `qa.md` when it writes one, in the handoff otherwise. Edited per supercc:skill-designer.
- Verification: grep -c '## Out of scope' viber/references/qa-format.md -> 2; grep -c 'docs/_specs' viber/references/qa-format.md -> 0; grep -n 'Out of scope' viber/agents/qa-writer.md -> one match; the skill-designer lint on viber/agents/qa-writer.md -> zero FAIL
- DoD: both QA templates carry `## Out of scope`; qa-format names no hardcoded runs directory; qa-writer names which document takes the out-of-scope line
<!-- /TASK -->

<!-- TASK -->
### T17 - Fix the e2e skill fallback and skip rule
- TDD: none
- Covers: #15
- Uses: none
- Depends-on: none
- Files: viber/skills/e2e/SKILL.md
- Delivers: the no-argument fallback searching `docs/<runs>/*/qa.e2e.md` and `docs/<specs>/*/qa.e2e.md` and taking the newest; the skip to the final step when no `FILE:` was kept and no `BLOCKED` returned; the permission-classifier sentence removed. Edited per supercc:skill-designer.
- Verification: grep -n 'directories.runs' viber/scripts/config.sh -> a match; grep -cF 'docs/<runs>/*/qa.e2e.md' viber/skills/e2e/SKILL.md -> 1; grep -c 'permission classifier' viber/skills/e2e/SKILL.md -> 0; the skill-designer lint on viber/skills/e2e -> zero FAIL
- DoD: the fallback names both directories; the skip condition names kept files and BLOCKED results; no permission-classifier sentence remains
<!-- /TASK -->

<!-- TASK -->
### T18 - Correct the rules layer text
- TDD: none
- Covers: #16, #18
- Uses: none
- Depends-on: T12
- Files: viber/agents/rules-writer.md, viber/skills/rules/SKILL.md, viber/references/rule-admission.md
- Delivers: rules-writer measuring the directory with `wc -c` over the rule files `Glob` returns and dropping its redundant read line; rules SKILL passing `**` as a repo-wide rule's scope; admission capped at two new conventions per run; every rule budget and `<chars>` placeholder stated in bytes. Edited per supercc:skill-designer.
- Verification: grep -n 'OVER-FILE' viber/skills/rules/scripts/rules-map.sh viber/skills/rules/SKILL.md -> a match in both; grep -c 'characters\|<chars>' viber/agents/rules-writer.md viber/skills/rules/SKILL.md -> 0 for both; grep -c 'two new conventions' viber/references/rule-admission.md -> 1; the skill-designer lint on viber/agents/rules-writer.md and viber/skills/rules -> zero FAIL
- DoD: rules-writer never runs `wc -c` on a directory; rules-writer holds no read-before-change line; the repo-wide scope is `**`; admission counts conventions, not files; rule budgets read in bytes
<!-- /TASK -->

<!-- TASK -->
### T19 - Correct the memory layer text
- TDD: none
- Covers: #17, #18
- Uses: none
- Depends-on: T12
- Files: viber/agents/memory-writer.md, viber/agents/memory-node-writer.md, viber/skills/memory/SKILL.md, viber/references/node-doctrine.md
- Delivers: memory-writer's redundant read line removed; every node budget and `<chars>` placeholder stated in bytes. Edited per supercc:skill-designer.
- Verification: grep -n 'OVER-NODE' viber/skills/memory/scripts/memory-map.sh viber/skills/memory/SKILL.md -> a match in both; grep -c 'characters\|<chars>' viber/agents/memory-writer.md viber/agents/memory-node-writer.md viber/skills/memory/SKILL.md viber/references/node-doctrine.md -> 0 for each; the skill-designer lint on both agents and viber/skills/memory -> zero FAIL
- DoD: memory-writer holds no read-before-change line; node budgets read in bytes in the doctrine, the skill and both agents
<!-- /TASK -->

<!-- TASK -->
### T20 - Complete the setup merge description and README dependencies
- TDD: none
- Covers: #19
- Uses: none
- Depends-on: none
- Files: viber/skills/setup/SKILL.md, viber/README.md
- Delivers: the merge description naming the removal of template `ask` entries from `deny`; the README line on optional `node` for setup and Playwright for e2e in place of "No dependencies.". Edited per supercc:skill-designer.
- Verification: grep -n 'deny' viber/skills/setup/scripts/merge-settings.sh viber/skills/setup/SKILL.md -> a match in both; grep -c 'No dependencies' viber/README.md -> 0; the skill-designer lint on viber/skills/setup -> zero FAIL
- DoD: the setup skill states the ask-leaves-deny rule; the README names node and Playwright as optional
<!-- /TASK -->

<!-- TASK -->
### T21 - Correct the test-strategy and plan-rules wording
- TDD: none
- Covers: #20
- Uses: none
- Depends-on: none
- Files: viber/references/test-strategy.md, viber/references/plan-rules.md
- Delivers: the unit-test rule scoped to a host with a test layer and a criterion carrying a decision; the Title rule describing the subject `T<n> - <title>` with no type prefix; Exclusive, Reproduced and Block body each split into a `(script)` half matching what `plan-index.sh` rejects (for Exclusive: the value is `true`) and a `(review)` half.
- Verification: grep -n 'Repro' viber/scripts/plan-index.sh viber/references/plan-rules.md -> matches in both, with a `(script)` rule in plan-rules; grep -c 'committed verbatim' viber/references/plan-rules.md -> 0
- DoD: the unit-test rule no longer contradicts the `TDD: none` rules; the Title rule names the real subject form; Exclusive, Reproduced and Block body each carry one `(script)` and one `(review)` line
<!-- /TASK -->

<!-- TASK -->
### T22 - Refresh repo config and dev-time rule counters
- TDD: none
- Covers: #21
- Uses: none
- Depends-on: T2, T4, T9
- Files: .claude/viber.yml, .claude/rules/_common.md, .claude/rules/shell-preload-contract.md, .claude/rules/shell-script-header.md, .claude/rules/plugin-manifests.md
- Delivers: `.claude/viber.yml` with the template's comments and `tiers:` block and `adr: false` kept; `_common.md` without its em dash; preload count, runtime call list (with `archive-run.sh` from closeout and the map `--reset` calls), script and `set` counts, Contract-header count and skill list recounted against the tree.
- Verification: diff <(grep -v '^adr:' viber/skills/setup/templates/viber.yml) <(grep -v '^adr:' .claude/viber.yml) -> no output; LC_ALL=C grep -c $'\xe2\x80\x94' .claude/rules/_common.md -> 0; git ls-files '*.sh' | grep -vc '^docs/\|^tests/\|^\.github/' -> the count the rules state
- DoD: `.claude/viber.yml` differs from the template only in `adr: false`; `_common.md` holds no em dash; every counter and list in the three rules matches the tree
<!-- /TASK -->

<!-- TASK -->
### T23 - Mark the fixed Low items done in the review
- TDD: none
- Covers: #22
- Uses: none
- Depends-on: T1, T2, T3, T5, T6, T7, T9, T10, T11, T13, T14, T15, T16, T17, T18, T19, T20, T21, T22
- Files: docs/reviews/2026-09-24_viber-review.md
- Delivers: the `WYKONANE - ` prefix on every Low item this build fixed; the three `CLAUDE.md` items left unmarked.
- Verification: grep -c '^- WYKONANE - ' docs/reviews/2026-09-24_viber-review.md -> the earlier count plus the Low items fixed; grep -n '^- `viber/CLAUDE.md' docs/reviews/2026-09-24_viber-review.md -> the two unmarked CLAUDE.md items
- DoD: every Low item fixed by T1 to T22 carries the prefix; the three CLAUDE.md items carry none; no other line of the document changes
<!-- /TASK -->

## Contracts

### C1 - Switch line

File: viber/scripts/config.sh

A switch `<key>` is on when the config file holds a line matching the extended regex `^<key>[[:space:]]*:[[:space:]]*[Tt][Rr][Uu][Ee]([[:space:]]|#|$)`, matched case-sensitively; off otherwise.

### C2 - Merge program invocation

File: viber/skills/setup/scripts/merge-settings.js

`node "<dir of merge-settings.sh>/merge-settings.js" "<template>" "<target>"`, the two paths read from `process.argv.slice(2)`; exit code passed through by `merge-settings.sh`.

### C3 - TASK marker line

File: none

Open: `^[[:space:]]*<!--[[:space:]]*TASK[[:space:]]*-->[[:space:]]*$`
Close: `^[[:space:]]*<!--[[:space:]]*/TASK[[:space:]]*-->[[:space:]]*$` (the slash escaped where awk needs it)

### C4 - commit-task skip and defer refusals

File: viber/scripts/commit-task.sh

- `--skip <plan> <id>`: `<id>` not a task id of a TASK block (compared as a fixed string) -> stderr `error: no task '<id>' in <plan>`, exit 3.
- `--skip <plan> <id>`: `<id>` already listed under `done:` -> stderr `error: task '<id>' is already done - it cannot be skipped`, exit 2.
- `--defer <id>:<path>`: `<id>` not a task id (fixed string) -> stderr `warning: refused <id>:<path> - no task <id> in the plan`, entry skipped, commit continues.

### C5 - commit-task stdout by form

File: viber/scripts/commit-task.sh

- task (with `--unreviewed`, `--with`, `--defer`): `committed: <sha>`, `progress: x/N`
- `--landed`: `committed: <sha>`, `subject: <line>`, `progress: x/N`
- `<fix-number>`: `committed: <sha>`, `progress: unchanged`
- `--repair`: `committed: <sha>`, `subject: <line>`, `progress: unchanged`
- `--chore`, `--qa`, `--e2e`: `committed: <sha>`, `subject: <line>`
- `--skip`: `skipped: <id>`, `progress: unchanged` (no commit)
