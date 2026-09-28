# viber - interview, plan, build, remember

Every skill, agent and script here is a stage of one run, so most edits touch a contract two or
three files share. `PRODUCT.md` holds the testing assumptions that `references/plan-rules.md`
(planning), `references/test-strategy.md` (writing a test, read by `fixer`, `task-coder` and
`task-reviewer` only) and `references/integration-tests.md` turn into rules.

## Layout

```
skills/<name>/           14 skills: SKILL.md plus files read at one step;
                         setup, memory, rules, handoff, commit bundle scripts/
agents/                  16 agents
scripts/                 14 plugin-wide scripts
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
- `handoff`, user-only and inline (a fork cannot see the conversation), stands outside the chain
  like `commit`: no skill or build invokes it. It writes one file, never overwriting (`EXISTS=true`
  stops it rather than asking, since a prose question drops the pre-approval).
- `help`, user-only, a background haiku fork, also stands outside the chain: its one preload opens
  `setup`'s `assets/help.html` through `open-page.sh`, so moving that page updates both skills.
  `viber-flow.svg` sits beside it: the page's menu links it relatively and `README.md` embeds it.

## Orchestrator contract

- `implementor` opens no file and writes none. It knows only the `config.sh`, `run-clock.sh` and
  `switch-text.sh` preloads (its close parts reach it only as fragment text), `plan-path.sh`, `plan-index.sh` and `commit-task.sh` stdout (`progress: <n>/<total>`,
  exit 4 naming `--landed`, the `refused` / `took` / `claimed by no task` warnings), and agents'
  return lines. Every script's stdout and every agent's `## Output` vocabulary is an interface:
  renaming one side only breaks the build silently.
- `plan-index.sh`'s index prints per task id, state, TDD, `excl`, `deps`, `feeds` (contract
  blocks other tasks consume, `<id>:<consumer count>`), `files`, title, then a `verify:` line, plus a trailing
  `dirty: <id> | <paths>` line per task not done whose own files changed and one
  `orphan: <p1>,<p2>` line for changed paths claimed by no task not `done` (run directory
  excluded). `implementor` profiles tier from TDD, file count, `feeds` (opus from 3 consumers) and dependents, review
  from `verify:` and the tier (never from a field the index does not print) or a coder `EXTRA:`
  line.
- `excl` (plan `Exclusive: true`): `implementor` runs the task alone, once nothing else is ready
  or in flight, until committed; outside `--split` `plan-index.sh` rejects a task depending on it.
- Every agent returns `VERDICT: DENIED` plus `REASON: <tool>: <call>` on a refused tool call (the
  auditors in place of `AUDIT:`), and every caller, the plan gate included, branches on it.
- Only coder, reviewer and repair-coder dispatches carry `model`: the task's profiled tier
  (repair-coder: `sonnet`, raised only by `retry`) clamped into `tiers.min`..`tiers.max`
  (defaults `haiku`/`opus`, `fable` only when named; `min` above `max` resets both).
- Every `EXTRA:` path of the task's coder or reviewer becomes `--with` (the coder's also reach
  its reviewer as `extra:`, minus a path a not-yet-done task claims, with one `recheck:` per done
  owner's `verify:`), coder `DEFERRED:` `--defer`, stored as `deferred:` in `status.md` and handed
  to the owing task's coder and reviewer. The `orphan:` paths the user assigns to a task on
  resume ride that same `resume:` / `extra:` / `--with` path.
- task-coder, task-reviewer, test-runner and e2e-writer share a "Stop what you started" section;
  `implementor`'s and `e2e`'s `SendMessage` on a "stopped with background work" notice, or a
  reply with no `VERDICT:` line, is its other half. Every coder re-run (review failure, `WAIT:`,
  `retry`, `decide`) is a fresh dispatch from the tree and task file, never a continuation.
- A coder's `WAIT:` (a file outside `Files` held by another task's uncommitted change) holds its
  task until every in-flight task returns, then a fresh coder at no attempt cost; nothing else in
  flight, or a second wait on the same path, counts as an ordinary failure.
- `decide` overrides the task file for a stalled task and its dependents: offered beside
  retry/skip/abort on a third coder failure, beside retry/accept/abort on review round 3 of 3, or
  at once, any count, when every `DECIDE:` option is owner-marked. A second ordinary failure with
  an unmarked option instead gets the implementor's own automatic decision (`auto: <option>`,
  same `--decide` call, no counter restart) and a fresh coder, not a question.
- Coders and reviewers keep git read-only (never `stash`, `checkout`, `restore`, `clean`):
  parallel tasks share one working tree. A coder's one git write is `git rm -r -q` for a removal:
  `commit-task.sh` commits through its own pathspec, so a staged deletion rides in no other
  task's commit.
- A coder's protected files are those of tasks not on `status.md`'s `done:` line: a done task's
  file is free to change as `EXTRA:` (the reviewer re-runs its `verify:` as `recheck:`), while
  `WAIT:` and `commit-task.sh`'s `refused` guard the ones still open.

## Commit ownership

- Only scripts commit: `plan-index.sh --split` (the decomposition), `commit-task.sh` (every task,
  repair, close, e2e and final-review-fix commit, `--skip`, `--decide`, and `--landed <sha>` recording a task
  another commit carried in its own `chore(viber)` commit, never with `--with`), `archive-run.sh`
  (the archive), and outside a build the `commit` skill's `commit.sh`. No agent or skill runs
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

## Sections

- Read `CLAUDE.plan-format.md` before changing the plan template, `plan-rules.md`, a plan
  parser or how `--split` cuts a task file.
- Read `CLAUDE.run-branch.md` before touching `branching:`, `run-branch.sh` or `plan-path.sh --branch`.
- Read `CLAUDE.owner-decisions.md` before touching the owner decision channel.
- Read `CLAUDE.tool-dependencies.md` before touching a `gh`, Playwright or `node` call.
- Read `CLAUDE.switches.md` before adding a new `viber.yml` switch or wiring one into planning.

## Duplicated on purpose - change together

- `issue_ref()` (plan `issue:` URL to `#<N>`): `commit-task.sh`, `plan-index.sh`, and
  `run-branch.sh`'s `plan_issue()` (the bare number, for `{issue-number}`).
- Fence-aware guidance-comment stripping: `plan-path.sh`'s landing strip and `plan-index.sh`'s
  `spec.md` cut.
- `directories.*` parsing: `config.sh`, `plan-path.sh`, `archive-run.sh`.
- `viber.yml` key grammar (blanks allowed before the colon): `config.sh` and `bootstrap.sh`'s
  merge; a key one reads and the other misses is appended again, overriding the user's value.
- Node (and section) budget 12000 / 32000: `references/node-doctrine.md`,
  `skills/memory/scripts/memory-map.sh`, `skills/memory/SKILL.md`. Section name
  rule (never `local`): the doctrine, `memory-map.sh` (twice), `memory-auditor`,
  `memory-node-writer`. Rule budget 4000 / 40000: `agents/rules-writer.md`,
  `skills/rules/scripts/rules-map.sh`, `skills/rules/SKILL.md`.
- The frozen `_`-prefixed rule file: `rules-map.sh`, `rules-auditor`, `rules-writer`.
- An agent's `tools:` frontmatter and the tool list its opening paragraph names.
- `references/qa-format.md` is the one format authority for `qa-writer`, `e2e-writer` and `e2e`,
  which routes on its `##` headings.
- `help.html`'s full reference and `tests/viber/help.test.ts`: every user-visible change (a
  skill, an argument, a switch, a write location, the flow) updates the help page in the same
  edit, and the test enforces the page's skill cards, agent lines, key entries and language pairs
  against `plugin.json`, the skills' frontmatter and `viber.yml`.
- End-to-end tests only on the user's own ask: `test-strategy.md`, `plan-rules.md`, `planner`,
  `intent`, `PRODUCT.md`.

## Memory and rules layers

- A section travels with its node: `section:` and `unlinked:` lines, never in a chain;
  reset, audited and written with its node; only a `FILES:`/`DELETED:` path named `CLAUDE.md`
  is a node.
- `memory-writer` ends no node or section over its cap, nor a chain with room (cut facts:
  `DROPPED:`), checking only sentences naming a path or symbol the build changed.
- `rules-writer` may still end a file over its cap (`OVER:`, only repeated): one convention
  per file and a full directory growing only by merge or replace already bound growth, so a
  cut would lose a gated convention; `memory-writer` drops instead, nothing else bounds a node.
- `rules-auditor` and `rules-writer` pass every line through `references/rule-admission.md`; a
  fact about one place leaves as `MOVE:` for the memory layer. `rules-writer` never writes a
  `CLAUDE.md`, `memory-writer` never touches `.claude/rules/`.

## Plan gate

`hooks/scripts/plan-gate.sh` matches names literally: renaming `planner`, `planner-review`,
`plain-plan-review` (agent or switch) or `VERDICT: PASS` disarms the fail-open gate silently.
Its contract, and `plan-hints.sh`'s, live in `hooks/CLAUDE.md`.
