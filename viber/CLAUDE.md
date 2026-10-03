# viber - interview, plan, build, remember

Every skill, agent and script here is a stage of one run, so most edits touch a contract two or
three files share. `PRODUCT.md` holds the testing assumptions that `references/plan-rules.md`
(planning), `references/test-strategy.md` (writing a test, read by `fixer`, `task-coder` and
`task-reviewer` only) and `references/integration-tests.md` turn into rules.

## Layout

```
skills/<name>/           17 skills: SKILL.md plus files read at one step;
                         setup, memory, rules, handoff, commit, code-auditor bundle scripts/
agents/                  23 agents
scripts/                 16 plugin-wide scripts
references/              read at runtime: by agents through `refs:`, by skills by direct path
hooks/                   command hooks (manifest, plan hints, plan gate, kill guard) + build monitor module
```

## The chain

- `intent` (interview) or `fixer` (RED reproduction test + diagnosis) -> `planner` -> `implementor`.
  `planner` treats any other input as unresolved and suggests `intent`; `implementor` refuses a
  draft (a landed plan with no TASK block). Under `planning.fast-path`, `intent` builds a small change
  itself (`CLAUDE.switches.md`).
- `intent` and `fixer` take an issue reference only under `github.issues`; each can also save its
  conclusion as a new issue (`fixer` a bug one). An `Issue: <URL>` handoff line becomes the plan frontmatter
  `issue:`, carried into `spec.md`; `plan-index.sh` and `commit-task.sh` foot commits `Refs: #<N>`.
- `intent --prove` has `prover` (read-only plus web, no `model`) check each drafted question
  before it is shown; its `CONFIRMED`/`REVISED`/`DENIED`, `FINDINGS:`, `UNVERIFIED:` lines are one
  loop with `intent`'s interview bullet. `--prove` never reaches the summary or the planner.
- `prototype`, user-only, has `prototype-writer` build a UI change into one HTML mockup under
  `.temp/viber/prototype/`, then hands to `intent` with a `Prototype:`
  line; `intent` offers it (`Prototype first`) before the hand-off when a change alters a screen,
  `planner` writes the line into the plan's `prototype:` key, `plan-path.sh --land` copies the
  file into the run as `prototype.html` and `plan-index.sh --split` commits it and names it in
  every task file's `## Prototype`. Its `mode:`, `round:`, `variant:` lines and the writer's `VERDICT:`, `FILE:`, `BASIS:`,
  `VARIANT:` lines are one loop: renaming either side breaks it.
- `triage` sits before the chain: it assesses one issue, names `/viber:fixer #N`, `/viber:intent #N`
  or a one-line summary for pasted text, and invokes nothing; with `github.issues` off it never
  fetches or publishes and drops the `#<N>` form. Its publish answer is an `AskUserQuestion`
  tool result, not a user message, so its `disallowed-tools:` removal holds through the publish
  call, made in the same turn.
- `create-issue`, `create-pr` (its `pr-create.sh` is the only push viber makes, on the user's yes)
  and `handoff` stand outside the chain like `commit`. `handoff`, user-only and inline, writes one
  file, never overwriting (`EXISTS=true` stops it, not a question: prose drops the pre-approval).
- `help`, user-only, a background haiku fork, also stands outside the chain: its one preload opens
  `setup`'s `assets/help.html` through `open-page.sh`; moving that page updates both skills.
  `viber-flow-en.svg` and `viber-flow-pl.svg` sit beside it: a flow change updates both.

## Orchestrator contract

- `implementor` opens no file and writes none. It knows only the `config.sh`, `run-clock.sh` and
  `switch-text.sh` preloads (its close parts reach it only as fragment text), `plan-path.sh`,
  `plan-index.sh` and `commit-task.sh` stdout (`progress: <n>/<total>`, exit 4 naming `--landed`,
  the `refused` / `took` / `claimed by no task` warnings), and agents' return lines. Every script's stdout and agent `## Output` vocabulary is an interface: renaming one side breaks the build silently.
- `plan-index.sh`'s index prints per task id, state, TDD, `excl`, `deps`, `feeds` (contract
  blocks other tasks consume, `<id>:<consumer count>`), `files`, title, then a `verify:` line, plus a trailing
  `dirty: <id> | <paths>` line per task not done whose own files changed, one
  `orphan: <p1>,<p2>` line for changed paths (run directory excluded) claimed by no open task and `next: part <n> of <N> - <name>` only when the plan's Roadmap has an entry after
  the `(this plan)` one. `implementor` profiles tier from TDD, file count, `feeds` (opus from 3
  consumers) and dependents, review from `verify:` and the tier (never from a field the index does
  not print) or a coder `EXTRA:` line; it reads `next:` only to close its summary on
  `/viber:intent <archive or run dir>/roadmap.md`, the archive form inside `outcome.md` when the
  run is archived: the two change together.
- `excl` (plan `Exclusive: true`): `implementor` runs the task alone, once nothing else is ready
  or in flight, until committed; outside `--split` `plan-index.sh` rejects a task depending on it.
- Every agent but the five `code-auditor` ones (`viber/agents/CLAUDE.code-auditor.md`) returns
  `VERDICT: DENIED` plus `REASON: <tool>: <call>` on a refused tool call (the auditors in place of
  `AUDIT:`), and every caller, the plan gate included, branches on it.
- Only coder, reviewer and repair-coder dispatches carry `model`: the task's profiled tier
  (repair-coder: `sonnet`, raised only by `retry`) clamped into `tiers.min`..`tiers.max`
  (defaults `haiku`/`opus`, `fable` only when named; `min` above `max` resets both). The
  exception is `final-review.true.md`: every dispatch but the arbiter's, `final-reviewer` at
  `opus`, its fix coder at `sonnet`, clamped the same way.
- Every `EXTRA:` path of the task's coder or reviewer becomes `--with` (the coder's also reach
  its reviewer as `extra:`, minus a path a not-yet-done task claims, with one `recheck:` per done
  owner's `verify:`), coder `DEFERRED:` `--defer`, stored as `deferred:` in `status.md` and handed
  to the owing task's coder and reviewer.
- task-coder, task-reviewer, test-runner, e2e-writer and final-reviewer share a "Stop what you started" section;
  `implementor`'s and `e2e`'s `SendMessage` on a "stopped with background work" notice, or a
  reply with no `VERDICT:` line, is its other half. Every coder re-run (review failure, `WAIT:`,
  `retry`, an arbiter ruling) is a fresh dispatch from the tree and task file, never a continuation.
- A coder's `WAIT:` (a file outside `Files` held by another task's uncommitted change) holds its
  task until every in-flight task returns, then a fresh coder at no attempt cost; nothing else in
  flight, or a second wait on the same path, counts as an ordinary failure.
- A build runs unattended: a task gets 5 attempts a session (coder failure, review failure or
  refused commit; each one tier up), then `arbiter` rules from a closed list and the build goes on.
  The arbiter also rules every coder `DECIDE:` on attempts 2 to 4, attempt 5 being the cap
  (`CLAUDE.rulings.md`). The build asks only on `VERDICT: DENIED`, each index `dirty:` line
  (continue / start over / drop), `orphan:` (commit them in a commit of their own via
  `commit-task.sh --outside`, or leave them uncommitted), `open:` runs at landing, `plan-path.sh`
  exit 3, a task commit's exit 4 and a refused `--skip` the arbiter did not rule.
- Coders and reviewers keep git read-only (never `stash`, `checkout`, `restore`, `clean`):
  parallel tasks share one working tree. A coder's two git writes are `git rm -r -q` (removal)
  and `git update-index --chmod=+x` (exec bit): `commit-task.sh` commits only its named paths,
  each as the index holds it, so either rides in its own task's commit only.
- A coder's protected files are those of tasks not on `status.md`'s `done:` line: a done task's
  file is free to change as `EXTRA:` (the reviewer re-runs its `verify:` as `recheck:`), while
  `WAIT:` and `commit-task.sh`'s `refused` guard the ones still open.

## Commit ownership

- Only scripts commit: `plan-index.sh --split` (the decomposition), `commit-task.sh` (every task,
  repair, close, e2e, final-review-fix and `--outside` commit, `--skip`, `--decide`, `--rule`, and `--landed <sha>` recording a task
  another commit carried in its own `chore(viber)` commit, never with `--with`), `archive-run.sh`
  (the archive), and outside a build the `commit` skill's `commit.sh`. No agent or skill runs
  `git add` or `git commit`. `planner` leaves a landed draft uncommitted; `memory` and `rules`
  leave their writes unstaged.
- `commit-task.sh` never takes a subject from its caller (a task commit is the plan's
  `T<n> - <title>` heading, no type prefix). It stages only the paths it is named, as literal
  pathspecs (App Router `[id]` paths), refuses a `.temp/` path with a warning, and adds the run's
  `work/` trail itself. `--e2e` takes no plan: the `e2e` commit carries no `Refs:` line at all.
- Never two `commit-task.sh` calls at once: each rewrites the index and `status.md`.
- `commit-args.sh` is the ONE selector parser.
- The exceptions to the literal-script-line form, under a bare `Bash` allow: the `commit` skill's
  inline `git rev-parse` and `cat` preloads and `code-auditor`'s `sh`/`bash`/`node` calls.

## The run directory

`docs/<runs>/<stamp>_<slug>/` (`docs/_specs/` by default), landed by `plan-path.sh --land`, which
copies (never moves) the plan-mode file, a round landing into the draft its `into:` key names:

- `plan.md` - frozen once it carries a task block; a draft is relanded in place each round.
- `spec.md`, `tasks/<id>.md` - `plan-index.sh --split`, rebuilt on every call. A task
  file is a coder's whole input; a coder never sees the plan.
- `roadmap.md` - only when the plan has a `## Roadmap`: `plan-index.sh --split` cuts it out of
  `spec.md` (never a model's write) and it rides into the archive as a non-scaffolding file.
- `prototype.html` - only when the plan's `prototype:` key names an existing mockup:
  `plan-path.sh --land` copies it (a draft round overwrites it, or removes it when the key is
  gone), `plan-index.sh --split` commits
  it and appends `## Prototype` with its path to every task file; it rides into the archive.
- `status.md` - `commit-task.sh` is its only writer (`plan-index.sh` creates it empty).
- `rulings.md` - the build's rulings, `commit-task.sh --rule` its only writer, created by the first
  ruling; it rides in the archive.
- `outcome.md` - the build's final summary plus a `Drift:` line, `closeout` its only writer, just
  before the move; it rides in the archive.

`archive-run.sh` moves it to `docs/<specifications>/<key>/` (`docs/specs/` by default), dropping
only the scaffolding it enumerates, and refuses a run with a task in neither `done` nor
`skipped`. `closeout` edits `spec.md` and writes `outcome.md` first: the drift edit, the summary
and the move are one commit.

## Sections

- Read `CLAUDE.plan-format.md` before changing the plan template, `plan-rules.md`, a plan
  parser or how `--split` cuts a task file.
- Read `CLAUDE.run-branch.md` before touching `branching:`, `run-branch.sh`, `plan-path.sh --branch`.
- Read `CLAUDE.rulings.md` before touching rulings or the arbiter.
- Read `CLAUDE.tool-dependencies.md` before touching a `gh`, Playwright or `node` call.
- Read `CLAUDE.switches.md` before adding or parsing a `viber.yml` key or wiring a switch into
  planning or `intent`.
- Read `CLAUDE.memory-rules.md` before touching the `memory` or `rules` skills, their agents or
  `node-doctrine.md`.

## Duplicated on purpose - change together

- The `work/final-review-*.md` and `work/final-fix-coder-*.md` names: `final-review.true.md`,
  `final-reviewer.md` and `commit-task.sh --review`'s trail glob.
- The temporary-index commit of named paths (never `git commit -- <paths>`, which drops a staged
  mode under `core.fileMode=false`): `commit-task.sh`'s `commit_named` and `commit.sh`'s paths mode.
- An agent's `tools:` frontmatter and the tool list its opening paragraph names.
- `references/qa-format.md`, the format authority for `qa-writer`, `e2e-writer` and `e2e` (which
  routes on its `##` headings). `e2e-writer` edits its scenario's `## Automation` line, `e2e`
  reads each ID's state there and dispatches one scenario at a time, never two at once.
- `help.html`'s full reference and `tests/viber/help.test.ts`: every user-visible change (a
  skill, an argument, a switch, a write location, the flow) updates the help page in the same
  edit, and the test enforces the page against `plugin.json`, the skills' frontmatter and the
  `viber.yml` template.
- End-to-end tests only on the user's own ask: `test-strategy.md`, `plan-rules.md`, `planner`,
  `intent`, `PRODUCT.md`.

## Plan gate

`hooks/scripts/plan-gate.sh` matches names literally: renaming `planner`, `planner-review`,
`plain-plan-review` (agent or `planning.` switch) or `VERDICT: PASS` disarms the fail-open gate
silently. Its contract, and `plan-hints.sh`'s: `hooks/CLAUDE.md`.
