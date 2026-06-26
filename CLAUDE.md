# superdev + superui + supergh + superfix — four Claude Code plugins (one per subdir) + marketplace catalog

> **These are the plugins' SOURCE files, not the live plugins.** This repo is the source
> of the `superdev`, `superui`, `supergh`, and `superfix` plugins (the first three are *also installed* in this session). Editing files here (skills,
> manifests, hooks, the `plugin.json` of any plugin) does **NOT** change the behavior of the currently loaded
> plugins — the routing manifests and skill instructions active in this session were loaded at install/session
> start and stay frozen regardless of edits. Your changes take effect only after the **user publishes** them
> (commit + push to the marketplace source, then `/plugin update`). So: do not expect an edit to alter how skills
> route or behave in the current session, and do not "test" a change by trying to trigger the edited skill
> here — it will run the old, installed version.
>
> **Likewise, this repo's own `CLAUDE.md` and `.claude/rules/` are NOT plugin inputs.** They are dev-time
> orientation for editing the source (and conventions for working *in this repo*) — they never reach the
> skills, manifests, or hooks as runtime data. All four plugins are stack-agnostic and read host-project memory
> from the **consuming** repo's `CLAUDE.md` + `.claude/rules/` only when they run there, and every host has
> different ones. So when reasoning about how any skill / manifest / hook behaves, do NOT factor in this
> repo's `CLAUDE.md` or rules as though they shaped that behavior — they don't ship, they don't travel, and
> the plugins will execute against entirely different memory files elsewhere. Treat them strictly as guidance
> for working on the source, never as a runtime signal the plugins consume.

## What this repo is

**Four self-contained Claude Code plugins, each in its own subdirectory — `superdev/`, `superui/`, `supergh/`, and `superfix/`.** The
repo root carries a four-entry **marketplace catalog** (`.claude-plugin/marketplace.json`) that co-lists them
by subdir `source` (`"./superdev"`, `"./superui"`, `"./supergh"`, `"./superfix"`), so the repo is the catalog that ships all four.
Each plugin is independently installable; none declares another as a dependency. End-user help lives in
`README.md`; this file is orientation for the assistant.

- **superdev** — project memory, planning, and the agentic-development pipeline.
- **superui** — the design / frontend ecosystem (the framework-agnostic L1 system, target adaptation, web
  preview, the UI-edit guardian, and a shareable-artifact publisher).
- **supergh** — the GitHub / git ecosystem (the `gh` CLI/REST/GraphQL reference, a fully-specified operation
  executor, Conventional-Commits commits, and template-driven issue / PR creation).
- **superfix** — prioritized multi-agent codebase investigation (one user-invoked skill, no hooks/manifest):
  the `audit` skill sweeps a repo, scores Impact × Opportunity, and dispatches `scout` (cheap triage) /
  `detective` (deep) plugin agents.

They ship no application code — the artefacts are markdown (skills) + JSON (manifests) + the per-plugin hook
scripts under `<plugin>/hooks/scripts/`, plus a handful of deterministic helper scripts bundled under
individual skills' `scripts/` dirs (the `superui` preview scripts, the superdev pipeline commit scripts
`orchestrator/scripts/commit-task.sh` + `orchestrator/scripts/commit-adr.sh`, the fixed recipe harness
`agent-recipe/scripts/recipe.template.sh`, the `supergh` `commit` mode router
`commit/scripts/route.sh`, the `memory-rules` mode router `memory-rules/scripts/route.sh` + its discovery
scripts `memory-rules/scripts/scan_extensions.sh` (+ `detect_state.sh`, `scan_conventions.sh`), the one-time `setup/scripts/bootstrap.sh`,
and the `superfix` investigation scripts `audit/scripts/collect_signals.sh` (deterministic signal sweep) + `rank.py` (the gate/rank step)).
Three helpers instead live at **plugin-level** `<plugin>/shared/scripts/` (one copy shared across a plugin's
skills): `superdev/shared/scripts/lib_find_excludes.sh` (sourced by the `memory-layers` / `memory-rules` scan scripts),
`superdev/shared/scripts/inject_review_input.sh` (`!`-injected by the `superplan-reviewer-integrity` / `superplan-reviewer-codebase`
lens reviewers to splice the plan text + any re-review fixes from the passed path, so neither fork re-reads the plan or parses `$ARGUMENTS`),
and `superui/shared/scripts/check_python.sh` (the Python preflight, `!`-injected by each `superui` skill that runs a Python step).
**Editing markdown / JSON IS shipping** — there is no build / test /
lint at any level. Contracts between files are enforced by humans reading carefully.

All four plugins are **stack-agnostic on purpose**: skills read project-specific knowledge (test framework, build
tool, naming, how to launch the app) from the **host** project's `CLAUDE.md` + `.claude/rules/`, never from
the plugin sources. Do not bake ecosystem assumptions (dotnet, npm, pytest…) into skill prompts.

DO NOT USE ADR capture for this project. The plugins are constantly refactored.

## Why four plugins

Each plugin keeps its domain's skills together so a consumer can install just the development ecosystem
(`superdev`), just the design ecosystem (`superui`), just the GitHub ecosystem (`supergh`), or just the
codebase-investigation tool (`superfix`). Within a plugin, skills compose through CSO (frontmatter
`description:`) and — for the three manifest-bearing plugins — that plugin's single injected manifest documents
the in-plugin chains (e.g. `improver → memory-rules` in superdev); `superfix` ships no manifest because its
sole skill is user-only (see its section below). Each is
**self-contained**: its `plugin.json` declares **no `dependencies`** — installing it gives that whole
ecosystem. Cross-plugin chains are **soft and optional**: superdev's `spec-writer → supergh:create-issue` and
`agent-final-reviewer → supergh:create-pr` are CSO compositions that fire only when `supergh` is also
installed; absent it they simply do not engage (no declared dependency, graceful degradation).

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog — co-lists superdev "./superdev", superui "./superui", supergh "./supergh", superfix "./superfix"
superdev/            The superdev plugin
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  hooks/             One injected dispatcher manifest + the two hook scripts
    hooks.json       SessionStart (inject manifest) + PreToolUse: ExitPlanMode (plan-review gate)
    content/manifest.md  The injected `using-superdev` dispatcher
    scripts/         session-start.sh, review-plan.sh
  shared/            Plugin-level shared assets + scripts (rubric.md; coder-modes/ work-order files; scripts/lib_find_excludes.sh — sourced by the memory-layers / memory-rules scans; scripts/inject_review_input.sh — `!`-injected by the superplan-reviewer lens skills to splice plan text + re-review fixes)
  skills/            Skills (bare-named by functional role; `agent-` marks fork-only workers); some skills bundle a
                     deterministic helper under their own scripts/ dir (orchestrator/scripts/commit-task.sh
                     + commit-adr.sh + task-pipeline.workflow.js, agent-recipe/scripts/recipe.template.sh,
                     memory-rules/scripts/route.sh, setup/scripts/bootstrap.sh);
                     orchestrator also bundles the 4 per-task pipeline plugin agents under its agents/ subdir
                     (coder.md, task-reviewer.md, improver.md, commiter.md), plus a bundled
                     reference asset agents/rubric-task-review.md (task-reviewer's own task-review rubric —
                     a reference file, NOT a registered agent)
superui/             The superui plugin
  .claude-plugin/plugin.json   The plugin manifest — skills[] is the catalog of record
  hooks/             One injected dispatcher manifest + SessionStart only (no plan gate)
    content/manifest.md  The injected `using-superui` dispatcher
  shared/            Plugin-level shared scripts (scripts/check_python.sh — the Python preflight)
  skills/            Flat-named skills (single-domain plugin); some bundle preview scripts
supergh/             The supergh plugin
  .claude-plugin/plugin.json   The plugin manifest — skills[] is the catalog of record
  hooks/             One injected dispatcher manifest + SessionStart only (no plan gate)
    content/manifest.md  The injected `using-supergh` dispatcher
    scripts/         session-start.sh
  skills/            Flat-named skills (cli, cli-executor, commit, agent-committer, create-issue, create-pr);
                     the commit skill bundles scripts/route.sh (mode router)
superfix/            The superfix plugin (NO hooks, NO manifest — single user-only skill)
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  skills/            One user-invoked skill audit/ (disable-model-invocation); bundles
                     references/ (jobs.md, scoring.md, synthesis.md) + scripts/ (collect_signals.sh, rank.py)
  agents/            Two plugin agents: scout.md (cheap haiku triage) + detective.md (frontier opus deep-dive)
README.md            User-facing help (install + how it works)
.github/             CI: scripts/release.sh + workflows/ (auto-version.yml, release-version.yml)
.claude/rules/       Development-only conventions for this repo
```

Versioning is tag-driven and shared across all four plugins (one version namespace). CI keeps **all four**
`plugin.json` `version` fields (`superdev/`, `superui/`, `supergh/`, `superfix/`) in sync with the highest `MAJOR.MINOR.PATCH`
git tag (no `v` prefix, seed `0.1.0`): `.github/workflows/auto-version.yml` patch-bumps on every push to
`main`, and `.github/workflows/release-version.yml` is a manual `workflow_dispatch` that bumps a chosen
part (major/minor/patch). The shared `.github/scripts/release.sh` computes the next version from the tags,
writes it into all four manifests, commits the bump (`chore(bump): …`, no `[skip ci]`), pushes the commit + tag,
and then publishes a **GitHub Release** whose notes are built from the commits since the previous tag (grouped
by conventional type) with GitHub's auto-generated notes appended. The bump commit carries no `[skip ci]`
token; the loop is instead broken by an `auto-version.yml` job guard
(`if: !startsWith(github.event.head_commit.message, 'chore(bump)')`) — keep that `chore(bump)` prefix in sync
with the script. The tag is the source of truth; each `plugin.json.version` is derived. Because each
`plugin.json` carries a `version`, `/plugin update` ships a new version on each bump.

## superdev skill taxonomy (functional roles, not name prefixes)

The roles below are **superdev's** — its skills are now bare-named (the `dev-`/`mem-`/`doc-` group prefixes are
gone), save the `agent-` fork-only marker; the functional roles below are how they group. `superui`'s
flat-named skills (single-domain plugin; `cc-artifact` is the distinct Claude-Code-platform publisher) and `supergh`'s flat-named skills live in those plugins and are documented in their own
`<plugin>/hooks/content/manifest.md` + `README.md` (see also the **supergh plugin** section below). For each
plugin, the **per-skill** catalog of record is its own `<plugin>/.claude-plugin/plugin.json` `skills[]`; the
injected manifest (`<plugin>/hooks/content/manifest.md`) documents that plugin's groups/roles + cross-skill
chains, not individual skills.

**Naming sub-convention (`agent-` prefix).** The `agent-` prefix marks a forked, fork-only **skill** worker —
invoked **only by a superordinate skill via the `Skill` tool** (never the user, never auto-routed):
`agent-recipe`, `agent-adr-recorder`, `agent-decomposer`, `agent-runner`, `agent-final-reviewer`,
`agent-plan-auditor`, `agent-code-quality-auditor`, `agent-architecture-auditor`, `agent-testing-auditor`,
`agent-production-readiness-auditor`. These stay **skills** (not `agents/<name>.md` definitions); the prefix is
taxonomy only — it signals their agent-like, fork-only nature, and their frontmatter already encodes it
(`context: fork` + `user-invocable: false` + a one-line "pipeline-bound; invoked only by …" guard
`description`). The four per-task pipeline workers do NOT take the prefix: `coder`, `task-reviewer`, `improver`,
`commiter` are real **plugin agents** (`superdev/skills/orchestrator/agents/*.md`, listed in `plugin.json`
`agents[]`, dispatched by the `task-pipeline.workflow.js` via `agentType:'superdev:<name>'`) — bare-named
precisely because they are genuine agents, not fork-skills. (`commiter` is a thin haiku passthrough — it only
runs `commit-task.sh` and relays its tag — but it is still a workflow-dispatched plugin agent, so it stays
bare-named like the other three.) The **inline dispatcher** that drives the pipeline (`orchestrator`) and every
user-facing / auto-routed skill are bare-named too; so are forks still reachable from the main session
(`superplan-reviewer`).

- **Entry & environment** — two top-level skills:
  - `superdev`: the always-on **entry skill** (the renamed former `dev-interview`), named after the plugin
    itself because it is the heart of the ecosystem — every session's creative work starts here. It interviews
    the user to map the design tree before any plan/code, then hands off silently to `superplan`. It is
    model-invocable and is the skill the manifest's decision flow forces first (step 1), unlike `setup`.
  - `setup`: one-time, user-only environment bootstrap (`/setup`). Seeds `.temp/` + `.superdev/`,
  copies the bundled `.gitignore` / `.claude/settings.json` templates, and **seeds `.superdev/config.yml` from a
  bundled asset** (`setup/scripts/bootstrap.sh` copies `assets/config.yml`, both switches `true`, never
  overwriting an existing one), then **interactively asks the 2 opt-in switches** and `Edit`s the freshly-seeded
  file to flip the unselected ones off. Runs in the **main session** (not a fork) so it can prompt via
  `AskUserQuestion`. It is `disable-model-invocation` (Claude never auto-routes to it) so it is **deliberately
  absent from the manifest** — see the Self-documentation invariant.
- **Project memory (agent-facing)** (2 skills): `memory-layers` (CLAUDE.md cascade), `memory-rules`
  (`.claude/rules/` layer).

  **Memory layer division.** Agent-facing project knowledge splits current truth across four non-overlapping
  layers, picked by *kind of truth* — all four face the **agent**: (1) the general-rules
  manifest (superdev's `hooks/content/manifest.md`, force-injected per session);
  (2) the `CLAUDE.md` cascade (terse agent orientation; `memory-layers`); (3) `.claude/rules/*` (path-scoped
  conventions; `memory-rules`, which has **4 modes** — A uninitialized bootstrap, B initialized gap-fill, C
  improver-driven authoring (fork), D user-driven authoring (main context; user dictates a rule to append); in-pipeline
  the `improver` agent judges value, `memory-rules` (Mode C) authors);
  (4) `.superdev/adr/` (architectural *why*; written in-pipeline by `agent-adr-recorder`). In the dev
  pipeline, `agent-adr-recorder` records any architectural decision into layer 4 before decompose
  (config-gated `adr`), and the `improver` agent promotes each task's review learnings into layer 3
  (`.claude/rules/`) — judging which learnings are worth keeping and delegating the authoring to `memory-rules`
  Mode C, the in-pipeline writer into `.claude/rules/` — a config-gated step (`rules_improver`).
  The product's **end-user** help documentation is a distinct, non-agent layer owned by the end-user
  documentation role below (NOT agent memory).
- **End-user documentation** (1 skill): `help-writer` (the end-user product-help layer → `.superdev/help/`).
  Authors the human-facing help that ships to the people who use the built app — distinct
  from the agent-facing memory layers above; faces the end user, not Claude.
- **Agentic-development pipeline + diagnostics/specs** (18 skills + 4 plugin agents): planning
  (`superplan`, `superplan-reviewer` plus its two fork-only lens sub-skills
  `superplan-reviewer-{integrity,codebase}`
  — invoked only by `superplan-reviewer` via the Skill tool; each receives the plan path as `$ARGUMENTS`,
  optionally followed by ` ||| <prior Consolidated fixes, single-line>` on a re-review (first-run = bare path);
  `-codebase` folds in the security activation gate and a no-runnable relaxation (driven by the plan's §9 DoD);
  the interview entry point now lives in the no-prefix `superdev`
  skill above), the orchestrated implementation pipeline
  (`orchestrator` → **mandatory first step** `agent-recipe` (derives the host toolchain once →
  `recipe.sh` + `profile.md`; owns the clean-tree guard; FAIL = hard halt) → `agent-adr-recorder` →
  `agent-decomposer` → per task **one `Workflow`** call to `task-pipeline.workflow.js` driving `coder` →
  `agent-runner` → `task-reviewer` → `improver` → commit (the `commiter` agent runs
  `commit-task.sh` as the workflow's final stage, only on PASS) → `agent-final-reviewer`), the final-gate
  lenses `agent-final-reviewer` fans out in parallel via the Skill tool (`agent-plan-auditor` Plan-alignment +
  the four code-quality lenses `agent-code-quality-auditor` / `agent-architecture-auditor` /
  `agent-testing-auditor` / `agent-production-readiness-auditor` + `agent-runner` Scope: full; the reviewer
  synthesizes one go/no-go verdict and writes `.temp/.workflows/<slug>/final-review.md`, the orchestrator first
  materializing the cumulative `plan.diff` patch the no-Bash quality lenses read), plus `tdd` / `debug` /
  `spec-writer`. The four quality lenses share `shared/rubric-code-review.md` (mirrors the 5-dimension +
  3-bucket-severity content of `orchestrator/agents/rubric-task-review.md` at whole-plan scope). The four
  per-task workers `coder` / `task-reviewer` / `improver` / `commiter` are **plugin agents**
  (`superdev/skills/orchestrator/agents/*.md`), not skills — dispatched by the workflow via `agentType:'superdev:<name>'`.

## supergh plugin (GitHub / git — flat-named skills)

`supergh` is a single-domain plugin, so its skills carry **no group prefix** (the plugin name is the group).
Six skills, qualified as `supergh:<name>`:

- `cli` — GitHub CLI **reference** (which layer — `gh` subcommand / `gh api` REST / `gh api graphql` — a given
  operation needs); reference-only, never executes.
- `cli-executor` — **fork** (reachable from the main session and from consumer skills) that runs ONE
  fully-specified gh/REST/GraphQL operation out of context and returns a single tagged line; guards every
  GraphQL mutation against the silent-200 error case.
- `commit` (entry, main context) + `agent-committer` (its **fork**) — `commit` resolves WHAT to commit
  (session / `all` / `staged`, via its `scripts/route.sh` mode router) and delegates staging + Conventional-Commits
  authoring to `agent-committer`, which reads the staged diff out of the main context. `agent-committer` is
  fork-only (`context: fork` + `user-invocable: false`), invoked only by `commit`.
- `create-issue` / `create-pr` — interactive, template-driven creators (`gh issue create` / `gh pr create
  --draft`); each MAY delegate a fully-specified API call to `cli-executor`.

Fork-only discipline carries through the rename: `agent-committer` (invoked only by `commit`) keeps the
`agent-` lead token as its fork-only signal, while `cli-executor` is a fork still reachable from the main
session. Soft cross-plugin chains into superdev: `superdev:spec-writer → supergh:create-issue`,
`superdev:agent-final-reviewer → supergh:create-pr` (CSO only, engage only when both plugins installed).

## superfix plugin (codebase investigation — no hooks, no manifest)

`superfix` is the only plugin with **no `hooks/` and no injected manifest**. Its single skill `audit`
is `disable-model-invocation: true` (user-only, invoked solely via `/superfix:audit`), so there is
nothing to auto-route — a dispatcher manifest would be dead weight, and the manifest is what the `SessionStart`
hook injects, so dropping the manifest drops the hook too. This is the plugin-scale analogue of superdev's
`setup`: a user-only command that is deliberately outside any routing manifest (see the Self-documentation
invariant exception). Components, qualified `superfix:<name>`:

- `audit` (skill, main context, user-only) — prioritized multi-agent codebase investigation on the
  `score = Impact × Opportunity` law: a deterministic sweep (`scripts/collect_signals.sh`) → cheap `scout`
  scoring fan-out → deterministic gate/rank (`scripts/rank.py`) → frontier `detective` dispatch into the
  hotspots only → verified, severity-ranked synthesis. State lives under a `.io/<run-id>/` workspace, not the
  main context. Bundles `references/{jobs,scoring,synthesis}.md`.
- `scout` / `detective` — the two **plugin agents** (`superfix/agents/*.md`, listed in `plugin.json`
  `agents[]`, dispatched via the Task tool with `subagent_type: superfix:<name>`). `scout` is cheap-tier
  breadth-first triage (spawn many); `detective` is frontier-tier depth-first investigation (spawn few).
  Bare-named because they are genuine agents, not fork-skills.

`superfix` declares no cross-plugin chains.

## Architecture invariants

- **One injected manifest (per manifest-bearing plugin).** A single `SessionStart` hook force-injects
  `hooks/content/manifest.md` (the `using-superdev` dispatcher) **verbatim** once per session; `source == "resume"`
  is excluded by the matcher; fail-open (an unreadable manifest = banner only, no `additionalContext`). The hook
  does no per-project rendering — the manifest is injected as-is, identically for every project. This holds for
  `superdev` / `superui` / `supergh`; **`superfix` is the exception** — it ships no `hooks/` and no manifest at
  all, because its sole skill is user-only (`disable-model-invocation`) with nothing to auto-route.
- **Opt-in switches (`.superdev/config.yml`).** Two booleans — `adr`, `rules_improver` — both
  **default-disabled** (a missing file/key = `false`, fail-closed; a repo that never ran `/setup` skips both
  optional steps until it opts in), plus two integer retry keys — `retry_max_attempts`, `retry_escalation_attempts` — both
  **fail-open to `3`** (a missing file/key = `3`). `setup` writes the file (seeding it from a bundled asset —
  see below); `orchestrator` reads the config: it skips the `agent-adr-recorder` / `improver` steps
  when their switch is off — each skip is **one terse line, never a paragraph** — and forwards the two retry
  integers as the `task-pipeline.workflow.js` cap: `retry_max_attempts` becomes the `retryMaxAttempts` arg on
  the first `Workflow` invocation, and `retry_escalation_attempts` becomes a fresh `retryMaxAttempts` cap on the
  escalation Retry re-invocation. A fifth, non-boolean key, `rule_extensions:` (a
  list of source-type globs), is written **once** by `memory-rules` — in Mode A/B it discovers and **appends**
  `rule_extensions:` when the key is absent (never overwriting an existing one), creating the file if missing —
  and is **read** by `memory-rules` (all modes) and by the `improver` agent (as a fail-open `paths:`-scoping
  hint). Config readers are `orchestrator` (reads the booleans + the retry integers), `setup` (writer),
  `memory-rules` (reader + one-time `rule_extensions` writer), and the `improver` agent (reader); the
  `SessionStart` hook does not read config (the manifest is injected verbatim, the same for every project).
- **Plan gate.** Planning happens in plan mode — entering plan mode before drafting a plan is driven by the
  `superplan` skill instruction (Layer-A), not a deterministic hook. The plan's approval is gated by a
  single `PreToolUse` hook: `review-plan.sh` (matcher `ExitPlanMode`) denies the plan's approval until
  `superplan-reviewer` returns `Overall Verdict: PASS`. This ExitPlanMode hook is the **single** gate in every mode,
  and `orchestrator` trusts it — it does **not** re-review the plan. (Residual: a `PreToolUse` deny is only
  best-effort in the permission-relaxed modes `bypassPermissions`/`dontAsk`/`auto`, so in those modes the gate
  itself is best-effort.) Keep all paths in sync.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that path; adding a
  `hooks` field to `plugin.json` is a hard install error.
- **File-based dispatch.** The orchestrator dispatches by passing **file paths** (task file + path params
  like feedback/retry, reports); agents receive content **injected via dynamic context `!`**, not via `Read`.
  Pipeline state lives under `.temp/.workflows/<slug>/`; agents reply with a 3-line `STATUS / Report / Summary`
  stdout.
- **Recipe — mandatory first step (fail-closed) + sole clean-tree guard.** `orchestrator` invokes
  `agent-recipe` as the FIRST step on **every** entry (before ADR); it derives the host
  build/test/lint/launch verbs once and materializes `.temp/.workflows/<slug>/recipe.sh` + `profile.md`, the
  single artifact every downstream fork (`agent-runner`, `coder`, `task-reviewer`,
  `agent-decomposer`, `agent-plan-auditor`) consumes instead of re-deriving the
  toolchain. It is **fail-closed**: a recipe `STATUS: FAIL` is a hard halt (like a decomposer fail), and the
  recipe agent's Step 0 (`git status --porcelain`) is now the **single** clean-tree guard for the whole run —
  the orchestrator's former ADR-step and pre-task-loop `git status` guards are gone. `recipePath` is threaded
  into every per-task `Workflow` invocation so each fork sources its verbs from the one artifact; the recipe
  self-skips regeneration when its own `recipe.sh verify` passes.
- **Script vs. fork.** A pipeline step collapses to a deterministic bundled script (under the owning skill's
  `scripts/` dir) when it operates on a known, fixed tool / format — git, a basename, paths, globs (e.g.
  `orchestrator/scripts/commit-task.sh` for the per-task commit, `commit-adr.sh` for the ADR commit). It stays an LLM fork when it must interpret heterogeneous, stack-specific tool
  output (e.g. `agent-runner` reading arbitrary build / test output). A self-verifying script carries its I/O
  contract in its header comment and is trusted by its caller — so the caller does NOT re-verify or retry the
  script's result (the verify-before-claim guarantee lives in the script, not a fork-era re-check guard).
  A script may still be *invoked through* a thin fork without losing this property: `commit-task.sh` is run by
  the haiku `commiter` agent (so the commit lives inside the per-task `Workflow`, not the orchestrator), but
  the agent only relays the script's tag verbatim — the self-verification stays in the script, so its caller
  (the workflow, then the dispatcher reading `wf_out.commit`) still trusts the result without re-checking.
- **Self-documentation.** Any skill add / remove / rename MUST update the **owning plugin's**
  `<plugin>/.claude-plugin/plugin.json` `skills[]` (superdev's for any of its skills, superui's
  for any of its skills, supergh's for a `cli`/`cli-executor`/`commit`/`agent-committer`/`create-issue`/`create-pr` skill,
  superfix's for the `audit` skill);
  any **agent** add / remove / rename MUST likewise update that plugin's `agents[]`
  (superdev's `coder` / `task-reviewer` / `improver` / `commiter` and superfix's `scout` / `detective` live there, not in `skills[]`) — and this file
  in either case. They must stay in sync, and a worker must never appear in both `skills[]` and `agents[]`.
  Each plugin's injected manifest (`<plugin>/hooks/content/manifest.md`) lists that plugin's
  **groups/roles + chains**, not individual skills, so update it only when a change adds/removes a group, shifts a
  group's scope, or alters a documented chain or config-gated area — not for every per-skill change.
  **Exception:** a user-only one-time command (`disable-model-invocation: true`, e.g. `setup`) does not
  participate in routing and stays out of the manifest entirely — do not "fix" that gap.

## Where contracts live

This file is orientation only. The authoritative contract of each skill is its own body (`# Input contract` /
`# Output format`); hook contracts live in `hooks/hooks.json` and the header comments of `hooks/scripts/*.sh`.

## When editing

- **Catalog / install layer** (`.claude-plugin/marketplace.json`, root `README.md`): keep changes minimal and
  structural. The marketplace co-lists exactly four plugins by subdir `source` (`"./superdev"`, `"./superui"`,
  `"./supergh"`, `"./superfix"`); renaming a plugin must update the marketplace manifest, that plugin's
  `<plugin>/.claude-plugin/plugin.json`, and the root `README.md`.
- **Plugin internals** (`<plugin>/.claude-plugin/plugin.json`, `<plugin>/hooks/`, `<plugin>/skills/`): obey the
  architecture invariants above. Paths in each `plugin.json` are plugin-root-relative (`./skills/…`); hook
  commands use `${CLAUDE_PLUGIN_ROOT}` (that plugin's install dir, i.e. its `superdev/`, `superui/`, `supergh/`, or `superfix/` subdir).

# Assistant Conventions

## Environment
- Shell is bash on Windows; do NOT use PowerShell syntax in Bash tool calls.
