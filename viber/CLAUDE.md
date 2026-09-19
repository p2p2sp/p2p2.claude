# viber

## Purpose

The three-step vibe track: understand, plan, build. THREE skills (`idea`, `planner`,
`implementor`), FOUR agents, TWO plugin-level scripts and ONE `PreToolUse` hook. Everything a
run produces lives in the host repo's `docs/plans/` (the plan, which carries its own progress)
and `.temp/viber/` (review and test reports) - no plugin-named dot-dir, no state file.

## Entry points

- `skills/idea/SKILL.md` - `/viber:idea`, user-only (`disable-model-invocation: true`). A prose
  interview, one question at a time, ending in a confirmed summary that hands over to
  `viber:planner`. Writes nothing.
- `skills/planner/SKILL.md` - model-invocable, enters plan mode itself. Fills
  `skills/planner/templates/plan.md` into the plan file plan mode names, validates it with
  `scripts/plan-index.sh`, then gates on `viber:planner-review` until `VERDICT: PASS` before
  `ExitPlanMode`.
- `skills/implementor/SKILL.md` - model-invocable orchestrator, `[plan-path]` argument. Lands the
  plan under `docs/plans/`, profiles each task into a model tier (haiku / sonnet / opus) and a
  review decision, dispatches `viber:task-coder` in the widest batch the dependency and
  file-collision rules allow, gates each reviewed task on `viber:task-reviewer`, commits it with
  `scripts/commit-task.sh`, and closes on `viber:test-runner`.
- `agents/` - `planner-review` (plan gate, read-only), `task-coder` (one task or one report,
  proves it green, never commits), `task-reviewer` (per-task gate, writes only its report),
  `test-runner` (one full suite run, keeps the log out of the caller's context).
- `hooks/hooks.json` -> `hooks/scripts/plan-gate.sh`: the review gate, enforced by the harness
  rather than by the model.

## Contracts & invariants

- **The plan file is the state.** `<!-- done: ... -->` plus the `## Tasks (x/N)` header carry
  progress, so a build resumes after a context reset with no sidecar. `commit-task.sh` is what
  advances both, and it stages ONLY the task's `Files:` list - anything written outside the file
  map stays uncommitted and visible.
- **Two deterministic scripts, both self-verifying.** `plan-index.sh` (validate + compact index)
  and `commit-task.sh` (stage, commit, record) carry their I/O contract in their header comment
  and are TRUSTED by the caller - never re-verified, never retried. Both are invoked as one
  literal line, `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>`, never through an interpreter,
  and each has its own `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh:*)` entry in the calling
  skill's `allowed-tools`.
- **The orchestrator never reads code.** `implementor` carries `disallowed-tools: Read, Edit,
  NotebookEdit`: its whole view of the plan is `plan-index.sh`'s output, which is what lets one
  context outlast a full build.
- **Agent names are dispatched with the plugin prefix** (`viber:task-coder`, …). The hook's
  dispatch detector accepts both the bare and the prefixed spelling, so a plan-gate run is not
  tied to the install form.
- **The gate arms on two signals only** - the planner skill running, and a Write/Edit of a
  `plans/*.md` file in the same plan-mode episode - and fails open on everything else. A broken
  gate must never trap the user in plan mode.
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
- Teaching a skill a host project's stack. Test and build commands are read from the host's own
  instructions at runtime - `test-runner` falls back to whichever manifest is actually present.

## Related context

- Repo-wide invariants, versioning, catalog layer: `../CLAUDE.md`
