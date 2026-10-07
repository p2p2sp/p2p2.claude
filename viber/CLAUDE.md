# viber - the idea-to-commit workflow plugin

viber owns the pipeline that runs across its skills, agents, hooks, scripts and references: the `.claude/viber.yml` config, the run directory and its archive, the plan gate, and the user docs (`README.md`, `BRANCHING.md`, `PRODUCT.md`, the help page). Each subdirectory's own contracts live in its node; this file carries only what spans them.

## Terms

- Run: one approved plan being built in `docs/<directories.runs>/<yyyy-mm-dd-HH-mm-ss>_<slug>/` (default `_specs`), its directory name being the run key. The archive is `docs/<directories.specifications>/<same name>/` (default `specs`).
- Switch: a key of `.claude/viber.yml` that counts only as a child of its own group (`build.qa`, never a flat `qa`), on only when it reads `true`. `build.baseline-tests` is three-valued (`off`, `fast`, `full`); `build.extensions` is a map of agent entries, not a switch; `github.*-title`, `directories`, `tiers` and `branching` are settings.
- Fragment: `skills/<skill>/fragments/<name>.<value>.md`, the switch-dependent text a skill preloads through `scripts/switch-text.sh`. No file for a value means that value adds no text.
- Tier: `haiku` < `sonnet` < `opus` < `fable`. `implementor` clamps every dispatch into `tiers.min`..`tiers.max` and a retry climbs one tier; `fable` is reached only when a project names it.
- Close: the build's end steps after the final test run, in order `memory`, `rules`, `qa`, `extensions`, `cleanup`, each driven by its switch.

## Relationships

- Pipeline: `setup` once; `triage`, `create-issue` and `prototype` feed `intent` (or `fixer` for a bug); `intent` hands to `planner` (not user-invocable), which writes the plan in plan mode behind the plan gate; `implementor` (not user-invocable, entered from the approved plan's `source:` line) lands it with `scripts/plan-path.sh`, dispatches agents, commits each task with `scripts/commit-task.sh` and ends on the close, where the `closeout` agent writes `outcome.md` and calls `scripts/archive-run.sh`. `tdd` is a worker skill; `e2e`, `create-pr`, `memory`, `rules`, `extension`, `code-auditor`, `help`, `handoff` and `commit` stand alone.
- Agents are dispatched only by viber skills, as `viber:<name>`; `hooks/scripts/plan-gate.sh` looks for dispatches of `viber:planner-review` and `viber:plain-plan-review` in the transcript, and `kill-guard.sh` acts only on an `agent_type` starting with `viber:`.
- `PRODUCT.md` holds the product assumptions (the four test layers `unit`, `component`, `integration`, `e2e`; one final test run; e2e only on explicit request) for maintainers; no shipped file reads it.
- `BRANCHING.md` is the full `branching:` schema, linked from `README.md` and from `skills/setup/templates/viber.yml`. `skills/setup/assets/help.html` is the bilingual (`en`/`pl`) usage guide `/viber:help` opens.
- Child nodes: `agents/CLAUDE.md`, `hooks/CLAUDE.md`, `references/CLAUDE.md`, `scripts/CLAUDE.md`, `skills/CLAUDE.md`.

## Contracts

- `scripts/config.sh` is the one parser of `.claude/viber.yml`: resolved against the repository root, always exit 0, every switch false without the file. Skills preload it, and `switch-text.sh`, `pr-facts.sh` and `plan-gate.sh` run it rather than reading the file; only the `directories.runs` readers listed under Change together parse the file themselves. `.claude/viber.local.yml` overrides exactly `tiers.min`, `tiers.max`, `build.baseline-tests` and `github.issues`.
- The column-0 `schema:` of `skills/setup/templates/viber.yml` is the layout the installed viber expects: `hooks/scripts/session-start.sh` compares the project's number to it, and `skills/setup/scripts/bootstrap.sh` raises the project's number to it, never lowers it.
- Run directory, one writer per file: `plan.md` by `plan-path.sh --land` (never edited after), `spec.md` and `tasks/T<n>.md` by `plan-index.sh --split`, `status.md` and `rulings.md` (`--rule`) by `commit-task.sh` alone, `qa.md`/`qa.e2e.md` by `qa-writer`, `outcome.md` by `closeout`. `archive-run.sh` drops the scaffolding `plan.md`, `status.md`, `tasks/`, `work/` and moves everything else to the archive in one commit.
- `implementor` opens no file: all it knows comes from its preloads and script stdout (`config.sh`, `run-clock.sh`, `plan-index.sh`, `plan-path.sh`), so a fact it needs is added to a script's output, never to a file for it to read.
- Every agent ends on a `VERDICT:` line; a refused tool call ends it on `VERDICT: DENIED` plus `REASON: <tool>: <command or path>`, which the dispatching skill turns into a question. The five `code-auditor` sweep agents (`scout`, `edge-scout`, `profiler`, `detective`, `critic`) carry no `DENIED` line.

## Change together

- A switch added, removed or renamed: `scripts/config.sh` (key grammar and its fixed stdout order), the key list of `scripts/switch-text.sh`, the switch list hard-coded in `skills/setup/scripts/bootstrap.sh`, `skills/setup/templates/viber.yml`, the `README.md` switch table, `help.html` in both languages, and `tests/viber/config.test.ts` / `switch-text.test.ts`.
- `directories.runs` is parsed with the same grammar (`[A-Za-z0-9._-]+`, not `.` or `..`, default `_specs`) in `scripts/config.sh`, `scripts/plan-path.sh`, and `scripts/archive-run.sh`.
- The plan's task block (`<!-- TASK -->` ... `<!-- /TASK -->`, `### T<n> - <title>`, the `- <Field>:` lines): `skills/planner/templates/tasks.md`, `references/plan-rules.md`, `scripts/plan-index.sh` (validates and splits), and `scripts/commit-task.sh` (commit subject from the heading, staging from `Files:`).
- `status.md`'s `done:`/`skipped:` lines: written by `commit-task.sh`, read by `plan-index.sh`.
- The plan frontmatter `source:` line: `skills/planner/templates/spec-full.md`/`spec-lite.md`, `planner/SKILL.md`, `implementor/SKILL.md` step 1 and `hooks/scripts/plan-gate.sh` (it picks `planner-review` over `plain-plan-review`).
- A user-facing behavior: `README.md` and `help.html` (`en` and `pl` spans) describe the same features.

## Traps

- A new switch reaches an existing project only when `/viber:setup` reruns, and session start asks for that rerun only while the project's `schema:` is below the template's.
- `bootstrap.sh` restores a deleted key of `planning:`, `build:`, `github:` or `directories:`, but appends `tiers:` or `branching:` only when the whole group is missing: a deleted child there silently resolves to its `config.sh` default.
- A switch written at column 0 or under another group reads as off, with no error.
- `BRANCHING.md`'s "part 2" (`releases:`, `version:`, release branches) does not exist: never implement or document it as present.
