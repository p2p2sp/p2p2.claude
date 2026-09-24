# viber - interview, plan, build, remember

Every skill, agent and script here is a stage of one run, so most edits touch a contract two or
three files share. `PRODUCT.md` holds the product assumptions (unit tests far outnumber
integration tests, integration last and serial, one full-suite run at the close) that
`references/test-strategy.md` and `references/integration-tests.md` turn into rules: a change to
how tests are planned or run answers to it. `README.md` and `skills/setup/assets/usage.md` are the
user's view of the same commands and switches; keep both in step when either changes.

## Layout

```
skills/<name>/SKILL.md   9 skills; setup, memory, rules carry their own scripts/ (${CLAUDE_SKILL_DIR})
skills/planner/          templates/ (spec-lite, spec-full, tasks) + references/adr-tasks.md
agents/                  12 agents, each dispatched only by the skills its description names
scripts/                 7 plugin-wide scripts, shared across skills and agents
references/              read at runtime by agents through the `refs:` dispatch line
hooks/                   SessionStart manifest + PreToolUse plan gate
```

## The chain

- `idea` (interview) or `fixer` (RED reproduction test + diagnosis) -> `planner` -> `implementor`.
  `planner` treats any other input as unresolved and hands back to `idea`; `implementor` refuses a
  draft (a landed plan with no TASK block). `planner`, `implementor` and `tdd` are
  `user-invocable: false`, reached only through the chain (`tdd` through `task-coder`). `setup`,
  `e2e`, `memory` and `rules` are user-only commands (`disable-model-invocation: true`).
- Dispatchers: planner -> planner-review; implementor -> task-coder, task-reviewer, test-runner,
  memory-writer, memory-auditor, memory-node-writer, rules-writer, qa-writer, closeout; memory ->
  memory-auditor, memory-node-writer; rules -> rules-auditor, rules-writer; e2e -> e2e-writer. An
  agent's `description:` names its callers: update it when a skill starts or stops dispatching it.

## Orchestrator contract

- `implementor` opens no file and writes none. It knows only what arrives as text: the
  `config.sh` and `run-clock.sh` preloads, `plan-path.sh` and `plan-index.sh` stdout, and agents'
  return lines. So every script's stdout line format and every agent's `## Output` vocabulary
  (`VERDICT:`, `REASON:`, `DOD:`, `EXTRA:`, `DEFERRED:`, `REVIEW:`, `REPORT:`, `FILES:`, `OVER:`,
  `AUDIT:`, `DRIFT:`, `PATH:`) is an interface: renaming a line on one side without the branch
  that reads it on the other breaks the build with no error.
- Only coder, reviewer and repair-coder dispatches carry `model` (the task's profiled tier, clamped
  into `tiers.min`..`tiers.max`, ladder `haiku < sonnet < opus < fable`, `fable` only when the host
  names it). Every other dispatch, in the close and in the `memory`, `rules` and `e2e` commands,
  passes none: the agent's frontmatter is its strength.
- Coder output feeds the commit: `EXTRA:` becomes `--with`, `DEFERRED:` becomes `--defer`, stored
  as `deferred:` in `status.md` and handed to the owing task's coder and reviewer.
- task-coder, task-reviewer, test-runner and e2e-writer share a "Stop what you started" section
  (background work only through `run_in_background`, killed and `ps`-checked before returning);
  implementor's `SendMessage` on a "stopped with background work" notice is its other half.
- Coders and reviewers keep git read-only (never `stash`, `checkout`, `restore`, `clean`):
  parallel tasks share one working tree.

## Commit ownership

- Only scripts commit: `plan-index.sh --split` (the decomposition), `commit-task.sh` (every task,
  repair, close and e2e commit), `archive-run.sh` (the archive). No agent and no skill runs
  `git add` or `git commit`. `planner` leaves a landed draft uncommitted; the `memory` and `rules`
  commands leave their writes unstaged.
- `commit-task.sh` never takes a subject from its caller: a task commit is the plan's
  `### T<n> - <title>` line verbatim, every flag form derives its own. It stages only the paths it
  is named through literal pathspecs (`GIT_LITERAL_PATHSPECS`, for App Router `[id]` paths),
  refuses `.temp/`, and adds the run's `work/` trail by paths derived from the id or round.
- Never two `commit-task.sh` calls at once: each rewrites the git index and `status.md`.

## The run directory

`docs/<runs>/<stamp>_<slug>/` (`docs/_specs/` by default), landed by `plan-path.sh --land`, which
copies the plan-mode file and never moves it:

- `plan.md` - frozen once landed; nothing writes it again.
- `spec.md`, `tasks/<id>.md` - `plan-index.sh --split`, rebuilt from scratch on every call. A task
  file is a coder's whole input (its block with `DoD` cut into `DoD.<k>` lines, the Goal, its
  `Covers` criteria, its `Uses` contracts, `Must not change`, `Out of scope`); a coder never sees
  the plan.
- `status.md` - `progress`, `done`, `skipped`, `unreviewed`, `deferred`, `closed`. `commit-task.sh`
  is its only writer (`plan-index.sh` creates it empty); `plan-index.sh`, `plan-path.sh` (`open:`
  lines) and `archive-run.sh` read it.
- `work/` - coder notes, review and test reports, committed so a build resumes on another machine.
- `qa.md`, `qa.e2e.md` - `qa-writer`; `e2e-writer` appends the `## Automation` lines.

`archive-run.sh` moves the directory to `docs/<specifications>/<key>/` (`docs/specs/` by default),
dropping the enumerated scaffolding `plan.md`, `status.md`, `tasks/`, `work/` (anything else
travels), and refuses a run with a task in neither `done` nor `skipped`. `closeout` edits
`spec.md` before calling it, so the drift edit and the move land in one commit.

## The plan format is parsed in four places

The template shape (`<!-- TASK -->` / `<!-- /TASK -->`, `## Tasks`, `### T<n> - <title>`, the
fields `TDD`, `Covers`, `Uses`, `Depends-on`, `Files`, `Delivers`, `Verification`, `DoD`, optional
`Exclusive: true` and `Repro:`, a `## Contracts` appendix of `### C<n> - <name>` blocks opening on
`File:`) is read by `plan-index.sh` (validation, index, split), `plan-path.sh` (TASK-block count
for `draft` and `open:`, and a comment strip that must keep the TASK markers), `commit-task.sh`
(subject, `Files:` staging) and `archive-run.sh` (the unfinished check). A field or marker change
touches the templates, `references/plan-rules.md` and every parser reading it.

- In `plan-rules.md`, `(script)` means `plan-index.sh` rejects the breach and `(review)` means
  `planner-review` gates it: a rule moving between the two moves its enforcement with it.
- A landed plan is frozen, so a run resumed after an upgrade must still validate: a new
  `plan-index.sh` check stays exempt under `--split` (the Exclusive-leaf rule) or skips a plan
  predating it (a contract appendix with no `File:` line at all).

## Duplicated on purpose - change together

- `directories.runs` / `directories.specifications` parsing and sanitizing: `config.sh`,
  `plan-path.sh`, `archive-run.sh`.
- Node budget 12000 / 32000: `references/node-doctrine.md`, `skills/memory/scripts/memory-map.sh`,
  `skills/memory/SKILL.md`. Rule budget 4000 / 40000: `agents/rules-writer.md`,
  `skills/rules/scripts/rules-map.sh`, `skills/rules/SKILL.md`.
- The frozen `_`-prefixed rule file: `rules-map.sh`, `rules-auditor`, `rules-writer`.
- `references/qa-format.md` is the one format authority for `qa-writer`, `e2e-writer` and the `e2e`
  skill, which routes on its headings (`## UI scenarios`, `## API scenarios`, `## Not automatable`,
  `## Automation`).
- A new switch: `skills/setup/templates/viber.yml` (`bootstrap.sh` appends a key an existing config
  lacks), `config.sh`'s key list and fixed output order, `README.md`, `usage.md`, and the skill
  consuming it (implementor's step 3 opens one close entry per close switch).
- The `memory` switch reaches planning twice: the Memory-owned rule of `plan-rules.md` and the
  `memory:` line `planner` passes to `planner-review`.

## Memory and rules layers

- Build close: `memory-writer` may leave a node over budget and report `OVER:`; implementor then
  audits each and has `memory-node-writer` shrink it. The `memory` command writes every node
  through `memory-node-writer`, one node per dispatch, in waves by depth with the root first, then
  re-dispatches the root when nodes appeared or vanished so its node index stays equal to
  `planned:`.
- `rules-auditor` and `rules-writer` pass every line through `references/rule-admission.md`; a
  fact about one place leaves as `MOVE:` for the memory layer, and `rules-writer` never writes a
  `CLAUDE.md`, as `memory-writer` never touches `.claude/rules/`.

## Plan gate

`hooks/scripts/plan-gate.sh` arms on a Skill tool_use named `planner` (any plugin prefix) plus a
write to `plans/*.md` within the current plan-mode episode, then allows `ExitPlanMode` only after a
`planner-review` dispatch following the last plan write returned `VERDICT: PASS` and the plan's
mtime is not newer. The names are matched literally: renaming the skill, the agent or the verdict
line disarms the gate, and fail-open means nothing reports it.

## Tool dependencies

- `e2e`: `playwright-cli` and `@playwright/test`, probed by `check-playwright.sh`, which never
  installs; the skill installs only once the user agrees. Tests run chromium only.
- `setup`: `merge-settings.sh` runs an embedded `node` program; with no `node` on PATH it prints
  the recommended block and skips. The template wins a scalar, lists only gain entries, an `ask`
  entry is removed from `deny`, and `.claude/settings.local.json` is never touched.
