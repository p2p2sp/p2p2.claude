# superdev + superui — two Claude Code plugins (one per subdir) + marketplace catalog

> **These are the plugins' SOURCE files, not the live plugins.** This repo is the source
> of the `superdev` and `superui` plugins that are *also installed* in this session. Editing files here (skills,
> manifests, hooks, the `plugin.json` of either plugin) does **NOT** change the behavior of the currently loaded
> plugins — the routing manifests and skill instructions active in this session were loaded at install/session
> start and stay frozen regardless of edits. Your changes take effect only after the **user publishes** them
> (commit + push to the marketplace source, then `/plugin update`). So: do not expect an edit to alter how skills
> route or behave in the current session, and do not "test" a change by trying to trigger the edited skill
> here — it will run the old, installed version.
>
> **Likewise, this repo's own `CLAUDE.md` and `.claude/rules/` are NOT plugin inputs.** They are dev-time
> orientation for editing the source (and conventions for working *in this repo*) — they never reach the
> skills, manifests, or hooks as runtime data. Both plugins are stack-agnostic and read host-project memory
> from the **consuming** repo's `CLAUDE.md` + `.claude/rules/` only when they run there, and every host has
> different ones. So when reasoning about how any skill / manifest / hook behaves, do NOT factor in this
> repo's `CLAUDE.md` or rules as though they shaped that behavior — they don't ship, they don't travel, and
> the plugins will execute against entirely different memory files elsewhere. Treat them strictly as guidance
> for working on the source, never as a runtime signal the plugins consume.

## What this repo is

**Two self-contained Claude Code plugins, each in its own subdirectory — `superdev/` and `superui/`.** The
repo root carries a two-entry **marketplace catalog** (`.claude-plugin/marketplace.json`) that co-lists them
by subdir `source` (`"./superdev"` and `"./superui"`), so the repo is the catalog that ships both plugins.
Each plugin is independently installable; neither declares the other as a dependency. End-user help lives in
`README.md`; this file is orientation for the assistant.

- **superdev** — project memory, planning, the agentic-development pipeline, and GitHub skills.
- **superui** — the design / frontend ecosystem (the framework-agnostic L1 system, target adaptation, web
  preview, the UI-edit guardian, and a shareable-artifact publisher).

They ship no application code — the artefacts are markdown (skills) + JSON (manifests) + the per-plugin hook
scripts under `<plugin>/hooks/scripts/`, plus a handful of deterministic helper scripts bundled under
individual skills' `scripts/` dirs (the `superui` `ui-*` preview scripts, the superdev pipeline commit scripts
`dev-orchestrator/scripts/commit-task.sh` + `dev-orchestrator/scripts/commit-adr.sh`, the fixed recipe harness
`dev-agent-recipe/scripts/recipe.template.sh`, the `gh-commit` mode router
`gh-commit/scripts/route.sh`, the `mem-rules` mode router `mem-rules/scripts/route.sh` + its discovery
scripts `mem-rules/scripts/scan_extensions.sh` (+ `detect_state.sh`, `scan_conventions.sh`), and the one-time `setup/scripts/bootstrap.sh`).
**Editing markdown / JSON IS shipping** — there is no build / test /
lint at any level. Contracts between files are enforced by humans reading carefully.

Both plugins are **stack-agnostic on purpose**: skills read project-specific knowledge (test framework, build
tool, naming, how to launch the app) from the **host** project's `CLAUDE.md` + `.claude/rules/`, never from
the plugin sources. Do not bake ecosystem assumptions (dotnet, npm, pytest…) into skill prompts.

DO NOT USE ADR capture for this project. The plugins are constantly refactored.

## Why two plugins

Each plugin keeps its domain's skills together so a consumer can install just the development ecosystem
(`superdev`) **or** just the design ecosystem (`superui`). Within a plugin, skills compose through CSO
(frontmatter `description:`) and that plugin's single injected manifest documents the chains
(`dev-spec → gh-issue`, `dev-agent-final-reviewer → gh-pr`, `dev-improver → mem-rules` in superdev). Each is
**self-contained**: its `plugin.json` declares **no `dependencies`** — installing it gives that whole
ecosystem.

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog — co-lists superdev by source "./superdev" and superui by "./superui"
superdev/            The superdev plugin
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  hooks/             One injected dispatcher manifest + the three hook scripts
    hooks.json       SessionStart (inject manifest) + PreToolUse: ExitPlanMode (plan-review gate) + Write|Edit (plan-mode guard)
    content/manifest.md  The injected `using-superdev` dispatcher
    scripts/         session-start.sh, review-plan.sh, require-plan-mode.sh
  agents/            The 4 per-task pipeline plugin agents (dev-coder.md, dev-task-reviewer.md, dev-improver.md, dev-commiter.md)
  shared/            Bundled assets shared across the pipeline (rubric.md; coder-modes/ work-order files)
  skills/            Skills grouped by prefix (mem- / doc- / dev- / gh-); some skills bundle a
                     deterministic helper under their own scripts/ dir (dev-orchestrator/scripts/commit-task.sh
                     + commit-adr.sh + task-pipeline.workflow.js, dev-agent-recipe/scripts/recipe.template.sh,
                     gh-commit/scripts/route.sh, mem-rules/scripts/route.sh, setup/scripts/bootstrap.sh)
superui/             The superui plugin
  .claude-plugin/plugin.json   The plugin manifest — skills[] is the catalog of record
  hooks/             One injected dispatcher manifest + SessionStart only (no plan gate)
    content/manifest.md  The injected `using-superui` dispatcher
  skills/            Skills grouped by prefix (ui- / cc-); the ui-* skills bundle preview scripts
README.md            User-facing help (install + how it works)
.github/             CI: scripts/release.sh + workflows/ (auto-version.yml, release-version.yml)
.claude/rules/       Development-only conventions for this repo
```

Versioning is tag-driven and shared across both plugins (one version namespace). CI keeps **both**
`plugin.json` `version` fields (`superdev/` and `superui/`) in sync with the highest `MAJOR.MINOR.PATCH`
git tag (no `v` prefix, seed `0.1.0`): `.github/workflows/auto-version.yml` patch-bumps on every push to
`main`, and `.github/workflows/release-version.yml` is a manual `workflow_dispatch` that bumps a chosen
part (major/minor/patch). The shared `.github/scripts/release.sh` computes the next version from the tags,
writes it into both manifests, commits the bump (`chore(bump): …`, no `[skip ci]`), pushes the commit + tag,
and then publishes a **GitHub Release** whose notes are built from the commits since the previous tag (grouped
by conventional type) with GitHub's auto-generated notes appended. The bump commit carries no `[skip ci]`
token; the loop is instead broken by an `auto-version.yml` job guard
(`if: !startsWith(github.event.head_commit.message, 'chore(bump)')`) — keep that `chore(bump)` prefix in sync
with the script. The tag is the source of truth; each `plugin.json.version` is derived. Because each
`plugin.json` carries a `version`, `/plugin update` ships a new version on each bump.

## superdev skill taxonomy (prefix = functional group)

The groups below are **superdev's**. `superui`'s `ui-` / `cc-` groups live in that plugin and are documented
in `superui/hooks/content/manifest.md` + `README.md`. For each plugin, the **per-skill** catalog of record is
its own `<plugin>/.claude-plugin/plugin.json` `skills[]`; the injected manifest
(`<plugin>/hooks/content/manifest.md`) documents that plugin's prefix **groups + cross-skill chains**, not
individual skills.

**Naming sub-convention (`-agent-` infix).** The `-agent-` infix marks a forked, fork-only **skill** worker —
invoked **only by a superordinate skill via the `Skill` tool** (never the user, never auto-routed): `dev-agent-*`
(the remaining pipeline skill-workers — `dev-agent-recipe`, `dev-agent-adr-recorder`, `dev-agent-decomposer`,
`dev-agent-runner`, `dev-agent-final-reviewer`, `dev-agent-plan-auditor`, `dev-agent-smoke`) and
`gh-agent-committer`. These stay
**skills** (not `agents/<name>.md` definitions); the infix is taxonomy only — it signals their agent-like,
fork-only nature, and their frontmatter already encodes it (`context: fork` + `user-invocable: false` + a
one-line "pipeline-bound; invoked only by …" guard `description`). The four per-task pipeline workers are NOT
in this group: `dev-coder`, `dev-task-reviewer`, `dev-improver`, `dev-commiter` are real **plugin agents**
(`superdev/agents/*.md`, listed in `plugin.json` `agents[]`, dispatched by the `task-pipeline.workflow.js` via
`agentType:'superdev:dev-*'`) — named without the infix precisely because they are genuine agents, not
fork-skills. (`dev-commiter` is a thin haiku passthrough — it only runs `commit-task.sh` and relays its tag —
but it is still a workflow-dispatched plugin agent, so it follows the no-infix rule like the other three.) The **inline dispatchers**
that drive the pipeline (`dev-orchestrator`, `gh-commit`) and every user-facing / auto-routed skill keep a
plain prefix; so do forks still reachable from the main session (`dev-plan-reviewer`, `gh-cli-executor`).

- **(no prefix)** — `setup`: one-time, user-only environment bootstrap (`/setup`). Seeds `.temp/` + `.superdev/`,
  copies the bundled `.gitignore` / `.claude/settings.json` templates, and **seeds `.superdev/config.yml` from a
  bundled asset** (`setup/scripts/bootstrap.sh` copies `assets/config.yml`, both switches `true`, never
  overwriting an existing one), then **interactively asks the 2 opt-in switches** and `Edit`s the freshly-seeded
  file to flip the unselected ones off. Runs in the **main session** (not a fork) so it can prompt via
  `AskUserQuestion`. It is `disable-model-invocation` (Claude never auto-routes to it) so it is **deliberately
  absent from the manifest** — see the Self-documentation invariant.
- **`mem-`** — project memory (agent-facing) (2 skills): `mem-layers` (CLAUDE.md cascade), `mem-rules`
  (`.claude/rules/` layer).

  **Memory layer division.** Agent-facing project knowledge splits current truth across four non-overlapping
  layers, picked by *kind of truth* — all four face the **agent**: (1) the general-rules
  manifest (superdev's `hooks/content/manifest.md`, force-injected per session);
  (2) the `CLAUDE.md` cascade (terse agent orientation; `mem-layers`); (3) `.claude/rules/*` (path-scoped
  conventions; `mem-rules`, which has **3 modes** — A uninitialized bootstrap, B initialized gap-fill, C
  improver-driven authoring; in-pipeline the `dev-improver` agent judges value, `mem-rules` (Mode C) authors);
  (4) `.superdev/adr/` (architectural *why*; written in-pipeline by `dev-agent-adr-recorder`). In the dev
  pipeline, `dev-agent-adr-recorder` records any architectural decision into layer 4 before decompose
  (config-gated `adr`), and the `dev-improver` agent promotes each task's review learnings into layer 3
  (`.claude/rules/`) — judging which learnings are worth keeping and delegating the authoring to `mem-rules`
  Mode C, the sole writer of `.claude/rules/` — a config-gated step (`rules_improver`).
  The product's **end-user** help documentation is a distinct, non-agent layer owned by the `doc-` group below
  (NOT agent memory).
- **`doc-`** — end-user documentation (1 skill): `doc-help` (the end-user product-help layer → `.superdev/help/`).
  Authors the human-facing help that ships to the people who use the built app — distinct
  from the agent-facing `mem-` layers above; faces the end user, not Claude.
- **`dev-`** — the agentic-development pipeline + diagnostics/specs (14 skills + 4 plugin agents): planning
  (`dev-interview`, `dev-extraplan`, `dev-plan-reviewer`), the orchestrated implementation pipeline
  (`dev-orchestrator` → **mandatory first step** `dev-agent-recipe` (derives the host toolchain once →
  `recipe.sh` + `profile.md`; owns the clean-tree guard; FAIL = hard halt) → `dev-agent-adr-recorder` →
  `dev-agent-decomposer` → per task **one `Workflow`** call to `task-pipeline.workflow.js` driving `dev-coder` →
  `dev-agent-runner` → `dev-task-reviewer` → `dev-improver` → commit (the `dev-commiter` agent runs
  `commit-task.sh` as the workflow's final stage, only on PASS) → `dev-agent-final-reviewer`), the final-gate
  sub-skills (`dev-agent-plan-auditor`, `dev-agent-smoke`), plus `dev-tdd` / `dev-debug` / `dev-spec`. The four
  per-task workers `dev-coder` / `dev-task-reviewer` / `dev-improver` / `dev-commiter` are **plugin agents**
  (`superdev/agents/*.md`), not skills — dispatched by the workflow via `agentType:'superdev:dev-*'`.
- **`gh-`** — GitHub: `gh-cli` (+ `gh-cli-executor`), `gh-commit` (entry) + `gh-agent-committer`,
  `gh-issue`, `gh-pr`.

## Architecture invariants

- **One injected manifest.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superdev` dispatcher) **verbatim** once per session; `source == "resume"` is excluded by the
  matcher; fail-open (an unreadable manifest = banner only, no `additionalContext`). The hook does no
  per-project rendering — the manifest is injected as-is, identically for every project.
- **Opt-in switches (`.superdev/config.yml`).** Two booleans — `adr`, `rules_improver` — both
  **default-disabled** (a missing file/key = `false`, fail-closed; a repo that never ran `/setup` skips both
  optional steps until it opts in), plus two integer retry keys — `retry_max_attempts`, `retry_escalation_attempts` — both
  **fail-open to `3`** (a missing file/key = `3`). `setup` writes the file (seeding it from a bundled asset —
  see below); `dev-orchestrator` reads the config: it skips the `dev-agent-adr-recorder` / `dev-improver` steps
  when their switch is off — each skip is **one terse line, never a paragraph** — and forwards the two retry
  integers as the `task-pipeline.workflow.js` cap: `retry_max_attempts` becomes the `retryMaxAttempts` arg on
  the first `Workflow` invocation, and `retry_escalation_attempts` becomes a fresh `retryMaxAttempts` cap on the
  escalation Retry re-invocation. A fifth, non-boolean key, `rule_extensions:` (a
  list of source-type globs), is written **once** by `mem-rules` — in Mode A/B it discovers and **appends**
  `rule_extensions:` when the key is absent (never overwriting an existing one), creating the file if missing —
  and is **read** by `mem-rules` (all modes) and by the `dev-improver` agent (as a fail-open `paths:`-scoping
  hint). Config readers are `dev-orchestrator` (reads the booleans + the retry integers), `setup` (writer),
  `mem-rules` (reader + one-time `rule_extensions` writer), and the `dev-improver` agent (reader); the
  `SessionStart` hook does not read config (the manifest is injected verbatim, the same for every project).
- **Plan gate, plan-mode-enforced.** Planning always happens in plan mode, enforced by **two** `PreToolUse`
  hooks: `require-plan-mode.sh` (matcher `Write|Edit`) denies writing a plan file (`.claude/plans/*.md`) unless
  `permission_mode == "plan"` — forcing `EnterPlanMode` regardless of the starting mode — and `review-plan.sh`
  (matcher `ExitPlanMode`) denies the plan's approval until `dev-plan-reviewer` returns `STATUS: PASS`. The
  ExitPlanMode hook is the **single** gate in every mode, and `dev-orchestrator` trusts it — it does **not**
  re-review the plan. (Residual: a `PreToolUse` deny is only best-effort in the permission-relaxed modes
  `bypassPermissions`/`dontAsk`/`auto`, so in those modes the gate itself is best-effort.) Keep all paths in sync.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that path; adding a
  `hooks` field to `plugin.json` is a hard install error.
- **File-based dispatch.** The orchestrator dispatches by passing **file paths** (task file + path params
  like feedback/retry, reports); agents receive content **injected via dynamic context `!`**, not via `Read`.
  Pipeline state lives under `.temp/.workflows/<slug>/`; agents reply with a 3-line `STATUS / Report / Summary`
  stdout.
- **Recipe — mandatory first step (fail-closed) + sole clean-tree guard.** `dev-orchestrator` invokes
  `dev-agent-recipe` as the FIRST step on **every** entry (before ADR); it derives the host
  build/test/lint/launch verbs once and materializes `.temp/.workflows/<slug>/recipe.sh` + `profile.md`, the
  single artifact every downstream fork (`dev-agent-runner`, `dev-coder`, `dev-task-reviewer`,
  `dev-agent-decomposer`, `dev-agent-plan-auditor`, `dev-agent-smoke`) consumes instead of re-deriving the
  toolchain. It is **fail-closed**: a recipe `STATUS: FAIL` is a hard halt (like a decomposer fail), and the
  recipe agent's Step 0 (`git status --porcelain`) is now the **single** clean-tree guard for the whole run —
  the orchestrator's former ADR-step and pre-task-loop `git status` guards are gone. `recipePath` is threaded
  into every per-task `Workflow` invocation so each fork sources its verbs from the one artifact; the recipe
  self-skips regeneration when its own `recipe.sh verify` passes.
- **Script vs. fork.** A pipeline step collapses to a deterministic bundled script (under the owning skill's
  `scripts/` dir) when it operates on a known, fixed tool / format — git, a basename, paths, globs (e.g.
  `dev-orchestrator/scripts/commit-task.sh` for the per-task commit, `commit-adr.sh` for the ADR commit). It stays an LLM fork when it must interpret heterogeneous, stack-specific tool
  output (e.g. `dev-agent-runner` reading arbitrary build / test output). A self-verifying script carries its I/O
  contract in its header comment and is trusted by its caller — so the caller does NOT re-verify or retry the
  script's result (the verify-before-claim guarantee lives in the script, not a fork-era re-check guard).
  A script may still be *invoked through* a thin fork without losing this property: `commit-task.sh` is run by
  the haiku `dev-commiter` agent (so the commit lives inside the per-task `Workflow`, not the orchestrator), but
  the agent only relays the script's tag verbatim — the self-verification stays in the script, so its caller
  (the workflow, then the dispatcher reading `wf_out.commit`) still trusts the result without re-checking.
- **Self-documentation.** Any skill add / remove / rename MUST update the **owning plugin's**
  `<plugin>/.claude-plugin/plugin.json` `skills[]` (superdev's for a `mem-`/`doc-`/`dev-`/`gh-` skill, superui's
  for a `ui-`/`cc-` skill); any **agent** add / remove / rename MUST likewise update that plugin's `agents[]`
  (superdev's `dev-coder` / `dev-task-reviewer` / `dev-improver` / `dev-commiter` live there, not in `skills[]`) — and this file
  in either case. They must stay in sync, and a worker must never appear in both `skills[]` and `agents[]`.
  Each plugin's injected manifest (`<plugin>/hooks/content/manifest.md`) lists that plugin's prefix
  **groups + chains**, not individual skills, so update it only when a change adds/removes a group, shifts a
  group's scope, or alters a documented chain or config-gated area — not for every per-skill change.
  **Exception:** a user-only one-time command (`disable-model-invocation: true`, e.g. `setup`) does not
  participate in routing and stays out of the manifest entirely — do not "fix" that gap.

## Where contracts live

This file is orientation only. The authoritative contract of each skill is its own body (`# Input contract` /
`# Output format`); hook contracts live in `hooks/hooks.json` and the header comments of `hooks/scripts/*.sh`.

## When editing

- **Catalog / install layer** (`.claude-plugin/marketplace.json`, root `README.md`): keep changes minimal and
  structural. The marketplace co-lists exactly two plugins by subdir `source` (`"./superdev"`, `"./superui"`);
  renaming a plugin must update the marketplace manifest, that plugin's `<plugin>/.claude-plugin/plugin.json`,
  and the root `README.md`.
- **Plugin internals** (`<plugin>/.claude-plugin/plugin.json`, `<plugin>/hooks/`, `<plugin>/skills/`): obey the
  architecture invariants above. Paths in each `plugin.json` are plugin-root-relative (`./skills/…`); hook
  commands use `${CLAUDE_PLUGIN_ROOT}` (that plugin's install dir, i.e. its `superdev/` or `superui/` subdir).

# Assistant Conventions

## Environment
- Shell is bash on Windows; do NOT use PowerShell syntax in Bash tool calls.
