# docs/archive/superdev/skills - the 20 frozen superdev skills and how they chain

Each skill is `<name>/SKILL.md` with its own `references/`, `templates/`, `assets/` or `scripts/` beside it. This area owns the skill-to-skill flow and the files skills share. The agents they dispatch, the shared `references/` and the plugin-level `scripts/` sit beside `skills/` in the parent directory, and the old tests belong to `docs/archive/superdev/tests/`.

## Terms

- Simple track: `intent` -> `simpleplan` -> `simplebuild`. Spec track: `intent` -> `superspec` -> `superplan` -> `superbuild`. Phases track: `phases` cuts one intent into phase intents at `docs/.workflows/<run>/phases/<NN>-<slug>/intent.md`, and each phase then starts again with `intent` on one of the other two tracks.
- Run directory: `docs/.workflows/<date>-<slug>/`. It holds the run's `intent.md`, `refresh.md`, `spec.md` and `phases.md`.

## Relationships

- Who starts whom (the Skill tool): the `intent` handoff gate runs `simpleplan`, `superspec` or `phases` with `intent: <path>`. `simpledebug` hands a proven fix to `simpleplan`. `superspec-refine` runs `intent` over an existing spec. `intent` calls `adr` only when the config's `adr:` is `true`.
- Each reviewer (`phases-reviewer`, `simpleplan-reviewer`, `superspec-reviewer`, `superplan-reviewer`) is a forked, read-only skill. Only its own author skill invokes it.
- Agents dispatched: `simplebuild` uses `simplebuild-task-implementor` and `simplebuild-reviewer`. `superbuild` uses `superbuild-task-implementor`, `superbuild-task-reviewer`, `superbuild-reviewer-spec` and `superbuild-reviewer-change`. Both builders use `qa-writer`, `memory-writer`, `rules-writer` and `changelog-writer`. `superdev-memory` uses `memory-writer`, `superdev-rules` uses `rules-writer` and `e2e` uses `e2e-writer`.
- No skill calls `executor`. Plugin-level `scripts/run-gate.sh` runs `executor/scripts/run.sh` directly.
- Shared files: `phases` reads `intent/references/intent-template.md`. `simpleplan`, `superplan` and `simpleplan-reviewer` read `references/plan-review-checklist.md`. The plan authors and both builders read `references/review-contract.md`, and the plan authors also read `references/adr-task.md`.
- `intent`, `simplebuild` and `superbuild` preload `scripts/read-config.sh`, which reads the `.claude/superdev.yml` switches.

## Contracts

- Build routing: a plan's first line, `# SimplePlan` or `# SuperPlan`, and its second line naming `simplebuild` or `superbuild` come from `simpleplan/templates/plan.md` and `superplan/templates/plan.md`. The `review-plan.sh` hook checks that pair, and a builder starts only from an approved plan that names it.
- A plan author saves the plan to the path plan mode's own message gives and writes that path into the plan's `Plan:` line before review. It calls `ExitPlanMode` only after its reviewer returns `VERDICT: PASS`. Reviewer arguments are a labelled block of paths, never pasted content.
- Refresh gate: `intent` writes `refresh.md` beside every `intent.md` it writes. For an intent under `docs/.workflows/` with no `refresh.md`, `superspec` and `simpleplan` hand that path back to `intent` and stop. They check only that the file exists and never read it.
- The `Intent:` line carries through the Spec track: `superspec-refine` keeps the spec's `Intent:` line unchanged, and `superplan` copies it verbatim into the plan.
- Both builders carry `disallowed-tools: Edit, Write, NotebookEdit` and make every change through agents and the plugin-level scripts.

## Change together

- `setup/assets/config.yml` seeds `.claude/superdev.yml`, and its keys (`adr`, `rules`, `memory`, `changelog`, `cleanup`, `stats`, `qa`, `e2e-ui`, `e2e-api`) are the fixed key list in `scripts/read-config.sh`.
- `simplebuild/SKILL.md` and `superbuild/SKILL.md` repeat the same config, wave and cleanup steps. A fix to one applies to the other.
