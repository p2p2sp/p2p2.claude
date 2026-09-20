# viber

A programming assistant that gives the agent greater freedom when performing tasks, enabling the
highest quality and speed of work.

## Purpose

The vibe track: understand, plan, build, then record what the build taught. SIX skills (`setup`,
`idea`, `planner`, `implementor`, `tdd`, `fixer`), SIX agents, FOUR plugin-level scripts, TWO
skill-level setup scripts and TWO hooks - one `PreToolUse`, one `SessionStart`. Everything a run
produces lives in the host repo's
`docs/_specs/<stamp>_<slug>/` (the plan carrying its own progress, plus the decomposition every
agent reads) and `.temp/viber/<plan-key>/` (review reports, test reports, the coders' notes) - no
plugin-named dot-dir, no state file.

## Entry points

- `skills/setup/SKILL.md` - `/viber:setup`, user-only (`disable-model-invocation: true`). Seeds
  `.claude/viber.yml` and `.gitignore` through `skills/setup/scripts/bootstrap.sh`, then asks in one
  `AskUserQuestion` which of the three switches stay on and whether to merge the recommended
  permissions (`skills/setup/scripts/merge-settings.sh` over `skills/setup/assets/settings.json`),
  and closes by printing `skills/setup/assets/usage.md` verbatim.
- `skills/idea/SKILL.md` - `/viber:idea`, user-only. A prose interview, one question at a time,
  ending in a confirmed summary that hands over to `viber:planner`. Writes nothing.
- `skills/planner/SKILL.md` - model-invocable, and enters plan mode itself. Fills `skills/planner/templates/plan.md` into
  the plan file plan mode names, under `adr: true` puts the decisions worth recording to the user and
  turns each accepted one into a first task, validates the result
  with `scripts/plan-index.sh`, then gates on `viber:planner-review` until `VERDICT: PASS` before
  `ExitPlanMode`.
- `skills/implementor/SKILL.md` - model-invocable orchestrator, `[plan-path]` argument. Lands the approved plan in the
  dated directory with `scripts/plan-path.sh --land`, decomposes it with `plan-index.sh --split`, profiles
  each task into a model tier (haiku / sonnet / opus) and a review decision, dispatches
  `viber:task-coder` in the widest batch the dependency and file-collision rules allow, gates each
  reviewed task on `viber:task-reviewer`, commits it with `scripts/commit-task.sh`, closes on
  `viber:test-runner` and then, per switch, on `viber:memory-writer` and `viber:rules-writer`.
- `skills/fixer/SKILL.md` - `/viber:fixer`, user-only. Invoked on a bug report, it forces a
  traced diagnosis proven by a failing test, and hands the fix plan to `planner`, leaving that test
  RED in the tree for the fixing task's `Files:`. It never applies a fix itself.
- `skills/tdd/SKILL.md` - the Red-Green-Refactor discipline a `TDD: required` task is built under.
  Not user-invocable: `viber:task-coder` invokes it through the `Skill` tool before the first line
  of production code.
- `agents/` - `planner-review` (plan gate, read-only), `task-coder` (one task or one report, proves
  it green, never commits), `task-reviewer` (per-task gate, writes only its report), `test-runner`
  (one full suite run, keeps the log out of the caller's context), `memory-writer` and
  `rules-writer` (the close: the project's `CLAUDE.md` nodes and `.claude/rules/`).
- `hooks/hooks.json` -> `hooks/scripts/plan-gate.sh`: the review gate, enforced by the harness
  rather than by the model; and `hooks/scripts/session-start.sh`, which injects
  `hooks/content/manifest.md`.

## Contracts & invariants

- **One run, one directory.** `plan-path.sh` owns the layout
  `docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md` and is the only place a plan path is formed:
  the stamp is taken when the plan lands, so a re-run of the same slug never overwrites an earlier
  plan, and a run already open for that slug comes back as `state: existing` instead. That directory
  name is also the `<plan-key>` of the run's report dir, `.temp/viber/<plan-key>/`, and it holds the
  decomposition too - one key names everything the run touches.
- **`--land` moves the plan, not the model.** Plan mode writes the plan into its own directory - a
  user-level `plansDirectory`, so normally outside this repository - and approving it may clear the
  planning context. `plan-path.sh --land <src>` therefore COPIES that file into the run directory,
  derives the slug from the plan's own first H1, leaves the source untouched, and is idempotent: a
  `<src>` already landed, or a slug whose run is open, comes back `existing` with nothing written
  over the progress markers. The orchestrator never carries the plan's TEXT, only its path, which
  is why `implementor` needs no `Write` at all.
- **The plan file is the state.** `<!-- done: ... -->` plus the `## Tasks (x/N)` header carry
  progress, so a build resumes after a context reset with no sidecar. `commit-task.sh` is what
  advances both, and it stages ONLY the task's `Files:` list and commits through that same
  pathspec - anything outside the file map stays uncommitted and visible, including a path
  someone else left staged. Its stderr warning subtracts the WHOLE plan's map, not the one
  task's: coders run in parallel, so a warning naming their work in progress would fire on
  every commit, and what survives the subtraction is a change no task accounted for - the same
  split the close commits by (`--repair`). Two close-outs never run at once, because both
  rewrite the git index and the plan's progress line and nothing else in the run touches
  either. The marker and the commit are atomic: the marker is written
  first so it rides in the commit, and rolled back from a backup if staging or committing fails
  (exit 5). A task marked done that was never committed would be skipped forever on resume, so
  this is the one place in the plugin where a script undoes its own write.
- **The decomposition is what the agents see; the index is what the orchestrator sees.**
  `plan-index.sh --split` writes `spec.md` (everything above `## Tasks`) and one `tasks/<id>.md`
  per task, carrying the task block verbatim plus the text of the criteria its `Covers:` names. A
  coder handed `tasks/T3.md` cannot read another task, so it cannot drift into another task's
  files - that isolation is the reason the split exists, not the token saving. `tasks/` is rebuilt
  on every call, and the script commits its own output because no task's `Files:` list names it and
  `commit-task.sh` stages nothing it was not given.
- **Task ids are `T1`, `T2`, … and the heading line IS the commit subject.** `commit-task.sh` reads
  `### T<n> - <title>` out of the plan and commits it verbatim, so the orchestrator never composes a
  subject and the history reads like the plan. The id is also the name of the task's own file, so
  `plan-index.sh` refuses one carrying anything but letters, digits, `-` and `_`. A post-test repair
  is a second commit against the same task (`<plan> <id> <round> <file>...`), subject
  `T<n>(<round>) - <title>`, progress untouched. Two flag forms cover what the task map does not:
  `--repair <plan> <round> <file>...` for a post-test fix in code no task's `Files:` names (subject
  `fix(viber): post-test repair (round <n>)`), so a regression outside the plan is never attributed
  to a borrowed task id, and `--chore <file>...` for the memory and rule files the close produced.
  Both DERIVE their subject rather than take one. No form runs `git add -A` over the tree and no
  form commits the index as a whole - all four pass their own paths to `git commit` - and a
  `.temp/` entry is refused outright.
- **`Files:` is a machine-readable map, not prose.** Comma-separated exact repo-relative paths on
  one line, no globs, no directories, no annotations. `commit-task.sh` stages that list literally,
  and `plan-index.sh` compares it across tasks: a plan where two tasks with no dependency path
  between them list the same file is rejected at validation time. No skill and no agent re-checks
  that by hand - the graph plus the file lists make it fully deterministic.
- **Four deterministic scripts, all self-verifying.** `plan-path.sh` (resolve the plan path, and
  on `--land` put the approved plan there),
  `plan-index.sh` (validate, index, optionally decompose), `commit-task.sh` (stage, commit, record)
  and `config.sh` (resolve the switches) carry their I/O contract in their header comment and are
  TRUSTED by the caller - never re-verified, never retried. All are invoked as one literal line,
  `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>`, never through an interpreter, and each has its
  own `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh:*)` entry in the calling skill's `allowed-tools`.
- **`setup` seeds from `assets/`, and only into what the project does not already have.**
  `assets/gitignore.txt` becomes the host's `.gitignore` when it has none, otherwise the file is
  the user's and the single edit is the `.temp/` rule, appended on its own line. The permissions
  template `assets/settings.json` goes through `skills/setup/scripts/merge-settings.sh`, which is
  additive (host order and host-only keys survive, `defaultMode`/`disableAutoMode` are seeded but
  never overwritten) and idempotent. It needs Node on PATH - the one deliberate, documented tool
  dependency in this plugin, and a skip-with-note rather than a stop: without Node the block is
  printed for a manual merge and the run continues.
- **The host's `CLAUDE.md` is reported, never seeded, and the onboarding text is printed, never
  paraphrased.** `bootstrap.sh` only states whether the file is there, because the build and test
  commands every agent reads belong to the user: a stub written by a script would be exactly the
  `CLAUDE.md` that names none of them. The last thing `setup` emits is
  `skills/setup/assets/usage.md`, read and printed whole - the four entries, the switches, and why
  those commands have to be written down. It is an asset rather than body text so the skill, pinned
  to `model: haiku`, copies it instead of composing it.
- **The switches are read through `config.sh` alone.** `adr`, `memory` and `rules` live in
  `.claude/viber.yml`, resolved against the repository root, fail-open: no file means all three off,
  and the script always exits 0 because it runs as a `!` preload, where a non-zero exit would abort
  the whole skill load. `adr` is weighed in `planner` and nowhere else: `planner` is the one funnel
  all three entries pass through (`idea`, `fixer`, and "plan it" straight from an understood change),
  so weighing in `idea` would leave the switch dead on the other two. `implementor` carries `disallowed-tools: Read`, so the preload is not a
  convenience there but the only way it can know the values at all.
- **The orchestrator never reads code, and writes nothing.** `implementor` carries
  `disallowed-tools: Read, Write, Edit, NotebookEdit`: its whole view of the plan is
  `plan-index.sh`'s output, which is what lets one context outlast a full build, and every byte
  that reaches the tree comes from a script or an agent.
- **The coders' notes are the input of the close.** `task-coder` leaves at most 8 lines in
  `.temp/viber/<plan-key>/<id>-coder.md` - what the diff does not say - and `memory-writer` /
  `rules-writer` read that directory. They run in one dispatch and never wait for each other,
  because their scopes do not overlap: `CLAUDE.md` nodes belong to the first, `.claude/rules/` to
  the second.
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
  `plans/*.md` file in the same plan-mode episode - and fails open on everything else. That path is
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

- Repo-wide invariants, versioning, catalog layer: `../CLAUDE.md`
