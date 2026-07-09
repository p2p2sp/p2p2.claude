# superdev — interview, planning, and the two-track agentic-development pipeline

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skills / manifest / hooks as runtime data, and the plugin reads
> host-project memory from the **consuming** repo's `CLAUDE.md` + `.claude/rules/`, never from here. See the
> root `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is
> specific to `superdev`.

## Layout (superdev internals)

```
superdev/
  .claude-plugin/plugin.json   The manifest — skills[] is the catalog of record (22 skills). No agents[]:
                               the plugin ships no agent files; every pipeline worker is a skill.
  hooks/
    hooks.json                 SessionStart (inject manifest) + PreToolUse: ExitPlanMode (plan-review gate)
    content/manifest.md        The injected using-superdev dispatcher — generic, injected verbatim, identical for every project
    scripts/                   session-start.sh, review-plan.sh (+ review-plan.test.sh)
  scripts/                     Plugin-level deterministic helpers, invoked as ${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh:
                               decompose.sh (plan -> working dir + task files), commit-task.sh (per-task/report
                               commit, delegates to status-update.sh), status-update.sh, resolve-input.sh (fork
                               input injector), lib_find_excludes.sh (sourced by superdev-memory's scan scripts)
  skills/                      22 skills — see taxonomy. Bundled helpers live under the owning skill's own dir:
                               setup/{scripts,assets}, superdev-memory/{scripts,references},
                               superspec/{templates,references}, superplan|simpleplan/templates.
```

## The pipeline — two tracks

The entry skill `superdev` runs the design interview, then at a user-picked handoff gate routes to one of two
tracks. Each track owns its own plan / build / reviewer family; both end by delegating memory close-out to
`superdev-memory` + `superdev-rules`.

- **Simple track** — small, contained, reversible changes; no spec, the plan carries its own DoD.
  `superdev → simpleplan → [approved plan] → simplebuild`.
  - `simpleplan` drafts the plan (template `templates/plan.md`), self-reviews, then gates on the
    `simpleplan-reviewer` fork returning `VERDICT: PASS` before `ExitPlanMode`.
  - `simplebuild` (invoked only when the approved plan's body says so) decomposes via the bundled
    `decompose.sh`, loops each task through the `simplebuild-implementor` fork + a commit,
    runs a final `simplebuild-reviewer` fork fix-loop, then close-out.

- **Spec track** — medium/large, cross-cutting, or hard-to-reverse work.
  `superdev → superspec → superplan → [approved plan] → superbuild`.
  - `superspec` writes the `What & Why` spec (template `templates/spec.md`, checklist `references/checklist.md`),
    gates on the `superspec-reviewer` fork returning `VERDICT: PASS`, then hands the spec path to `superplan`.
  - `superplan` writes the `How` plan, gates on the `superplan-reviewer` fork `VERDICT: PASS` before `ExitPlanMode`.
  - `superbuild` decomposes via the bundled `decompose.sh` (requires a `spec:` line), records an ADR via the
    `superbuild-adr` fork, loops each task through `superbuild-task-coder` + `superbuild-task-reviewer` forks + a
    commit, then runs the final review pair `superbuild-reviewer-spec` then `superbuild-reviewer-code` (forks) as
    a fix-loop, then close-out.

- `superspec-refine` — user entry to evolve an existing spec: it reads the spec at `$ARGUMENTS`, then runs the
  `superdev` interview over it; the eventual `superspec` handoff overwrites that file in place.

The two build orchestrators (`superbuild`, `simplebuild`) are `user-invocable: false` skills that drive the task
loop directly with the `Task*` tools and dispatch the fork workers via the `Skill` tool. Both shell out to the
plugin-bundled `${CLAUDE_PLUGIN_ROOT}/scripts/{decompose,commit-task,status-update}.sh` for the deterministic
steps; the fork workers pull their inputs through the bundled `resolve-input.sh` (see file-based dispatch).

## Skill taxonomy (functional roles)

The per-skill catalog of record is `.claude-plugin/plugin.json` `skills[]`; the injected manifest
(`hooks/content/manifest.md`) is a generic dispatcher and does not list individual skills.

- **Entry & environment** — `superdev` (always-on interview entry; model-invocable; the heart of the ecosystem,
  every creative session starts here) and `setup` (one-time `/setup`; `user-invocable` + `disable-model-invocation`,
  so it never auto-routes and stays out of the manifest).
- **Spec** — `superspec`, `superspec-refine`, `superspec-reviewer`.
- **Plan** — `superplan` + `superplan-reviewer` (spec track); `simpleplan` + `simpleplan-reviewer` (simple track).
- **Build (spec)** — `superbuild`, `superbuild-adr`, `superbuild-task-coder`, `superbuild-task-reviewer`,
  `superbuild-reviewer-spec`, `superbuild-reviewer-code`.
- **Build (simple)** — `simplebuild`, `simplebuild-implementor`, `simplebuild-reviewer`.
- **Project memory** — `superdev-memory` (the CLAUDE.md cascade; `user-invocable` AND the writer both build
  tracks delegate to at close-out) and `superdev-rules` (the `.claude/rules/` learning layer, delegated to at
  close-out — currently a stub that returns `Done`).
- **Standalone** — `tdd`, `debug`.

## Naming & fork conventions

- User-facing / auto-routed skills and the two build orchestrators are bare-named. Fork workers carry
  `context: fork` + `user-invocable: false` + a one-line `description:` routing guard ("invoked only by X") —
  that single line is the whole guard; the body never narrates its caller.
- The skill names mirror the call tree per track: the `superspec-*` / `superplan-*` / `superbuild-*` family (spec
  track) and the `simpleplan-*` / `simplebuild-*` family (simple track).
- The plugin ships **no agents** — every worker is a skill, dispatched via the `Skill` tool.

## Architecture invariants (superdev-specific)

Repo-wide invariants (self-documentation, "no `hooks` field in `plugin.json`", the script-vs-fork principle, the
one-manifest pattern) live in the root `CLAUDE.md`. These are superdev's.

- **Injected manifest.** `session-start.sh` (SessionStart, matcher `startup|clear|compact`; `resume` excluded)
  force-injects `hooks/content/manifest.md` **verbatim**, identical for every project; fail-open (an unreadable
  manifest = banner only, no `additionalContext`). The hook does no per-project rendering.
- **Plan gate.** `review-plan.sh` (PreToolUse: `ExitPlanMode`) denies plan approval until the transcript shows a
  `superplan-reviewer` invocation followed by its own `Verdict: PASS`, triggered by a plan-file write under
  `.claude/plans/*.md`; it also re-gates on post-approval tampering of the plan file. Fail-open on any parse
  miss. The plan skills invoke their reviewer **proactively** (Layer-A), so in the happy path the gate simply
  allows — the deny is a backstop. The hook keys specifically on `superplan-reviewer`; the simple track's
  `simpleplan-reviewer` is a Layer-A soft gate only (no `PreToolUse` backstop).
- **File-based dispatch.** Pipeline state lives under the decompose working dir (`.superdev/.workflows/<slug>/`);
  forks receive their inputs **injected via dynamic `!` context** (the bundled `resolve-input.sh` consumes a
  labeled-line `args` block and cats the named files), not via `Read`, and reply with a `VERDICT: PASS | FAIL`
  line (+ a `REASON:` line or `REVIEW: <path>`). The deterministic steps (decompose, per-task commit,
  status bump, input resolution) are bundled `${CLAUDE_PLUGIN_ROOT}/scripts/*.sh`, self-verifying and trusted by
  their callers — the orchestrator does not re-verify a script's result.
- **Opt-in switches (`.superdev/config.yml`).** `setup` seeds the file from a bundled asset with three
  default-`false` booleans — `adr`, `rules`, `memory` — then interactively flips the user's picks on (never
  overwriting an existing file). `setup` is the only reader/writer today: the build orchestrators run the ADR and
  memory/rules close-out steps unconditionally, so config consumption by the pipeline is not yet wired.
