# superdev — project memory, planning, and the agentic-development pipeline

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skills / manifest / hooks as runtime data, and the plugin reads
> host-project memory from the **consuming** repo's `CLAUDE.md` + `.claude/rules/`, never from here. See the
> root `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is
> specific to `superdev`.

## Layout (superdev internals)

```
superdev/
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  hooks/             One injected dispatcher manifest + the two hook scripts
    hooks.json       SessionStart (inject manifest) + PreToolUse: ExitPlanMode (plan-review gate)
    content/manifest.md  The injected `using-superdev` dispatcher
    scripts/         session-start.sh, review-plan.sh
  shared/            Plugin-level shared assets + scripts:
                     rubric.md; rubric-core.md (the shared 4-section "How to …" review-rubric core, read by
                     both rubric.md and superbuild/references/task-review.md); rubric-code-review.md (the
                     dimension-agnostic scope / false-positive / 3-bucket-severity rules for the four quality
                     lenses); references/ (auditor-contract.sh fragments _input.md / _output.md /
                     lens-{architecture,code-quality,production-readiness,testing}.md + run-and-report.md —
                     the shared runner executor core read by the runner agent + superbuild-runner);
                     coder-modes/ work-order files;
                     scripts/lib_find_excludes.sh (sourced by the memory-layers / memory-rules scans);
                     scripts/auditor-contract.sh (router-style body assembler `!`-injected by the four
                     superbuild-reviewer-{quality,architecture,testing,readiness} lenses; takes the lens name
                     and cat-concatenates _input.md + lens-<lens>.md + _output.md — placeholder-free, so no
                     ${CLAUDE_PLUGIN_ROOT} survives into the fork);
                     scripts/persist-report.sh (+ persist-report.test.sh — the self-verifying pipeline-report
                     persister shared by the runner agent + superbuild-runner)
  skills/            Skills (bare-named by functional role; the implementation-pipeline forks share the
                     `superbuild-*` family prefix). Some skills bundle a deterministic helper under their own
                     scripts/ dir: superbuild/scripts/commit-task.sh + commit-adr.sh + commit-docs.sh +
                     task-pipeline.workflow.js, superbuild-recipe/scripts/recipe.template.sh
                     (+ recipe.template.test.sh), superbuild-decomposer/scripts/{precheck.sh (Step 0
                     idempotency, `!`-injected), copy_plan.sh (Step 7.0 byte-exact plan copy + status reset),
                     validate_tasks.py (Step 8 structural validator), toposort.py (Step 5 topological sort +
                     cycle detection), their sourced slug-guard.sh helper, each with a committed *.test.sh
                     harness + skill_contract.test.sh + scripts/fixtures/handtrace-*.md},
                     memory-rules/scripts/route.sh (+ scan_extensions.sh, detect_state.sh, scan_conventions.sh),
                     setup/scripts/bootstrap.sh.
                     superbuild also bundles the 5 per-task pipeline plugin agents under its agents/ subdir
                     (coder.md, runner.md, task-reviewer.md, improver.md, commiter.md), plus a bundled
                     references/task-review.md (task-reviewer's own task-review variant — the 5 dimensions /
                     3-bucket severity / PASS-FAIL mapping only; the four shared "How to …" sections live once
                     in shared/rubric-core.md)
```

## Skill taxonomy (functional roles, not name prefixes)

superdev's skills are **bare-named** (the `dev-`/`mem-`/`doc-` group prefixes are gone), except the
implementation-pipeline forks which share the `superbuild-*` family prefix (see the naming sub-convention
below); the functional roles below are how they group. The **per-skill** catalog of record is
`.claude-plugin/plugin.json` `skills[]`; the injected manifest (`hooks/content/manifest.md`) documents the
groups/roles + cross-skill chains, not individual skills.

**Naming sub-convention (`superbuild-*` family).** The implementation-pipeline fork skills share a hierarchical
`superbuild-*` prefix that mirrors the call tree: `superbuild` (the dispatcher) invokes `superbuild-recipe`,
`superbuild-adr`, `superbuild-docs`, `superbuild-decomposer`, `superbuild-runner`, and `superbuild-reviewer`;
`superbuild-reviewer` in turn fans out to `superbuild-reviewer-plan`, `superbuild-reviewer-quality`,
`superbuild-reviewer-architecture`, `superbuild-reviewer-testing`, `superbuild-reviewer-readiness`. They are
forked, fork-only **skill** workers — invoked **only by a superordinate skill via the `Skill` tool** (never the
user, never auto-routed) — and stay **skills** (not `agents/<name>.md` definitions). The name no longer carries
that signal (the former `agent-` marker is gone); fork-only nature lives entirely in frontmatter (`context: fork`
+ `user-invocable: false` + a one-line "pipeline-bound; invoked only by …" guard `description`). The five
per-task pipeline workers are NOT `superbuild-`-prefixed: `coder`, `runner`, `task-reviewer`, `improver`,
`commiter` are real **plugin agents** (`skills/superbuild/agents/*.md`, listed in `plugin.json`
`agents[]`, dispatched by the `task-pipeline.workflow.js` via `agentType:'superdev:<name>'`) — bare-named
precisely because they are genuine agents, not fork-skills. (`commiter` is a thin haiku wrapper — it only runs
`commit-task.sh` and relays its tag; `runner` is a haiku executor that runs the task gate directly (reads the
shared run-and-report core, runs the recipe verbs, persists via `persist-report.sh`) — no longer nesting a
`superbuild-runner` fork — but each is still a workflow-dispatched plugin agent, so they stay
bare-named like the other three.) Every user-facing / auto-routed superdev skill is bare-named, as is the
planning fork `superplan-reviewer` and the self-mode code-review fork `self-reviewer`.

- **Entry & environment** — two top-level skills:
  - `superdev`: the always-on **entry skill** (the renamed former `dev-interview`), named after the plugin
    itself because it is the heart of the ecosystem — every session's creative work starts here. It interviews
    the user to map the design tree before any plan/code, then hands off silently to `superplan`. It is
    model-invocable and is the skill the manifest's decision flow forces first (step 1), unlike `setup`.
  - `setup`: one-time, user-only environment bootstrap (`/setup`). Seeds `.temp/` + `.superdev/`,
  copies the bundled `.gitignore` / `.claude/settings.json` templates, **seeds `.claude/rules/_superdev.md`
  from a bundled asset** (a frozen, `_`-prefixed pointer rule reminding the agent of the `<superdev:manifest>`
  mandatory rules — this is how the plugin gets any standing memory into `.claude/rules/`, since a plugin
  cannot ship that directory at install time), and **seeds `.superdev/config.yml` from a
  bundled asset** (`setup/scripts/bootstrap.sh` copies `assets/config.yml`, all switches seeded `false`, never
  overwriting an existing one), then **interactively asks the 3 opt-in switches** and `Edit`s the freshly-seeded
  file to flip the selected ones on. Runs in the **main session** (not a fork) so it can prompt via
  `AskUserQuestion`. It is `disable-model-invocation` (Claude never auto-routes to it) so it is **deliberately
  absent from the manifest** — see the Self-documentation invariant in the root `CLAUDE.md`.
- **Project memory (agent-facing)** (2 skills): `memory-layers` (CLAUDE.md cascade), `memory-rules`
  (`.claude/rules/` layer).

  **Memory layer division.** Agent-facing project knowledge splits current truth across five non-overlapping
  layers, picked by *kind of truth* — all five face the **agent**: (1) the general-rules
  manifest (superdev's `hooks/content/manifest.md`, force-injected per session);
  (2) the `CLAUDE.md` cascade (terse agent orientation; `memory-layers`); (3) `.claude/rules/*` (path-scoped
  conventions; `memory-rules`, which has **4 modes** — A uninitialized bootstrap, B initialized gap-fill, C
  improver-driven authoring (fork), D user-driven authoring (main context; user dictates a rule to append); in-pipeline
  the `improver` agent judges value, `memory-rules` (Mode C) authors);
  (4) `.superdev/adr/` (architectural *why*; written in-pipeline by `superbuild-adr`);
  (5) `.superdev/docs/` (as-built behavioural **what** — what the app does today: an `index.md` slice map plus
  per-slice shards of capabilities / acceptance criteria / contracts / code+test anchors; written in-pipeline by
  `superbuild-docs` as the **last** pipeline step, config-gated `docs`). In the dev
  pipeline, `superbuild-adr` records any architectural decision into layer 4 before decompose
  (config-gated `adr`), the `improver` agent promotes each task's review learnings into layer 3
  (`.claude/rules/`) — judging which learnings are worth keeping and delegating the authoring to `memory-rules`
  Mode C, the in-pipeline writer into `.claude/rules/` — a config-gated step (`rules_improver`), and after the
  final review `superbuild-docs` reconciles layer 5 incrementally against the cumulative `plan.diff`
  (config-gated `docs`).
  The product's **end-user** help documentation is a distinct, non-agent layer owned by the end-user
  documentation role below (NOT agent memory) — same **what** as layer 5 but faced at the end user, not the agent.
- **End-user documentation** (1 skill): `help-writer` (the end-user product-help layer → `.superdev/help/`).
  Authors the human-facing help that ships to the people who use the built app — distinct
  from the agent-facing memory layers above; faces the end user, not Claude.
- **Agentic-development pipeline + diagnostics/specs** (19 skills + 5 plugin agents): planning
  (`superplan`, `superplan-reviewer` — a read-only fork that reviews the plan against the spec and
  superplan's required components/boundaries across six dimensions (spec coverage, decomposer-readiness, codebase
  fit, verifiability/risk, boundary discipline, and a conditional security dimension engaged only when the plan
  touches sensitive surfaces), then returns a `Verdict: PASS | FAIL` plus an ordered fix list to the main
  session; it never edits the plan or calls `ExitPlanMode`; a self-mode plan (§0 `Implementation: self`) carries
  a closing instruction to run the sibling read-only fork `self-reviewer` before committing the plan's changes —
  scope is code-vs-plan only (touch list, decisions, test-strategy mapping, risks, migration; NOT spec fidelity,
  already judged pre-approval), reading `git status`/`git diff HEAD` against an assumed-clean starting tree and
  returning a two-way `Verdict: PASS | FAIL` plus a findings/fix list; this is a Layer-A soft gate only (no
  `PreToolUse` hook backstops it, unlike the `ExitPlanMode` plan gate); the interview entry point now lives in
  the no-prefix `superdev` skill above), the orchestrated implementation pipeline
  (`superbuild` → **mandatory first step** `superbuild-recipe` (derives the host toolchain once →
  `recipe.sh` + `profile.md`; owns the clean-tree guard; FAIL = hard halt) → `superbuild-adr` →
  `superbuild-decomposer` → per task **one `Workflow`** call to `task-pipeline.workflow.js` driving `coder` →
  `runner` → `task-reviewer` → `improver` → commit (the `commiter` agent runs
  `commit-task.sh` as the workflow's final stage, only on PASS) → `superbuild-reviewer` → `superbuild-docs`), the final-gate
  lenses `superbuild-reviewer` fans out in parallel via the Skill tool (`superbuild-reviewer-plan` Plan-alignment +
  the four code-quality lenses `superbuild-reviewer-quality` / `superbuild-reviewer-architecture` /
  `superbuild-reviewer-testing` / `superbuild-reviewer-readiness` + `superbuild-runner` Scope: full; the reviewer
  synthesizes one go/no-go verdict and writes `.superdev/.workflows/<slug>/final-review.md`, the superbuild first
  materializing the cumulative `plan.diff` patch the no-Bash quality lenses read); the **last** pipeline step
  `superbuild-docs` then reconciles the as-built docs layer (`.superdev/docs/` index + shards) incrementally
  against that same `plan.diff` and is committed by `commit-docs.sh` (config-gated `docs`, runs on any final
  verdict since the work is already committed, a mirror of the ADR step). Plus `tdd` / `debug` /
  `superspec` (with its `REVIEW: PASS`-gated quality fork `superspec-reviewer`, the spec-side mirror of
  `superplan-reviewer`: a read-only fork that checks the saved spec against the superspec hard rules and returns
  `REVIEW: PASS | FAIL`, never editing the spec or handing off). The four quality lenses share `shared/rubric-code-review.md` (the dimension-agnostic scope /
  false-positive / 3-bucket-severity rules, mirroring `superbuild/references/task-review.md` at whole-plan
  scope); each lens's per-dimension criteria live in its own `shared/references/lens-*.md` fragment, injected by
  `shared/scripts/auditor-contract.sh`. Separately,
  `shared/rubric.md` (superbuild-reviewer-plan) and `superbuild/references/task-review.md` (task-reviewer) no
  longer duplicate their four stable "How to …" sections — those live once in `shared/rubric-core.md`, read
  alongside each variant; the two variants carry only their own severity buckets + PASS/FAIL(/BLOCKED) mapping.
  The five
  per-task workers `coder` / `runner` / `task-reviewer` / `improver` / `commiter` are **plugin agents**
  (`skills/superbuild/agents/*.md`), not skills — dispatched by the workflow via `agentType:'superdev:<name>'`.

## Architecture invariants (superdev-specific)

Repo-wide invariants (self-documentation, "no `hooks` field in `plugin.json`", the general script-vs-fork
principle, the general one-manifest pattern) live in the root `CLAUDE.md`. The ones below are superdev's.

- **Injected manifest + plan gate.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superdev` dispatcher) **verbatim** once per session; `source == "resume"` is excluded by the
  matcher; fail-open (an unreadable manifest = banner only, no `additionalContext`). The hook does no
  per-project rendering. Planning happens in plan mode — entering plan mode before drafting a plan is driven by
  the `superplan` skill instruction (Layer-A), not a deterministic hook. The plan's approval is gated by a
  single `PreToolUse` hook: `review-plan.sh` (matcher `ExitPlanMode`) denies the plan's approval until
  `superplan-reviewer` returns `Verdict: PASS`. The `superplan` skill invokes `superplan-reviewer`
  **proactively** before `ExitPlanMode` (Layer-A soft gate), so in the happy path the gate simply allows — the
  deny is a backstop for a skipped review, not the normal trigger. This ExitPlanMode hook is the **single** gate
  in every mode, and `superbuild` trusts it — it does **not** re-review the plan. (Residual: a `PreToolUse` deny
  is only best-effort in the permission-relaxed modes `bypassPermissions`/`dontAsk`/`auto`, so in those modes
  the gate itself is best-effort.) Keep all paths in sync.
- **Opt-in switches (`.superdev/config.yml`).** Three booleans — `adr`, `rules_improver`, `docs` — all
  **default-disabled** (a missing file/key = `false`, fail-closed; a repo that never ran `/setup` skips these
  optional steps until it opts in), plus two integer retry keys — `retry_max_attempts`, `retry_escalation_attempts` — both
  **fail-open to `3`** (a missing file/key = `3`). `setup` writes the file (seeding it from a bundled asset);
  `superbuild` reads the config: it skips the `superbuild-adr` / `improver` / `superbuild-docs` steps
  when their switch is off — each skip is **one terse line, never a paragraph** — and forwards the two retry
  integers as the `task-pipeline.workflow.js` cap: `retry_max_attempts` becomes the `retryMaxAttempts` arg on
  the first `Workflow` invocation, and `retry_escalation_attempts` becomes a fresh `retryMaxAttempts` cap on the
  escalation Retry re-invocation. A sixth, non-boolean key, `rule_extensions:` (a
  list of source-type globs), is written **once** by `memory-rules` — in Mode A/B it discovers and **appends**
  `rule_extensions:` when the key is absent (never overwriting an existing one), creating the file if missing —
  and is **read** by `memory-rules` (all modes) and by the `improver` agent (as a fail-open `paths:`-scoping
  hint). Config readers are `superbuild` (reads the booleans + the retry integers), `setup` (writer),
  `memory-rules` (reader + one-time `rule_extensions` writer), and the `improver` agent (reader); the
  `SessionStart` hook does not read config (the manifest is injected verbatim, the same for every project).
- **File-based dispatch.** The superbuild dispatches by passing **file paths** (task file + path params
  like feedback/retry, reports); agents receive content **injected via dynamic context `!`**, not via `Read`.
  Pipeline state lives under `.superdev/.workflows/<slug>/`; agents reply with a 3-line `STATUS / Report / Summary`
  stdout.
- **Recipe — mandatory first step (fail-closed) + sole clean-tree guard.** `superbuild` invokes
  `superbuild-recipe` as the FIRST step on **every** entry (before ADR); it derives the host
  build/test/lint/launch verbs once and materializes `.superdev/.workflows/<slug>/recipe.sh` + `profile.md`, the
  single artifact every downstream fork (`superbuild-runner`, the `runner` agent, `coder`, `task-reviewer`,
  `superbuild-decomposer`, `superbuild-reviewer-plan`) consumes instead of re-deriving the
  toolchain. It is **fail-closed**: a recipe `STATUS: FAIL` is a hard halt (like a decomposer fail), and the
  recipe agent's Step 0 (`git status --porcelain`) is now the **single** clean-tree guard for the whole run —
  the superbuild's former ADR-step and pre-task-loop `git status` guards are gone. `recipePath` is threaded
  into every per-task `Workflow` invocation so each fork sources its verbs from the one artifact; the recipe
  self-skips regeneration when its own `recipe.sh verify` passes.
- **Script vs. fork (superdev examples).** A pipeline step collapses to a deterministic bundled script (under
  the owning skill's `scripts/` dir) when it operates on a known, fixed tool / format — git, a basename, paths,
  globs (e.g. `superbuild/scripts/commit-task.sh` for the per-task commit, `commit-adr.sh` for the ADR commit).
  It stays an LLM fork when it must interpret heterogeneous, stack-specific tool output (e.g. `superbuild-runner`
  reading arbitrary build / test output). A self-verifying script carries its I/O contract in its header comment
  and is trusted by its caller — so the caller does NOT re-verify or retry the script's result. A script may
  still be *invoked through* a thin fork without losing this property: `commit-task.sh` is run by the haiku
  `commiter` agent (so the commit lives inside the per-task `Workflow`, not the superbuild), but the agent only
  relays the script's tag verbatim — the self-verification stays in the script, so its caller (the workflow,
  then the dispatcher reading `wf_out.commit`) still trusts the result without re-checking. (The per-task commit
  twin is not yet separately backstopped — the same "not yet hardened" caveat as supergh's `commit` fork.)

## Soft cross-plugin chains

`superspec → supergh:create-issue` and `superbuild-reviewer → supergh:create-pr` are CSO-only compositions
that engage only when `supergh` is also installed; absent it they simply do not fire (no declared dependency).
