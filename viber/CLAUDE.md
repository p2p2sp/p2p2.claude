# viber

A programming assistant that gives the agent greater freedom when performing tasks, enabling the
highest quality and speed of work.

## Purpose

The vibe track: understand, plan, build, then record what the build taught. NINE skills (`setup`,
`idea`, `planner`, `implementor`, `tdd`, `fixer`, `e2e`, `memory`, `rules`), ELEVEN agents, SEVEN
plugin-level scripts, FOUR skill-level scripts, THREE plugin-level references, ONE skill-level
reference and TWO hooks (one `PreToolUse`, one `SessionStart`).

## Entry points

Each skill's contract is its own body and each script's is its header comment; this is the map.

- `setup` - `/viber:setup`, user-only. `bootstrap.sh` (config, `.gitignore`), `merge-settings.sh`
  (permissions), then `assets/usage.md` printed verbatim. Asks nothing.
- `idea` - `/viber:idea`, user-only. Prose interview, one question at a time, scope check first,
  ends in a confirmed summary that invokes `planner`. Writes nothing.
- `planner` - model-invocable, enters plan mode itself. Refuses input that came from neither `idea`
  nor `fixer`, composes the plan from `templates/`, validates with `plan-index.sh`, gates on
  `planner-review` until PASS, then `ExitPlanMode`.
- `implementor` - model-invocable orchestrator. Lands, decomposes, profiles, dispatches coders in
  the widest legal batch, gates on reviewers, commits, closes on `test-runner` and the per-switch
  writers, archives under `cleanup`.
- `e2e` - `/viber:e2e`, user-only. One run's `qa.e2e.md` into Playwright specs, one ID at a time
  against the application it launched. Carries `disallowed-tools: Write, Edit, NotebookEdit`.
- `fixer` - `/viber:fixer`, user-only. A traced diagnosis proven by a failing test, handed to
  `planner`. Never applies a fix.
- `tdd` - the Red-Green-Refactor discipline, invoked by `task-coder` through the `Skill` tool.
- `memory` - `/viber:memory`, user-only. Maps the host's `CLAUDE.md` cascade, routes on what it
  finds, dispatches `memory-auditor` per approved target, then `memory-writer` on approval. Opens
  no file and writes none itself.
- `rules` - `/viber:rules`, user-only. Maps `.claude/rules/`, routes on what it finds, dispatches
  `rules-auditor` per approved target, then `rules-writer` on approval. Opens no file and writes
  none itself.
- `agents/` - `planner-review` (plan gate), `task-coder`, `task-reviewer`, `test-runner`,
  `memory-writer` and `memory-auditor`, `rules-writer` and `rules-auditor`, `qa-writer`,
  `e2e-writer`, `closeup`.
- `hooks/` - `plan-gate.sh` (the review gate, enforced by the harness) and `session-start.sh`,
  which injects `hooks/content/manifest.md`.

## Contracts & invariants

Only what spans several files. A rule that lives in one script header or one skill body stays
there.

- **One run, one directory.** `plan-path.sh` owns `docs/<runs>/<stamp>_<slug>/plan.md` and is the
  only place a plan path is formed. The stamp is taken when the plan lands, so a re-run of the same
  slug never overwrites an earlier one, and everything the run touches lives in that directory:
  the plan, `status.md`, the decomposition, the QA documents and `work/`. That is what lets another
  machine pick a build up from the history alone. Scratch goes to `.temp/viber/<id>/`, never a
  plugin-named dot-dir and never a state file.
- **Two spec shapes, one task half.** `spec-lite.md` or `spec-full.md` above, `tasks.md` under
  either. `plan-index.sh` reads five anchors above `## Tasks` (`## Goal`, `## Acceptance criteria`,
  `### File map`, `### Out of scope`, plus `### Must not change` in the big shape alone), which is
  why it never learned the shapes. A sixth, `## Tasks`, is the cut itself: `<!-- TASK -->` blocks
  under any other heading are refused rather than decomposed.
- **`### Must not change` is the one thing every coder holds.** It is the exception to everything
  else the big shape adds, which rides into `spec.md` and nowhere else: the criterion channel would
  hand a regression guard to one task while five others could break it. Every line costs context in
  every task file, so the template caps it.
- **A glossary term reaches a coder only as a contract block.** The glossary sits above `## Tasks`
  and is written for a person; a term the code has to spell gets its own `### C<n>` named by a
  task's `Uses:`, `File: none` being valid.
- **A draft is a run with no task in it, and the one plan that is not frozen.** `plan-path.sh`
  answers `state: draft`, `implementor` stops on it, and `planner` lands it itself because nothing
  downstream lands a plan with no task. Later rounds land `--into <key>`, refused once that run
  carries a task block, a `tasks/` directory or a `status.md`. A draft is never an `open:` line.
- **The plan carries the path it was written to.** `showClearContextOnPlanAccept` is seeded and
  recommended, so approval normally leaves `implementor` holding the plan's TEXT with no path; the
  frontmatter `source:` key is the whole handover. It is frontmatter rather than a comment because
  `spec.md` is archived from that head, so metadata declared as metadata is cut by structure.
  `implementor` still reads the older `<!-- source: -->` spelling.
- **Two layered cuts, never duplicated.** `--land` strips the templates' guidance comments, keeping
  only the markers the run reads; `--split` then writes `spec.md` without the frontmatter and
  without any HTML comment. `plan.md` keeps everything for as long as anything resumes from it.
- **Only that handoff is hardened; the front links are context-only on purpose.** `idea` and
  `fixer` reach `planner` inside one context, so both restate their payload verbatim and neither
  writes a handoff file. The one piece expensive to lose is a `fixer` trace, and its core rides in
  the reproduction test's header comment, which the fixing task commits anyway.
- **The scope gate is `idea`'s alone.** An idea spanning several independent subsystems is split
  into ordered subprojects before the first detail question; `planner` never sizes scope. The
  roadmap survives only inside the plan, later subprojects repeated under `### Out of scope`. A
  subproject boundary is not a delivery: nothing is stubbed, mocked or temporarily substituted,
  which works only because each subproject consumes what earlier ones produced.
- **`status.md` is the state, and the plan is frozen.** It carries `progress:`, `done:` and the four
  things a later session cannot derive (`skipped:`, `unreviewed:`, `deferred:`, `closed:`);
  `plan-index.sh --split` creates it and `commit-task.sh` is its only other writer. The document
  that DEFINES the work is never edited to record how the work is going, and what IS derivable is
  never stored - `dirty:` comes from intersecting `git status` with each task's `Files:`.
- **The commit is the run's only serialization point.** Two `commit-task.sh` calls never run at
  once: both rewrite the git index and `status.md`. Reviews go out in a batch instead. The status
  entry and the commit are atomic, because a task marked done but never committed is skipped
  forever on resume.
- **The decomposition is what the agents see; the index is what the orchestrator sees.** A task file
  carries its task block verbatim plus the plan's `## Goal`, its `Covers:` criteria, its `Uses:`
  contracts and `### Out of scope` - self-contained, so no agent gets a `spec:` line except on a
  post-test repair, which has no task file. `- DoD:` is cut on `;` into one clause per line, because
  a coder answers for each clause and a reviewer gates each one; the plan keeps the single line.
  A coder cannot read another task, and that isolation is the reason the split exists.
- **The plan has three parts, and a shape belongs to exactly one task file.** Above `## Tasks` is
  WHAT and WHY: a signature, type, endpoint, error code or dictionary key up there rides into
  `spec.md`. Shapes live in `### C<n>` blocks below the tasks and reach a coder only through
  `Uses:`, validated in both directions like `Covers:` and mandatory, saying `none` out loud. Which
  side of a block a task is on is never written down: the task whose `Files:` holds the block's own
  file writes it, every other one calls it as it stands.
- **The heading line IS the commit subject.** `commit-task.sh` reads `### T<n> - <title>` out of the
  plan, so no caller composes a subject and the history reads like the plan. Every other form
  derives its subject the same way and stages only what it was given; a regression outside the plan
  goes through `--repair` and never borrows a task id.
- **`Files:` is a machine-readable map, not prose.** Comma-separated exact repo-relative paths, no
  globs, no directories, no annotations. `plan-index.sh` rejects a plan where two tasks with no
  dependency path between them list the same file, so `deps` plus the file lists make parallelism
  deterministic and nothing re-checks it by hand. A bracket is read by SHAPE: wrapping a whole
  segment (`[id]`, `[...slug]`) it is an App Router directory and passes, inside a segment it is a
  character class and is refused. The same test guards a contract block's `File:`.
- **Disjoint is checked, complete is not, so three layers carry completeness.** No script can decide
  that a map names everything the work forces - a registration, a migration, a test asserting a
  count - because that is knowing the host's stack. `planner` maps what the change forces,
  `planner-review` gates a map a coder could not build from, and the rest is reported rather than
  lost: `task-coder` makes the smallest outside edit that compiles and returns it on `EXTRA:`,
  `task-reviewer` returns the same and never makes it a finding, `implementor` passes it to
  `--with`. Without that channel the loss is silent, because the commit script's warning subtracts
  the WHOLE plan map. The same pass checks `Covers:` in both directions, since nothing later gates
  the specification as a whole.
- **Untested code is owned by the task that will prove it, or it is unfinished.** A coder returns
  `DEFERRED: <path> -> <task id>` (or `-> none`) for a path whose proving criterion belongs to a
  later task; `implementor` turns it into `--defer` and `plan-index.sh` echoes the key, so another
  context can gate it there. Anything else left untested fails its own DoD clause.
- **A task's `Verification` is scoped to the task; the whole suite belongs to the close.** N coders
  share one tree, so a project-wide run turns another coder's half-written file into this task's
  red. Five files carry it: `planner` writes it narrow, `planner-review` treats a whole-project run
  as a finding, `references/test-strategy.md` states the scope, and both `task-coder` and
  `task-reviewer` drop a red they can trace outside their `Files`. What escapes belongs to
  `test-runner`, committed through `--repair`. Parallel build output is separated by a directory
  rather than a schedule: every coder and reviewer gets an `out: .temp/viber/<id>/` line, per task.
- **`Exclusive:` serialises the last test layer.** The doctrine lives in
  `references/test-strategy.md`, read at runtime by the four workers that decide it; the wiring is
  here. `Exclusive: true` is the plan's one OPTIONAL field and its only accepted value, reaches the
  orchestrator as the index's `excl` column and makes `implementor` dispatch that task alone. It is
  a declaration, never a judgement, which is why `planner-review` gates it in both directions.
- **Source files change through `Edit`/`Write`, and git never moves under a running build.** A
  scripted substitution that misses its pattern exits 0 over unchanged code, so the agent would
  report PASS on work it never did. Git is read-only for both tree-sharing agents (`status`,
  `diff`, `log`, `show`, never `stash`, `checkout`, `restore`, `clean`) and the permissions template
  denies those four verbs outright, because a prompt rule alone is a known non-compliance and the
  failure is silent until a coder notices its files are gone. The four agents that run commands
  leave nothing running when they return: a background shell outlives its agent and reports into the
  CALLER's session. The one legitimate background call belongs to the `e2e` SKILL.
- **Seven deterministic scripts, all self-verifying and all TRUSTED** - never re-verified, never
  retried. Each is invoked as one literal line, `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>`,
  never through an interpreter, with its own `allowed-tools` pattern in the calling skill.
  `archive-run.sh` is the exception, called by an AGENT: a subagent carries no `allowed-tools` and
  does not inherit the session's permission mode, so the bare `Bash` of the permissions template is
  what covers it. That is a deliberate departure from `qa-writer` handing paths back for
  `implementor` to commit, because routing one directory move through a skill that cannot `Read`
  would mean teaching it which files of the run are scaffolding.
- **`setup` seeds from `assets/` and merges in one direction only.** `.gitignore` is seeded when
  absent, otherwise the single edit is the `.temp/` rule. `.claude/viber.yml` is seeded when absent
  and MERGED when present: a top-level key the template has and the file lacks is appended with its
  own comment and default, a missing child of `directories:` is inserted inside that group, and
  every key already declared keeps its value, comment and position. That is how a new version's
  switches reach an old project, and it is why `false` is the one way to turn a switch off - a key
  deleted or commented out comes back at the template's default. `templates/viber.yml`,
  `assets/usage.md` and the README all say so, and a change there changes all four.
  `merge-settings.sh` is additive in the same sense and needs Node, the one deliberate tool
  dependency here: without it the block is printed for a manual merge and the run continues.
- **The permissions template allows the write tools outright.** A subagent does not inherit the
  session's permission mode and `defaultMode: acceptEdits` is scoped to the working directory, so
  ten of the eleven agents would start on an asking default and a stopped coder strands its whole
  batch. `deny` is therefore the layer that holds the line on `.env`, `.git/` and the key files.
- **The host's `CLAUDE.md` is reported, never seeded.** The build and test commands every agent
  reads belong to the user, and a stub written by a script is exactly the file that names none of
  them. `assets/usage.md` is likewise printed whole rather than paraphrased, which is why it is an
  asset: the skill is pinned to `model: haiku` and copies it instead of composing it.
- **The switches are read through `config.sh` alone; the two directory keys have three readers.**
  Five switches, fail-open (no file means all off) and always exit 0, because a preload that exits
  non-zero aborts the skill load. The directory names live in a `directories:` GROUP, a contract
  rather than a presentation: every reader ignores a same-named key outside it, since `runs` alone
  reads like a count. They are the exception to "through `config.sh` alone" because `plan-path.sh`
  and `archive-run.sh` run with no skill above them; each parses the group itself, ~10 lines,
  sanitizing to one path segment so no configuration error can move a run out of `docs/`. That
  duplication stays until a fourth reader appears, when it takes the `lib_viber_config.sh` shape
  `.claude/rules/shell-lib-scripts.md` describes. `adr` is weighed in `planner` alone, the one
  funnel both entries pass through.
- **The orchestrator never reads code and writes nothing.** `implementor` carries
  `disallowed-tools: Read, Write, Edit, NotebookEdit`: its whole view is `plan-index.sh`'s output,
  which is what lets one context outlast a full build.
- **The coders' notes are the input of the close, and of the gate beside them.** `task-coder` leaves
  at most 8 lines of what the diff does not say; the close's writers and `closeup` read that
  directory. Two readers come earlier: that task's own `task-reviewer`, for whom a note is a
  hypothesis to disprove and never evidence, and the coder of each dependent task, handed them as
  `prior:` so a decision carries forward deterministically. The close's first three run in one
  dispatch; `closeup` cannot join them, because it archives the directory they read and write.
- **The knowledge layer has two entries, never a third.** The build close dispatches
  `memory-writer` and `rules-writer` after every build; `/viber:memory` and `/viber:rules` dispatch
  the same two writers on the user's own schedule, each mapping its layer, routing on what it
  finds and gating on an `AskUserQuestion` the close never asks. `memory-auditor` and
  `rules-auditor` sit beside them and are read-only - `Read, Write, Grep, Glob` where `Write` never
  leaves `.temp/viber/<id>/` - so verifying the layer against the code never becomes a second way
  to change it. One writer per layer, reached from two entries.
- **The knowledge layer is capped, because its two writers run after every build.** Nothing else
  shrinks what they wrote, and a node is loaded whole by every agent that opens a file under it,
  its ancestors with it. `memory-writer`: 12000 characters per node, 32000 over the chain.
  `rules-writer`: 4000 per file, 40000 over `.claude/rules/`, at most 2 new files per build. Both
  measure before writing, both carry the order in which content leaves a full file (compact, split,
  write over budget and say so), and both report an `OVER:` line the orchestrator repeats verbatim.
  The same discipline binds this node: it is a viber file like any other.
- **A split is exempt from the growth cap.** Splitting a full file spends no knowledge, because a
  sibling node is never loaded beside the one a reader opened, so it beats deleting; a one-area rule
  file still over its cap is too wordy rather than too broad and gets compacted instead. Both
  writers may also DELETE what the project no longer has, confirmed with `Glob` first and never a
  frozen `_` rule, which is why `FILES:` names what was written OR deleted.
- **The trail is committed, each slice with the commit that owns it.** `commit-task.sh` DERIVES
  those paths from the id or the round rather than taking them from its caller, so a parallel
  coder's work in progress cannot ride along. The price is granularity: what crosses machines is
  whole tasks. Nothing sweeps `work/`; what a dropped task left there is picked up by the next
  `--split`, which commits the run directory whole.
- **The QA documents live in the run directory, which is what makes the close idempotent.** `qa.md`
  (performed by hand) and `qa.e2e.md` (automated by `/viber:e2e`) never land in a `docs/qa/` of
  their own: the run directory is unique to its build, so there is no index to maintain and no older
  entry to supersede. An existing `qa.md` is the resume signal, answered with `VERDICT: NONE` rather
  than an overwrite. `qa.md` is written in the user's language, the handoff's headings stay English
  because only an agent reads them, and both outlive the run.
- **The run directory is scaffolding; the archive is the product.** `archive-run.sh` moves the WHOLE
  directory to `docs/<specs>/<key>` (same key, so a second build lands beside this one and nothing
  is merged), then removes an ENUMERATED list - `plan.md`, `status.md`, `tasks/`, `work/` - because
  those four are a second copy of what git holds and keeping them buries the two things worth
  reading. Everything else rides along. Two gates decide whether it runs at all and both refuse
  rather than correct. There is no changelog and there will not be one: `closeup` edits `spec.md`
  BEFORE the move, so the drift is an ordinary diff.
- **Drift is what the specification now gets WRONG, never how the work went.** `closeup` marks a
  sentence of `spec.md` only where the spec promises P, the build delivers Q, and the two differ
  from the outside. A criterion met through other mechanics belongs to the notes the knowledge
  writers already read. `qa.md` and `qa.e2e.md` are never touched: they describe what was delivered.
- **"Chromium only" is carried by the generated file, not by a flag.** Every generated spec opens
  with `test.use({ browserName: 'chromium' })`. On the exploration side the rule is the absence of a
  flag, `playwright-cli` defaulting to chromium, and the install matches: one browser, not three.
- **`references/` holds what several workers share.** `qa-format.md` has two readers,
  `test-strategy.md` four (`planner`, `planner-review`, `task-reviewer`, `task-coder`), which keeps
  the test layering in one runtime file instead of four copies drifting apart. `rule-admission.md`
  has two readers, `rules-auditor` and `rules-writer`, the three criteria a candidate convention
  has to pass held in one place rather than repeated in both. No reader hardcodes the path: each
  takes a `refs:` label and reads the file at the step that consumes it.
- **The host's e2e test directory is the fourth writable location, and only because the host names
  it.** The three a plugin may write at its own choosing stay `docs/<layer>/`, `.claude/` and
  `.temp/<plugin>/`. The `e2e` skill resolves the host's directory, asks when nothing names it and
  never invents a sibling; `e2e-writer` writes exactly one file there per dispatch and never edits
  application code, so a red that is the application's fault comes back as `blocked`.
- **Strength is `model` alone.** The `Agent` tool takes no `effort` parameter, so an agent's own
  frontmatter is the only place one is set; `task-coder` carries `effort: high` and is dispatched at
  all three tiers, dead on `haiku` on purpose. A retried coder goes out one tier up carrying its own
  `REASON:`, since an identical re-run after five spent verification rounds is a coin flip.
  `task-reviewer` takes its task's tier (`model: opus` being only the fallback) and never lands on
  `haiku`. Whether a task is reviewed at all is independent of its tier: only a `Verification`
  running the build or the tests waives the gate, because a `grep` passes on invented content too.
- **Agent names are dispatched with the plugin prefix** (`viber:task-coder`, …). The hook's dispatch
  detector accepts both spellings, so a plan-gate run is not tied to the install form.
- **The manifest is injected, never routed to.** `session-start.sh` writes
  `hooks/content/manifest.md` verbatim at `startup|clear|compact` (`resume` excluded, the prior
  injection reloading with the transcript) and is fail-open: an unreadable file emits the banner
  alone. It names no skill and no chain, because routing lives in each skill's own `description:`.
- **The gate arms on two signals only** - the planner skill running, and a Write/Edit of a
  `plans/*.md` file in the same plan-mode episode - and fails open on everything else. Signal 1 is a
  `Skill` tool_use and nothing else, since `planner` is `user-invocable: false` and a model dispatch
  leaves no `<command-name>` line. That path is the HARNESS plan directory, not `docs/_specs/`. A
  broken gate must never trap the user in plan mode.
- **Known conflict: superdev's own ExitPlanMode gate.** Both plugins hook the same tool, and
  superdev's `review-plan.sh` denies a plan declaring neither `# SimplePlan` nor `# SuperPlan` -
  which is what a viber plan looks like. Install one track at a time.

## Anti-patterns

- Adding, removing or renaming a skill or agent without updating `.claude-plugin/plugin.json`
  (`skills[]` / `agents[]`) and this node. A worker must never appear in both arrays.
- Letting the orchestrator do a worker's job: reading source, running a test, writing code. Every
  such step is a dispatch.
- Handing an agent the plan file when the decomposition exists. The whole plan in a coder's context
  is the drift the split was built to remove.
- Teaching a skill a host project's stack. Test and build commands are read from the host's own
  instructions at runtime - `test-runner` falls back to whichever manifest is actually present.
- Restating a script's mechanics or a skill's own steps here. The header comment and the skill body
  are the contract; what belongs in this node is what spans files, and a second copy is what drifts.

## Related context

- `PRODUCT.md` - the product assumptions this plugin is built to hold: what viber must do on any
  project, how the test layers are supposed to stack, and what runs when. Read it before changing
  anything about planning, TDD or the test layers; a change that contradicts it is a change to the
  product, not to the wording.
- Repo-wide invariants, versioning, catalog layer: `../CLAUDE.md`
