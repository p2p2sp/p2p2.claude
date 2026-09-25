# viber - interview, plan, build, remember

Every skill, agent and script here is a stage of one run, so most edits touch a contract two or
three files share. `PRODUCT.md` holds the testing assumptions that `references/test-strategy.md`
and `references/integration-tests.md` turn into rules.

## Layout

```
skills/<name>/           12 skills: SKILL.md plus files read at one step;
                         setup, memory, rules, commit bundle scripts/
agents/                  14 agents
scripts/                 13 plugin-wide scripts
references/              read at runtime by agents through the `refs:` dispatch line
hooks/                   SessionStart manifest + UserPromptSubmit plan hints + PreToolUse plan gate
```

## The chain

- `intent` (interview) or `fixer` (RED reproduction test + diagnosis) -> `planner` -> `implementor`.
  `planner` treats any other input as unresolved and suggests `intent`; `implementor` refuses a
  draft (a landed plan with no TASK block).
- `intent` and `fixer` take an issue reference only under `issues: true`; `intent` can also
  save its summary as a new issue. An `Issue: <URL>` handoff line becomes the plan frontmatter
  `issue:`, carried into `spec.md`; `plan-index.sh` and `commit-task.sh` foot commits `Refs: #<N>`.
- `prototype`, user-only, has `prototype-writer` build a UI change into one HTML mockup under
  `.temp/viber/prototype/` (path fixed for the run), then hands to `intent` with a `Prototype:`
  line. Its `mode:`, `round:`, `variant:` lines and the writer's `VERDICT:`, `FILE:`, `BASIS:`,
  `VARIANT:` lines are one loop: renaming either side breaks it.
- `triage` sits before the chain: it assesses one issue, names `/viber:fixer #N`, `/viber:intent #N`
  or a one-line summary for pasted text, and invokes nothing; under `issues: false` it never
  fetches or publishes and drops the `#<N>` form from its next-step name. Its `disallowed-tools:`
  lifts at the prose publish answer, so in that turn only the body keeps `Skill` unused.

## Orchestrator contract

- `implementor` opens no file and writes none. It knows only the `config.sh` and `run-clock.sh`
  preloads, `plan-path.sh`, `plan-index.sh` and `commit-task.sh` stdout (`progress: <n>/<total>`,
  exit 4 naming `--landed`, the `refused` / `took` / `claimed by no task` warnings), and agents'
  return lines. Every script's stdout and every agent's `## Output` vocabulary is an interface:
  renaming one side only breaks the build silently.
- `plan-index.sh`'s index prints per task id, state, TDD, `excl`, `deps`, `feeds` (contract
  blocks another task consumes), `files`, title, then a `verify:` line. `implementor` profiles
  tier from TDD, file count, `feeds` and dependents, review from `verify:` and the tier, never
  from a field the index does not print.
- `excl` (plan `Exclusive: true`): `implementor` runs the task alone, once nothing else is ready
  or in flight, until committed; outside `--split` `plan-index.sh` rejects a task depending on it.
- Every agent returns `VERDICT: DENIED` plus `REASON: <tool>: <call>` on a refused tool call (the
  auditors in place of `AUDIT:`), and every caller, the plan gate included, branches on it.
- Only coder, reviewer and repair-coder dispatches carry `model`: the task's profiled tier
  (repair-coder: `sonnet`, raised only by `retry`) clamped into `tiers.min`..`tiers.max`
  (defaults `haiku`/`opus`, `fable` only when named; `min` above `max` resets both).
- Coder `EXTRA:` becomes `--with`, `DEFERRED:` becomes `--defer`, stored as `deferred:` in
  `status.md` and handed to the owing task's coder and reviewer.
- task-coder, task-reviewer, test-runner and e2e-writer share a "Stop what you started" section;
  `implementor`'s and `e2e`'s `SendMessage` on a "stopped with background work" notice, or a
  reply with no `VERDICT:` line, is its other half.
- Coders and reviewers keep git read-only (never `stash`, `checkout`, `restore`, `clean`):
  parallel tasks share one working tree.

## Commit ownership

- Only scripts commit: `plan-index.sh --split` (the decomposition), `commit-task.sh` (every task,
  repair, close and e2e commit, `--skip`, and `--landed <sha>` recording a task another commit
  carried in its own `chore(viber)` commit, never with `--with`), `archive-run.sh` (the
  archive), and outside a build the `commit` skill's `commit.sh`. No agent or skill runs
  `git add` or `git commit`. `planner` leaves a landed draft uncommitted; `memory` and `rules`
  leave their writes unstaged.
- `commit-task.sh` never takes a subject from its caller (a task commit is the plan's
  `T<n> - <title>` heading, no type prefix). It stages only the paths it is named, as literal
  pathspecs (App Router `[id]` paths), refuses a `.temp/` path with a warning, and adds the run's
  `work/` trail itself.
- Never two `commit-task.sh` calls at once: each rewrites the index and `status.md`.
- `commit-args.sh` is the ONE selector parser; the fork never widens the selector.
- The `commit` skill's `git rev-parse` and `cat` preloads are inline commands under a bare `Bash`
  allow, the one exception to the literal-script-line form; its scripts carry their own pattern.

## The run directory

`docs/<runs>/<stamp>_<slug>/` (`docs/_specs/` by default), landed by `plan-path.sh --land`, which
copies (never moves) the plan-mode file, a round landing into the draft its `into:` key names:

- `plan.md` - frozen once it carries a task block; a draft is relanded in place each round.
- `spec.md`, `tasks/<id>.md` - `plan-index.sh --split`, rebuilt on every call. A task
  file is a coder's whole input; a coder never sees the plan.
- `status.md` - `commit-task.sh` is its only writer (`plan-index.sh` creates it empty).

`archive-run.sh` moves it to `docs/<specifications>/<key>/` (`docs/specs/` by default), dropping
only the scaffolding it enumerates, and refuses a run with a task in neither `done` nor
`skipped`. `closeout` edits `spec.md` first, so the drift edit and the move are one commit.

## The run branch

- `branching:` (`mode` off|allowed|required, default `off`) nests `work` entries (`base`, `name`
  pattern, `target`) and `issue-type-mappings` (type to entry key). The flat `base`/`name` group
  and `{issue}` are refused only when a branch must be cut, never for an existing one. The loaded
  config block names only the mode. Schema: `viber/BRANCHING.md`.
- `planner` reads `plan-path.sh --branch <plan>` (`suggested:`, one `entry:` per usable entry,
  `error:` on a missing/unmapped type with mappings set), asks one question for both, writes
  `work:` beside `branch:` (`plan_field()`). A draft round carries both; a title,
  issue or `Repro:` change re-runs the report.
- A first landing resolves the entry (`branch_entry`), cuts from its `base` before any lookup;
  `implementor` learns the PR target only from the `target:` line, not config.
- Exit 6: dirty tree; base missing locally; invalid name; a `required` breach; no entry resolves;
  a legacy/invalid `work` group (checked only on creation).

## The plan format is parsed in five places

The template shape (`<!-- TASK -->` markers, `### T<n> - <title>` headings, task fields, the
`## Contracts` appendix of `### C<n>` blocks opening on `File:`) is read by `plan-index.sh`,
`plan-path.sh` (its comment strip must keep the TASK markers), `commit-task.sh` (subject,
`Files:` staging), `archive-run.sh` and `run-branch.sh`'s `plan_type()` (a task's `Repro:` line,
for `{type}`). A field or marker change touches the templates, `references/plan-rules.md` and
every parser.

- A rule switching its `plan-rules.md` tag, `(script)` or `(review)`, moves its enforcement too.
- A landed plan is frozen, so a run resumed after an upgrade must still validate: a new
  `plan-index.sh` check stays exempt under `--split` (the Exclusive-leaf rule) or skips a plan
  predating it (a contract appendix with no `File:` line at all).

## Duplicated on purpose - change together

- `issue_ref()` (plan `issue:` URL to `#<N>`): `commit-task.sh`, `plan-index.sh`, and
  `run-branch.sh`'s `plan_issue()` (the bare number, for `{issue-number}`).
- Fence-aware guidance-comment stripping: `plan-path.sh`'s landing strip and `plan-index.sh`'s
  `spec.md` cut.
- `directories.*` parsing: `config.sh`, `plan-path.sh`, `archive-run.sh`.
- Node (and section) budget 12000 / 32000: `references/node-doctrine.md`,
  `skills/memory/scripts/memory-map.sh`, `skills/memory/SKILL.md`. Section name
  rule (never `local`): the doctrine, `memory-map.sh` (twice), `memory-auditor`,
  `memory-node-writer`. Rule budget 4000 / 40000: `agents/rules-writer.md`,
  `skills/rules/scripts/rules-map.sh`, `skills/rules/SKILL.md`.
- The frozen `_`-prefixed rule file: `rules-map.sh`, `rules-auditor`, `rules-writer`.
- An agent's `tools:` frontmatter and the tool list its opening paragraph names.
- `references/qa-format.md` is the one format authority for `qa-writer`, `e2e-writer` and `e2e`,
  which routes on its `##` headings.
- A new switch: `skills/setup/templates/viber.yml` (`bootstrap.sh` appends a key an existing
  config lacks), `config.sh`'s key list and fixed output order, `README.md`, `usage.html`, and
  the consuming skill (implementor's step 3 opens one close entry per close switch).
- Switches reaching planning: `memory` (`plan-rules.md`'s Memory-owned rule, the `memory:` line
  to `planner-review`); `adr: true` (`planner` follows `skills/planner/references/adr-tasks.md`);
  `qa` (`planner`'s e2e hand-off line).
- End-to-end tests only on the user's own ask: `test-strategy.md`, `planner`, `intent`,
  `PRODUCT.md`.

## Memory and rules layers

- A section travels with its node: `section:` and `unlinked:` lines, never in a chain;
  reset, audited and written with its node; only a `FILES:`/`DELETED:` path named `CLAUDE.md`
  is a node.
- `memory-writer` may leave a node or section over budget (`OVER:`): `implementor` dispatches
  one `memory-auditor` per node, then `memory-node-writer` (`planned: none`) in waves by depth,
  root first; a later wave writing outside its node or deleting one adds a last root dispatch,
  its index rebuilt from the tree.
- `rules-auditor` and `rules-writer` pass every line through `references/rule-admission.md`; a
  fact about one place leaves as `MOVE:` for the memory layer. `rules-writer` never writes a
  `CLAUDE.md`, `memory-writer` never touches `.claude/rules/`.

## Plan gate

`hooks/scripts/plan-gate.sh` arms on a write to `plans/*.md` in the current plan-mode episode and
picks `planner-review` when a Skill tool_use named bare `planner` or `viber:planner` ran in it,
else `plain-plan-review` when `config.sh` (payload `cwd`)
resolves `plain-plan-review: true`.
`ExitPlanMode` passes only after that agent, dispatched after the last plan write, returned
`VERDICT: PASS` and the plan's mtime is not newer. The deny reason is the plain path's only
instruction channel. Names match literally: renaming the skill, either agent, the switch or the
verdict line disarms the fail-open gate silently.

`hooks/scripts/plan-hints.sh` (UserPromptSubmit, soft) adds the closing-review and
parallel-subagent rules to every prompt in plain plan mode only; its planner detection and episode
window are copied from `plan-gate.sh`, so rename either side together.

## Tool dependencies

- `triage`, `intent`, `fixer`, `prototype`: `gh`, only through the shared issue scripts in
  `scripts/`; without it each reports the script's `ERROR` line and pasted text still works,
  unpublished. A create or comment exit 1 leaves the landing unknown and is never retried. Each
  such call, plus `planner`'s ADR-task step, runs after a prose question ends the turn, so all
  four rely on the bare `Bash` allow `/viber:setup` installs.
- A multi-line issue body or comment travels only as a file under `.temp/viber/<skill>/` through
  `--body-file`. `intent`'s and `prototype`'s write access there is pre-approved as
  `Edit(./.temp/viber/<skill>/**)`, not `Write(...)`: a file write matches `Edit` rules only.
- `e2e`: `playwright-cli`, `@playwright/test` (chromium only), probed by `check-playwright.sh`;
  the skill installs only once the user agrees.
- `setup`: `node` only for a merge into an existing target; merge or reset is an
  `AskUserQuestion`: a prose question ends the turn and the pre-approval with it.
