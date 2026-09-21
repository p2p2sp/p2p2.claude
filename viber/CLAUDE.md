# viber

A programming assistant that gives the agent greater freedom when performing tasks, enabling the
highest quality and speed of work.

## Purpose

The vibe track: understand, plan, build, then record what the build taught. SEVEN skills (`setup`,
`idea`, `planner`, `implementor`, `tdd`, `fixer`, `e2e`), EIGHT agents, FIVE plugin-level scripts, TWO
skill-level setup scripts, TWO plugin-level references, ONE skill-level reference and TWO hooks -
one `PreToolUse`, one `SessionStart`. Everything a run produces lives in the host repo's
`docs/_specs/<stamp>_<slug>/`: the plan as it landed, `status.md` carrying its progress and
decisions, the decomposition
every agent reads, the QA documents the close writes, and `work/` - the coders' notes, the review
reports and the test reports, committed with the task they belong to. Only true scratch stays in
`.temp/viber/` (one `<id>/` per task, holding the build output its coder and its reviewer redirect
there, plus the e2e pass's launch logs and probe output) - no plugin-named dot-dir, no state file.

## Entry points

- `skills/setup/SKILL.md` - `/viber:setup`, user-only (`disable-model-invocation: true`). Seeds
  `.claude/viber.yml` and `.gitignore` through `skills/setup/scripts/bootstrap.sh`, merges the
  recommended permissions (`skills/setup/scripts/merge-settings.sh` over
  `skills/setup/assets/settings.json`) and closes by printing `skills/setup/assets/usage.md`
  verbatim. It asks nothing: both steps are additive and idempotent, and the switches are changed
  by editing `.claude/viber.yml`.
- `skills/idea/SKILL.md` - `/viber:idea`, user-only. A prose interview, one question at a time,
  opening on a scope check that splits an idea spanning several independent subsystems into ordered
  subprojects and then interviews the first one alone, ending in a confirmed summary that hands over
  to `viber:planner`. Writes nothing.
- `skills/planner/SKILL.md` - model-invocable, and enters plan mode itself. Checks its input came
  from a confirmed `idea` interview or a `fixer` diagnosis and invokes `idea` when it did not, fills `skills/planner/templates/plan.md` into
  the plan file plan mode names, that path written into the plan's own `<!-- source: -->` marker,
  under `adr: true` reads `skills/planner/references/adr-tasks.md` and follows it - the decisions
  worth recording go to the user and each accepted one becomes a first task, validates the result
  with `scripts/plan-index.sh`, then gates on `viber:planner-review` until `VERDICT: PASS` before
  `ExitPlanMode`.
- `skills/implementor/SKILL.md` - model-invocable orchestrator, `[plan-path]` argument. Lands the approved plan in the
  dated directory with `scripts/plan-path.sh --land` - the source path taken from the argument, else
  from the plan text's own `<!-- source: -->` marker, else from the script's no-argument resolution -
  decomposes it with `plan-index.sh --split`, profiles
  each task into a model tier (haiku / sonnet / opus) and a review decision, settles with the user
  whatever an interrupted session left half-finished,
  dispatches `viber:task-coder` in the widest batch the dependency and file-collision rules allow, gates each
  reviewed task on `viber:task-reviewer`, commits it with `scripts/commit-task.sh`, closes on
  `viber:test-runner` and then, per switch, on `viber:memory-writer`, `viber:rules-writer` and
  `viber:qa-writer`.
- `skills/e2e/SKILL.md` - `/viber:e2e`, user-only. Turns each scenario of one run's `qa.e2e.md` into a
  `@playwright/test` file: it preloads `scripts/check-playwright.sh`, resolves the run (its argument,
  else `plan-path.sh`), offers the install, launches the host's application, dispatches
  `viber:e2e-writer` one ID at a time and commits the result with `commit-task.sh --e2e`. It carries
  `disallowed-tools: Write, Edit, NotebookEdit` - not one byte of the tree is written here.
- `skills/fixer/SKILL.md` - `/viber:fixer`, user-only. Invoked on a bug report, it forces a
  traced diagnosis proven by a failing test, and hands the fix plan to `planner`, leaving that test
  RED in the tree for the fixing task's `Files:`, its header comment carrying the root cause. It
  never applies a fix itself.
- `skills/tdd/SKILL.md` - the Red-Green-Refactor discipline a `TDD: required` task is built under.
  Not user-invocable: `viber:task-coder` invokes it through the `Skill` tool before the first line
  of production code.
- `agents/` - `planner-review` (plan gate, read-only), `task-coder` (one task or one report, proves
  it green, never commits), `task-reviewer` (per-task gate, writes only its report), `test-runner`
  (one full suite run, keeps the log out of the caller's context), `memory-writer` and
  `rules-writer` (the close: the project's `CLAUDE.md` nodes and `.claude/rules/`), `qa-writer` (the
  close: the run's two QA documents) and `e2e-writer` (one scenario -> one Playwright spec, proven
  green against the running application).
- `hooks/hooks.json` -> `hooks/scripts/plan-gate.sh`: the review gate, enforced by the harness
  rather than by the model; and `hooks/scripts/session-start.sh`, which injects
  `hooks/content/manifest.md`.

## Contracts & invariants

- **One run, one directory.** `plan-path.sh` owns the layout
  `docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md` and is the only place a plan path is formed:
  the stamp is taken when the plan lands, so a re-run of the same slug never overwrites an earlier
  plan, and a run already open for that slug comes back as `state: existing` instead. That one
  directory holds everything the run touches: the plan, the decomposition, `work/` and the QA
  documents. Nothing of a run lives outside it, which is what lets another machine pick it up from
  the history alone.
- **`--land` moves the plan, not the model.** Plan mode writes the plan into its own directory - a
  user-level `plansDirectory`, so normally outside this repository - and approving it may clear the
  planning context. `plan-path.sh --land <src>` therefore COPIES that file into the run directory,
  derives the slug from the plan's own first H1, leaves the source untouched, and is idempotent: a
  `<src>` already landed, or a slug whose run is open, comes back `existing` with nothing written
  over the progress. The orchestrator never carries the plan's TEXT, only its path, which
  is why `implementor` needs no `Write` at all.
- **The plan carries the path it was written to, because the approval may take it away.**
  `showClearContextOnPlanAccept` is seeded by `setup` and recommended, so the normal path leaves
  `implementor` holding the approved plan's TEXT with no path and no planner message beside it. The
  template's `<!-- source: <abs path> -->` marker, written by `planner` and carried in that text, is
  the whole handover: the skill reads the path out of what it holds and hands it to `--land`, which
  copies the file. Nothing discovers a plan by scanning the harness plans directory, and
  `implementor` never writes the text it is holding - it has no `Write`.
- **What lands is the plan, not the template's advice.** `--land` strips the guidance comments on
  the way in, keeping only the markers the run itself reads (`<!-- TASK -->`, `<!-- /TASK -->`,
  `<!-- source: -->`). They are instructions for whoever writes the plan; left in, they ride into
  `spec.md`, into every task file and through the whole build. The source in the plans directory
  keeps them - it is never written to.
- **Only that handoff is hardened; the front links are context-only on purpose.** `idea` and
  `fixer` reach `planner` inside one context, with no mode change and no harness gate between
  them, so both restate their payload verbatim at the invocation and neither writes a handoff
  file. The one piece expensive enough to lose is the trace behind a `fixer` diagnosis, and its
  core rides in the reproduction test's header comment - a file the fixing task's `Files:` commits
  anyway. `idea` keeps writing nothing: an interview is cheap to repeat with the user who answered
  it.
- **The scope gate is `idea`'s alone, and the roadmap survives only inside the plan.** An idea
  spanning several independent subsystems is split into ordered subprojects BEFORE the interview's
  first detail question, because the alternative is dozens of questions and one plan of forty tasks;
  the first subproject is then interviewed alone and the rest wait for their own cycle. `planner`
  never sizes scope. It checks only that its input came from a confirmed interview or a `fixer`
  diagnosis and invokes `idea` when it did not, which is what closed the old third entry, "plan it"
  straight from an understood change. The accepted roadmap rides in the interview's summary into
  `planner`, which writes it as `## Roadmap` and repeats every later subproject under
  `### Out of scope`; `idea` still writes nothing, so the plan is the whole persistence and the next
  cycle, starting in a context this one never reaches, reads it there. `--split` carries the
  roadmap into `spec.md` alone, which is exactly why the later subprojects are repeated under
  `### Out of scope`: that is the one of the two sections a task file gets, and it is how a coder
  sees that a later subproject's element does not exist. A subproject boundary is not a delivery: nothing there is
  stubbed, mocked or temporarily substituted, and what makes that possible is the ordering
  constraint the split is built on - each subproject consumes only what earlier ones produced, and
  two pieces that cannot be ordered that way belong to one subproject.
- **`status.md` is the state, and the plan is frozen.** The run's progress lives in
  `<dir>/status.md` - `progress: x/N`, `done:`, plus the three things a later session cannot derive
  from the tree: `skipped:` (the user dropped a task, `--skip`), `unreviewed:` (the user waived the
  review gate, `--unreviewed`) and `closed:` (which half of the close is recorded, written by
  `--chore` and `--qa`). One key per line, `none` for an empty one. `plan-index.sh --split` creates
  it with the decomposition and `commit-task.sh` is its only other writer, which is what lets the
  plan and the specification stay exactly as they landed: the document that DEFINES the work is
  never edited to record how the work is going. A run with no `status.md` has simply done nothing
  yet. Everything else a resume needs IS derivable and is therefore
  never stored: `plan-index.sh` intersects `git status` with each task's `Files:` map and reports
  the difference as `dirty:`, which is how an interrupted task is told from one nobody started.
  Only `--skip` writes without a commit to ride in; its entry waits in `status.md` for the next one.
  `commit-task.sh` is what advances all of this, and it stages ONLY the task's `Files:` list, the
  paths `--with` named and the run's own trail, and commits through that same pathspec - anything
  else stays uncommitted and visible, including a path someone else left staged. Its stderr warning subtracts the WHOLE plan's map, not the one
  task's, and the run's own directory with it: coders run in parallel, so a warning naming their
  work in progress would fire on
  every commit, and what survives the subtraction is a change no task accounted for - the same
  split the close commits by (`--repair`). Two commits never run at once, because both
  rewrite the git index and `status.md` and nothing else in the run touches
  either - the commit is the run's only serialization point, and reviews go out in a batch. The entry and the commit are atomic: the entry is written
  first so it rides in the commit, and rolled back from a backup if staging or committing fails
  (exit 5). A task marked done that was never committed would be skipped forever on resume, so
  this is the one place in the plugin where a script undoes its own write.
- **The decomposition is what the agents see; the index is what the orchestrator sees.**
  `plan-index.sh --split` writes `spec.md` (everything above `## Tasks`) and one `tasks/<id>.md`
  per task, carrying the task block verbatim plus the plan's `## Goal`, the text of the criteria
  its `Covers:` names, the `## Contracts` blocks its `Uses:` names and the plan's
  `### Out of scope`. A
  coder handed `tasks/T3.md` cannot read another task, so it cannot drift into another task's
  files - that isolation is the reason the split exists, not the token saving. It is handed
  nothing else either: the file is self-contained, so neither `task-coder` nor `task-reviewer`
  gets a `spec:` line at all, and the one exception is a post-test repair, which has no task file
  and takes the spec instead. `tasks/` is rebuilt
  on every call, and the script commits its own output because no task's `Files:` list names it and
  `commit-task.sh` stages nothing it was not given.
- **The plan has three parts, and a shape belongs to exactly one task file.** Above `## Tasks` is
  WHAT and WHY and nothing else - a signature, type, endpoint, error code or dictionary key up
  there rides into `spec.md`, which is read whole. Every shape is a `### C<n> - <name>` block in
  the `## Contracts` appendix BELOW the tasks, and reaches a coder only through that task's
  `Uses:` line, validated in both directions like `Covers:`: a reference must name a real block,
  and a block no task names is rejected, because the slicing would leave it unreachable. `Uses:`
  is mandatory and says `none` out loud - a task missing the line and one that touches no shape
  would otherwise look the same. Which side of a block a task is on is never written down: the
  task whose `Files:` holds the block's own file writes it, every other one calls it as it
  stands. That rule is only worth anything if the two halves of the plan meet, so the block
  opens with `File:` - the paths the shape is declared in, or `none` - and `plan-index.sh`
  rejects a path no task creates and the tree does not already hold (the shape would be invented
  at compile time) and a path whose holders never name the block (its writer would never see the
  shape, and a consumer would write it outside its own file map). One holder naming it is
  enough: a file several tasks of one chain touch is not everyone's shape. An appendix where NO
  block carries `File:` predates the field and the whole layer stays off for it - a plan is
  frozen once it lands, so a run resumed after an upgrade has no way to grow the line and must
  still validate.
- **Task ids are `T1`, `T2`, … and the heading line IS the commit subject.** `commit-task.sh` reads
  `### T<n> - <title>` out of the plan and commits it verbatim, so the orchestrator never composes a
  subject and the history reads like the plan. The id is also the name of the task's own file, so
  `plan-index.sh` refuses one carrying anything but letters, digits, `-` and `_`. A post-test repair
  is a second commit against the same task (`<plan> <id> <round> <file>...`), subject
  `T<n>(<round>) - <title>`, progress untouched. Four flag forms cover what the task map does not:
  `--repair <plan> <round> <file>...` for a post-test fix in code no task's `Files:` names (subject
  `fix(viber): post-test repair (round <n>)`), so a regression outside the plan is never attributed
  to a borrowed task id, and `--chore <plan>`, `--qa <plan>` and `--e2e <file>...` for the three
  kinds of file a
  run produces beside its task map - the memory and rule files of the close, that close's QA
  documents (`docs(viber): qa scenarios`) and the Playwright specs a later `/viber:e2e` pass
  generated plus the handoff it updated (`test(viber): e2e specs`). The first two take the plan
  because they record the close in it; `--e2e` runs after the build, when nothing resumes any more,
  and takes none.
  All four DERIVE their subject rather than take one. No form runs `git add -A` over the tree and no
  form commits the index as a whole - all six pass their own paths to `git commit` - and a
  `.temp/` entry is refused outright. A seventh form, `--skip <plan> <id>`, is the one that commits
  nothing at all: it only records the user's decision in the plan.
- **`Files:` is a machine-readable map, not prose.** Comma-separated exact repo-relative paths on
  one line, no globs, no directories, no annotations. `commit-task.sh` stages that list literally,
  and `plan-index.sh` compares it across tasks: a plan where two tasks with no dependency path
  between them list the same file is rejected at validation time. No skill and no agent re-checks
  that by hand - the graph plus the file lists make it fully deterministic.
- **Disjoint is checked, complete is not, so completeness is carried by three layers.** Nothing
  can decide mechanically that a task's map names everything its work forces - the registration
  of a new type, the declaration and migration of a new persisted shape, the test asserting a
  count over what changed - because naming those files is knowing the host's stack, and no
  bundled script here may. So: `planner` maps what the change forces before it writes a task,
  `planner-review` gates a map a coder could not build from, and what still slips through is
  reported rather than lost. `task-coder` may make the smallest edit outside its `Files` that
  compiles and MUST return it on `EXTRA:`; `task-reviewer` returns the same and never turns it
  into a finding, because the coder cannot commit it and a second round cannot fix it;
  `implementor` passes those paths to `commit-task.sh --with`, which takes a path no other task
  claims and refuses one that has an owner - that task may have a coder writing the file right
  now, and its own commit stages it whole. Without that channel the danger is silent: the stderr
  warning subtracts the WHOLE plan map, so a file belonging to another task never appears in it
  and rides into whichever commit picks it up next. The same pass checks
  `Covers:` in BOTH directions - every reference names a real acceptance criterion, and every
  criterion is named by some task - because nothing later gates the specification as a whole: a
  criterion no task implements would otherwise ride through the build into a green close.
- **A task's `Verification` is scoped to the task; the whole suite belongs to the close.** N coders
  share one working tree, so a project-wide run turns another coder's half-written file into this
  task's red - a red the coder may not fix, because it is outside its `Files`. Five files carry the
  one contract: `planner` writes `Verification` over the task's own files only, `planner-review`
  treats a whole-project run as a finding, `references/test-strategy.md` states the run scope for
  whoever writes a test, and `task-coder` and `task-reviewer` both drop a red they
  can trace outside their `Files`. What escapes belongs to `test-runner` in the close, committed
  through `--repair`. What the narrowing leaves on a stack that compiles the whole project to run
  one test is handled by a directory, never by a schedule: `implementor` hands every coder and
  reviewer an `out: .temp/viber/<id>/` line, per task rather than per agent, and both redirect their
  build output there when the host's own instructions name a way - the flags belong to the host,
  which is where the build commands already live. The orchestrator therefore never judges whether
  two verifications may run together. A `Verification` hanging on a fixed port or one shared
  database is out of that reach and is a `planner-review` finding rather than something the run
  schedules around: isolating a test is the stack's job.
- **The test layers are ordered, and `Exclusive:` is what serialises the last one.** A
  `TDD: required` task proves its behaviour with unit tests alone: the database, queue, clock or
  network it needs sits behind a seam the test substitutes, decided by `planner` in the file map
  rather than improvised by a coder. An integration test never rides inside a TDD cycle. They are
  the plan's last tasks, one per boundary the change crosses rather than one per criterion, each
  `TDD: none` and `Exclusive: true`, each depending on the tasks it exercises, and each
  `Verification` runs that task's own integration test and nothing wider - the `Exclusive` slot is
  what makes running the real dependency safe, and the layer as a WHOLE runs again in
  `test-runner`'s closing pass. Proving that test green inside its own task keeps a broken one in a
  `task-reviewer` round instead of surfacing it in the close, where the repair coder has no task
  file and no file map. `Exclusive: true` is the plan's one OPTIONAL task field
  and its only accepted value (`plan-index.sh` exits 4 on `false` and on `none`, the mandatory
  fields' convention borrowed where it does not hold). It declares that a task cannot share the
  working tree or a machine-wide resource, reaches the orchestrator as the index's `excl` column
  and makes `implementor` dispatch that task alone. It is a declaration, never a judgement: the
  orchestrator still decides nothing about whether two verifications may run together, which is why
  `planner-review` gates it in both directions - a shared resource left unmarked, and a marker on a
  task that needs none and would stop the build for nothing. What the layers mean for slicing, for
  which deliverable carries no test at all and for what an integration test runs against lives in
  `references/test-strategy.md`, read at runtime by the four workers that decide it.
- **Source files change through `Edit`/`Write`, and git never moves under a running build.** Both
  agents that share the working tree carry it: `task-coder` rewrites a file with the file tools and
  spends `Bash` on reading, searching, building and testing, because a scripted substitution that
  misses its pattern exits 0 over unchanged code and the agent reports PASS on work it never did.
  Git is read-only for both - `status`, `diff`, `log`, `show` - never `stash`, `checkout`, `restore`
  or `clean`: N coders write in one tree, so anything that moves it takes their uncommitted work
  with it. `setup`'s permissions template denies those four verbs outright, because a prompt rule
  alone is a known non-compliance and this failure mode is silent until a coder notices its files
  are gone.
- **Five deterministic scripts, all self-verifying.** `plan-path.sh` (resolve the plan path, report
  every other unfinished run as an `open:` line, and on `--land` put the approved plan there,
  stripped of the template's guidance),
  `plan-index.sh` (validate, index, optionally decompose), `commit-task.sh` (stage, commit, record),
  `config.sh` (resolve the switches) and `check-playwright.sh` (report the e2e tooling, install
  nothing) carry their I/O contract in their header comment and are
  TRUSTED by the caller - never re-verified, never retried. All are invoked as one literal line,
  `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>`, never through an interpreter, and each has its
  own `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh:*)` entry in the calling skill's `allowed-tools`.
- **`setup` seeds from `assets/`, and only into what the project does not already have.**
  `assets/gitignore.txt` becomes the host's `.gitignore` when it has none, otherwise the file is
  the user's and the single edit is the `.temp/` rule, appended on its own line. The permissions
  template `assets/settings.json` goes through `skills/setup/scripts/merge-settings.sh`, which is
  additive (host order and host-only keys survive; `defaultMode`, `disableAutoMode` and every
  top-level key beside `permissions` are seeded when absent, never overwritten and never walked
  into) and idempotent. It needs Node on PATH - the one deliberate, documented tool
  dependency in this plugin, and a skip-with-note rather than a stop: without Node the block is
  printed for a manual merge and the run continues.
- **The host's `CLAUDE.md` is reported, never seeded, and the onboarding text is printed, never
  paraphrased.** `bootstrap.sh` only states whether the file is there, because the build and test
  commands every agent reads belong to the user: a stub written by a script would be exactly the
  `CLAUDE.md` that names none of them. The last thing `setup` emits is
  `skills/setup/assets/usage.md`, read and printed whole - the four entries, the switches, and why
  those commands have to be written down. It is an asset rather than body text so the skill, pinned
  to `model: haiku`, copies it instead of composing it.
- **The switches are read through `config.sh` alone.** `adr`, `memory`, `rules` and `qa` live in
  `.claude/viber.yml`, resolved against the repository root, fail-open: no file means all four off,
  and the script always exits 0 because it runs as a `!` preload, where a non-zero exit would abort
  the whole skill load. `adr` is weighed in `planner` and nowhere else: `planner` is the one funnel
  both entries pass through (`idea` and `fixer`),
  so weighing in `idea` would leave the switch dead on the other. `implementor` carries `disallowed-tools: Read`, so the preload is not a
  convenience there but the only way it can know the values at all.
- **The orchestrator never reads code, and writes nothing.** `implementor` carries
  `disallowed-tools: Read, Write, Edit, NotebookEdit`: its whole view of the plan is
  `plan-index.sh`'s output, which is what lets one context outlast a full build, and every byte
  that reaches the tree comes from a script or an agent.
- **The coders' notes are the input of the close.** `task-coder` leaves at most 8 lines in
  `<dir>/work/<id>-coder.md` - what the diff does not say - and `memory-writer`,
  `rules-writer` and `qa-writer` read that directory. All three run in one dispatch and never wait
  for each other, because their scopes do not overlap: `CLAUDE.md` nodes belong to the first,
  `.claude/rules/` to the second, the run directory's QA documents to the third. The notes are what
  makes a scenario describe the behaviour that was DELIVERED rather than the one that was planned.
- **The trail is committed, each slice with the commit that owns it.** A task's commit carries
  `work/<id>-coder.md` and `work/review-<id>-*.md`, a post-test round carries `work/tests-<n>.md`
  and `work/repair-<n>-coder.md` - `commit-task.sh` DERIVES those paths from the id or the round
  and never takes them from its caller, so a parallel coder's work in progress cannot ride along.
  That is what lets another machine read a run out of the history. The price is granularity: an
  interrupted task's trail is committed only when the task is, so what crosses machines is whole
  tasks, never a half-spent review round. No form sweeps `work/`, and the close does not either;
  what a dropped or abandoned task left there is picked up by the next `--split`, which commits the
  run directory whole.
- **The QA documents live in the run directory, and that is what makes the close idempotent.**
  `qa-writer` writes `qa.md` (a person performs it by hand) and `qa.e2e.md` (an agent automates it)
  into `docs/_specs/<stamp>_<slug>/`, never into a `docs/qa/` of their own. That directory is
  unique to its build, so there is no index to maintain and no older entry to supersede - the two
  rules superdev's equivalent layer needed both fall away. An existing `qa.md` is the resume signal:
  the writer returns `VERDICT: NONE` rather than overwrite scenarios a tester may already have
  worked through. `qa.md` is rendered in the language the user is conversing in (the language the
  run's own specification carries); the handoff's headings and fields stay English, because only an
  agent reads them.
- **"Chromium only" is carried by the generated file, not by a flag.** Every spec `e2e-writer`
  produces opens with `test.use({ browserName: 'chromium' })`, which holds whatever the host's
  Playwright config declares and whoever runs the file later. On the exploration side the rule is
  the absence of a flag: `playwright-cli` defaults to chromium, so `--browser` is never passed. The
  install path matches - `npx playwright install chromium`, one browser, not three.
- **`references/` holds what several workers share.** `qa-format.md` has two readers, `qa-writer`
  (writes the two documents) and `e2e-writer` (reads the handoff, appends the automation lines).
  `test-strategy.md` has four - `planner` slices the work by it, `planner-review` and
  `task-reviewer` gate on the blocking findings it lists, `task-coder` writes tests under it - and
  that is what keeps `PRODUCT.md`'s test layering in one file instead of four copies drifting
  apart. A shared file is the whole reason the directory exists rather than each format living
  inside one agent. No reader has the path hardcoded: each takes it as a `refs:` label, passed as
  the literal `${CLAUDE_PLUGIN_ROOT}/references` by `implementor`, by `planner` and by `e2e`.
  `implementor` carries `disallowed-tools: Read`, so it hands over that path without ever opening
  what is behind it; `planner` is the one reader that is a skill rather than an agent, so it reads
  `test-strategy.md` itself. Both files are read at the step that consumes them - a coder on a
  `TDD: none` task with no tests in its `DoD` never opens either.
- **The host's e2e test directory is the fourth writable location, and only because the host names
  it.** The three a plugin may write at its own choosing stay `docs/<layer>/`, `.claude/` and
  `.temp/<plugin>/`. A generated spec lands outside all three, in whatever directory the project's
  own instructions call its e2e directory - the `e2e` skill resolves it, asks the user when nothing
  names it, and never invents a sibling. `e2e-writer` writes exactly one file there per dispatch and
  touches no config, no helper and no `package.json`; application code is never edited at all, so a
  red that is the application's fault comes back as `blocked` and stays a finding.
- **Strength is `model` alone.** The `Agent` tool takes no `effort` parameter, so an agent's own
  frontmatter is the only place one is set. `task-coder` carries `effort: high` and is dispatched at
  all three tiers: on `haiku` that setting is dead, because Haiku 4.5 has no effort control. It stays
  that way on purpose - the haiku tier is picked for mechanical work that needs no thinking budget,
  and a second coder file would duplicate the body for nothing. A coder's `VERDICT: FAIL` the user
  retries is the one place a tier moves: the re-dispatch goes out one step up, carrying the returned
  `REASON:` as a `reason:` line, because an identical re-run of a coder that already spent its five
  verification rounds is a coin flip. `task-reviewer` is dispatched with
  `model` set to its task's own tier, its `model: opus` frontmatter being only the fallback, and
  never lands on `haiku` because the mechanical tier carries no review.
- **Agent names are dispatched with the plugin prefix** (`viber:task-coder`, …). The hook's
  dispatch detector accepts both the bare and the prefixed spelling, so a plan-gate run is not
  tied to the install form.
- **The manifest is injected, never routed to.** `session-start.sh` writes
  `hooks/content/manifest.md` verbatim into the main session at `startup|clear|compact` (`resume`
  is excluded by the matcher, since the prior injection reloads with the transcript) and is
  fail-open: an empty or unreadable file emits the `viber loaded <version>` banner alone, with no
  `additionalContext`, so nothing half-written ever leaks into the context. It carries standing
  rules only - it names no skill and no chain, because routing lives in each skill's own
  `description:`.
- **The gate arms on two signals only** - the planner skill running, and a Write/Edit of a
  `plans/*.md` file in the same plan-mode episode - and fails open on everything else. Signal 1 is
  a `Skill` tool_use and nothing else: `planner` is `user-invocable: false`, so no typed command
  loads it, and a model dispatch leaves no `<command-name>` line in the transcript. A detector on
  that line would be dead for viber and live for any OTHER plugin shipping a typeable `planner`. That path is
  the HARNESS plan directory, the one plan mode names itself, not `docs/_specs/`: the gate fires
  while the plan is still a draft, long before the implementor lands it. A broken gate must never
  trap the user in plan mode.
- **Known conflict: superdev's own ExitPlanMode gate.** Both plugins hook the same tool, and
  superdev's `review-plan.sh` denies a plan under `.claude/plans/*.md` that declares neither
  `# SimplePlan` nor `# SuperPlan`. A viber plan declares neither, so with both plugins installed
  the superdev gate blocks viber's `ExitPlanMode`. Install one track at a time until one of the
  two gates learns to stand down for the other's plan format.

## Anti-patterns

- Adding, removing or renaming a skill or agent without updating `.claude-plugin/plugin.json`
  (`skills[]` / `agents[]`) and this node. A worker must never appear in both arrays.
- Letting the orchestrator do a worker's job: reading source, running a test, writing code. Every
  such step is a dispatch.
- Handing an agent the plan file when the decomposition exists. The whole plan in a coder's context
  is the drift the split was built to remove.
- Teaching a skill a host project's stack. Test and build commands are read from the host's own
  instructions at runtime - `test-runner` falls back to whichever manifest is actually present.

## Related context

- `PRODUCT.md` - the product assumptions this plugin is built to hold: what viber must do on any
  project, how the test layers are supposed to stack, and what runs when. Read it before changing
  anything about planning, TDD or the test layers; a change that contradicts it is a change to the
  product, not to the wording.
- Repo-wide invariants, versioning, catalog layer: `../CLAUDE.md`
