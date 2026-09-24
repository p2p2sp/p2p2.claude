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
