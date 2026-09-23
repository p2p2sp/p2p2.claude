# viber

A programming assistant that gives the agent greater freedom when performing tasks, enabling the
highest quality and speed of work.

## Purpose

The vibe track: understand, plan, build, then record what the build taught. NINE skills (`setup`,
`idea`, `planner`, `implementor`, `tdd`, `fixer`, `e2e`, `memory`, `rules`), TWELVE agents, SEVEN
plugin-level scripts, FOUR skill-level scripts, FIVE plugin-level references, ONE skill-level
reference and TWO hooks (one `PreToolUse`, one `SessionStart`).

## Entry points

Each skill's contract is its own body and each script's is its header comment; this is the map.

- `setup` - `/viber:setup`, user-only. `bootstrap.sh` (config, `.gitignore`), `merge-settings.sh`
  (permissions), then `assets/usage.md` printed verbatim. Asks nothing.
- `idea` - `/viber:idea`, and the one entry to planning. Model-invocable only on the user's
  consent: its description has the model suggest it, never start it unasked. Prose interview, ends
  in a confirmed summary that invokes `planner`. Writes nothing.
- `planner` - model-invocable, never the entry: its description points a raw planning request at
  `idea`. Refuses input from anywhere but `idea` or `fixer` BEFORE entering plan mode, composes
  the plan from `templates/`, validates with `plan-index.sh`, gates on `planner-review` until
  PASS, then `ExitPlanMode`.
- `implementor` - model-invocable orchestrator. Lands, decomposes, profiles, dispatches coders in
  the widest legal batch, gates on reviewers, commits, closes on `test-runner` and the per-switch
  writers, archives under `cleanup`.
- `e2e` - `/viber:e2e`, user-only. One run's `qa.e2e.md` into Playwright specs, one ID at a time.
  Carries `disallowed-tools: Write, Edit, NotebookEdit`.
- `fixer` - `/viber:fixer`, user-only. A traced diagnosis proven by a failing test, handed to
  `planner`. Never applies a fix.
- `tdd` - the Red-Green-Refactor discipline, invoked by `task-coder` through the `Skill` tool.
- `memory` - `/viber:memory`, user-only. Maps the host's `CLAUDE.md` cascade, dispatches
  `memory-auditor` per existing node, then `memory-node-writer` per target in top-down waves on
  approval.
- `rules` - `/viber:rules`, user-only. Maps `.claude/rules/`, dispatches `rules-auditor` per
  approved target, then `rules-writer` on approval.
- `agents/` - `planner-review`, `task-coder`, `task-reviewer`, `test-runner`, `memory-writer`,
  `memory-node-writer` and `memory-auditor`, `rules-writer` and `rules-auditor`, `qa-writer`, `e2e-writer`, `closeout`.
- `hooks/` - `plan-gate.sh` and `session-start.sh`, which injects `hooks/content/manifest.md`.

## Contracts & invariants

Only what spans several files. A rule that lives in one script header or one skill body stays
there.

- **One run, one directory.** `plan-path.sh` owns `docs/<runs>/<stamp>_<slug>/plan.md`; the stamp
  is taken when the plan lands, so a re-run of the same slug never overwrites an earlier one.
  Everything the run touches lives there: the plan, `status.md`, the decomposition, the QA
  documents, `work/`. Scratch goes to `.temp/viber/<id>/`.
- **Two spec shapes, one task half.** `spec-lite.md` or `spec-full.md` above, `tasks.md` under
  either. `plan-index.sh` reads five anchors above `## Tasks` and never learned the shapes; a
  `<!-- TASK -->` block under any other heading is refused.
- **`### Must not change` is the one thing every coder holds.** The big shape's own exception,
  riding into `spec.md` alone: the criterion channel would hand a regression guard to one task
  while five others could break it.
- **A draft is a run with no task in it, and the one plan that is not frozen.** `plan-path.sh`
  answers `state: draft`, `implementor` stops on it, `planner` lands it itself. Later rounds land
  `--into <key>`, refused once the run carries a task block, a `tasks/` directory or a `status.md`.
- **The plan carries the path it was written to.** Approval leaves `implementor` holding the
  plan's TEXT with no path; the frontmatter `source:` key is the whole handover.
- **Only the planner handoff is hardened.** `idea` and `fixer` reach `planner` inside one context
  and restate their payload verbatim rather than writing a handoff file.
- **The scope gate is `idea`'s alone.** A wide idea is split into ordered subprojects before the
  first detail question; `planner` never sizes scope.
- **`status.md` is the state, and the plan is frozen.** It carries `progress:`, `done:` and four
  things a later session cannot derive (`skipped:`, `unreviewed:`, `deferred:`, `closed:`);
  `plan-index.sh --split` creates it, `commit-task.sh` is its only other writer, and two such
  calls never run at once. `dirty:` is `git status` intersected with each task's `Files:`, minus
  its `Repro:` path.
- **The decomposition is what the agents see; the index is what the orchestrator sees.** A task
  file carries its task block verbatim plus the plan's `## Goal`, its `Covers:` criteria, its
  `Uses:` contracts and `### Out of scope` - self-contained, no `spec:` line except on a post-test
  repair. `- DoD:` is cut on `;` into one clause per line, gated separately.
- **The plan has three parts, and a shape belongs to exactly one task file.** Above `## Tasks` is
  WHAT and WHY; a signature, type, endpoint or dictionary key there rides into `spec.md`. Shapes
  live in `### C<n>` blocks below the tasks, reached only through `Uses:`; the task whose `Files:`
  holds the block's own file writes it, every other one calls it as it stands.
- **`Files:` is a machine-readable map, not prose.** Comma-separated exact repo-relative paths, no
  globs, no directories, no annotations. `plan-index.sh` rejects two tasks with no dependency path
  listing the same file. A bracket wrapping a whole segment (`[id]`, `[...slug]`) is part of the
  file's own name; inside a segment it is refused - the same test guards a contract block's `File:`.
- **Disjoint is checked, complete is not, so three layers carry completeness.** `planner` maps
  what the change forces, `planner-review` gates a map a coder could not build from, and the rest
  is reported on `EXTRA:` by `task-coder`, never a finding for `task-reviewer`, and passed to
  `implementor`'s `--with`.
- **Untested code is owned by the task that will prove it, or it is unfinished.** A coder returns
  `DEFERRED: <path> -> <task id>` (or `-> none`); `implementor` turns it into `--defer` and
  `plan-index.sh` echoes the key. Anything else left untested fails its own DoD clause.
- **A task's `Verification` is scoped to the task; the whole suite belongs to the close.**
  `planner` writes it narrow, `planner-review` flags a whole-project run, `task-coder` and
  `task-reviewer` drop a red traced outside their `Files`; what escapes belongs to `test-runner`,
  committed through `--repair`.
- **`Exclusive:` serialises the last test layer.** The doctrine lives in `test-strategy.md`.
  `Exclusive: true` marks a leaf `plan-index.sh`'s validation call enforces (skipped under
  `--split`); `implementor` holds that task until nothing else can run - a declaration, never
  a judgement.
- **Git never moves under a running build, but the write tools are open by default.** A subagent
  does not inherit the session's permission mode, so `deny` alone holds the line on `.env`,
  `.git/`, the key files and `stash`/`checkout`/`restore`/`clean`.
- **The switches are read through `config.sh` alone; the directory keys have three readers.**
  Five switches, fail-open, always exit 0. `plan-path.sh` and `archive-run.sh` parse the
  `directories:` group themselves, running with no skill above them.
- **The coders' notes are the input of the close, and of the gate beside them.** `task-coder`
  leaves at most 8 lines of what the diff does not say; the close's writers, `closeout`,
  `task-reviewer` (a hypothesis to disprove, never evidence) and each dependent task's coder,
  handed them as `prior:`, all read that directory.
- **A retry keeps existing work, never restarts it.** `implementor` carries `resume`/`reason` into
  a retried coder's input; `tdd` treats code already in the tree as existing work on that path,
  writing only the tests it lacks rather than deleting it.
- **An open decision is Blocking on a test, never on its own.** `task-coder` names in its notes a
  decision the task left open; `task-reviewer` treats it as Blocking on `TDD: required` when no
  test pins it down, and checks it against `DoD` and `Verification` alone on `TDD: none`.
- **The knowledge layer has two entries, never a third.** The build close dispatches
  `memory-writer` and `rules-writer` after every build; `/viber:rules` dispatches `rules-writer`
  on the user's schedule, `/viber:memory` dispatches `memory-node-writer`, one node per dispatch.
  `memory-auditor` and `rules-auditor` sit beside them, read-only.
- **The knowledge layer is capped.** Memory: 12000 characters per node, 32000 over the chain.
  `rules-writer`: 4000 per file, 40000 over `.claude/rules/`, at most 2 new files per build.
  `memory-writer` and `rules-writer` may end over a cap and report `OVER:`; `memory-node-writer`
  never does, reporting each left-out fact on `DROPPED:` and each deleted node on `DELETED:`. A
  split is exempt: a sibling node is never loaded beside the one a reader opened. The same
  discipline binds this node.
- **The QA documents live in the run directory, which is what makes the close idempotent.**
  `qa.md` (by hand) and `qa.e2e.md` (automated by `/viber:e2e`) never land in a `docs/qa/` of
  their own; an existing `qa.md` is the resume signal, answered `VERDICT: NONE` rather than
  overwritten.
- **The run directory is scaffolding; the archive is the product.** `archive-run.sh` moves the
  WHOLE directory to `docs/<specs>/<key>`, then removes `plan.md`, `status.md`, `tasks/` and
  `work/` - a second copy of what git holds. `closeout` edits `spec.md` BEFORE the move, so the
  drift is an ordinary diff. Nothing sweeps `work/`: a dropped task's leftovers are picked up by
  the next `--split`.
- **Drift is what the specification now gets WRONG, never how the work went.** `closeout` marks a
  sentence of `spec.md` only where the spec promises P and the build delivers Q; `qa.md` and
  `qa.e2e.md` are never touched.
- **`references/` holds what several workers share.** `qa-format.md` two readers, `test-strategy.md`
  four (`planner`, `planner-review`, `task-reviewer`, `task-coder`), `rule-admission.md` two
  (`rules-auditor`, `rules-writer`), `node-doctrine.md` two (`memory-writer`,
  `memory-node-writer`), `plan-rules.md` two (`planner`, `planner-review`), each rule
  line tagged `(script)` or `(review)` so `plan-index.sh` and the plan reviewer split the gate.
- **Model comes from the task's tier; effort comes only from frontmatter.** The `Agent` tool takes
  no `effort` parameter, so effort is fixed per agent: `task-coder` runs `effort: high` across all
  three tiers, dead on `haiku` on purpose; `task-reviewer` takes its task's own model tier (`opus`
  only as fallback) at `effort: medium`. Three more agents - `closeout`, `memory-auditor`,
  `rules-auditor` - are pinned to `effort: medium` too. A retried coder goes out one tier up
  carrying its own `REASON:`.
- **The gate arms on two signals** - the planner skill running, and a Write/Edit of a
  `plans/*.md` file in the same episode.
- **A harness refusal is its own verdict, never worked around.** `task-coder`, `task-reviewer`
  and `test-runner` return `VERDICT: DENIED` with the refused tool and call as `REASON:`.
  `implementor` answers every `DENIED` with one `AskUserQuestion` whose first option re-dispatches
  the same agent, same model, same round - the one-tier-up retry never applies here.
- **A background process never outlives its agent.** `task-coder`, `task-reviewer`, `test-runner` and `e2e-writer` kill theirs before
  returning; `implementor` answers a notice still reporting one with a `SendMessage` to that agent.
  Not a script: no process carries a mark of the agent that started it.

## Anti-patterns

- Adding, removing or renaming a skill or agent without updating `.claude-plugin/plugin.json`
  (`skills[]` / `agents[]`) and this node. A worker must never appear in both arrays.
- Letting the orchestrator do a worker's job: reading source, running a test, writing code.
- Handing an agent the plan file when the decomposition exists.
- Teaching a skill a host project's stack. Test and build commands are read from the host's own
  instructions at runtime.
- Restating a script's mechanics or a skill's own steps here. A second copy is what drifts.

## Related context

- `PRODUCT.md` - the product assumptions this plugin is built to hold. Read it before changing
  anything about planning, TDD or the test layers.
- Repo-wide invariants, versioning, catalog layer: `../CLAUDE.md`
