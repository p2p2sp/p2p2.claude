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
individual skills' `scripts/` dirs (the `superui` `ui-*` preview scripts, the superdev pipeline script
`dev-orchestrator/scripts/commit-task.sh`, and the one-time `setup/scripts/bootstrap.sh`).
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
(`dev-spec → gh-issue`, `dev-final-reviewer → gh-pr`, `dev-improver → mem-rules` in superdev). Each is
**self-contained**: its `plugin.json` declares **no `dependencies`** — installing it gives that whole
ecosystem.

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog — co-lists superdev by source "./superdev" and superui by "./superui"
superdev/            The superdev plugin
  .claude-plugin/plugin.json   The plugin manifest — skills[] is the catalog of record
  hooks/             One injected dispatcher manifest + the three hook scripts
    hooks.json       SessionStart (inject manifest) + PreToolUse: ExitPlanMode (plan-review gate) + Write|Edit (plan-mode guard)
    content/manifest.md  The injected `using-superdev` dispatcher
    scripts/         session-start.sh, review-plan.sh, require-plan-mode.sh
  skills/            Skills grouped by prefix (mem- / doc- / dev- / gh-); some skills bundle a
                     deterministic helper under their own scripts/ dir
                     (dev-orchestrator/scripts/commit-task.sh, setup/scripts/bootstrap.sh)
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
writes it into both manifests, commits `[skip ci]`, and pushes the commit + tag. The tag is the source of
truth; each `plugin.json.version` is derived. Because each `plugin.json` carries a `version`, `/plugin update`
ships a new version on each bump.

## superdev skill taxonomy (prefix = functional group)

The groups below are **superdev's**. `superui`'s `ui-` / `cc-` groups live in that plugin and are documented
in `superui/hooks/content/manifest.md` + `README.md`. For each plugin, the **per-skill** catalog of record is
its own `<plugin>/.claude-plugin/plugin.json` `skills[]`; the injected manifest
(`<plugin>/hooks/content/manifest.md`) documents that plugin's prefix **groups + cross-skill chains**, not
individual skills.

- **(no prefix)** — `setup`: one-time, user-only environment bootstrap (`/setup`). Seeds `.temp/` + `.superdev/`,
  copies the bundled `.gitignore` / `.claude/settings.json` templates, and **interactively asks the 2 opt-in
  switches → writes `.superdev/config.yml`** (never overwriting an existing one). Runs in the **main session**
  (not a fork) so it can prompt via `AskUserQuestion`. It is `disable-model-invocation` (Claude never auto-routes
  to it) so it is **deliberately absent from the manifest** — see the Self-documentation invariant.
- **`mem-`** — project memory (agent-facing) (2 skills): `mem-claudemd` (CLAUDE.md cascade), `mem-rules`
  (`.claude/rules/` layer).

  **Memory layer division.** Agent-facing project knowledge splits current truth across four non-overlapping
  layers, picked by *kind of truth* — all four face the **agent**: (1) the general-rules
  manifest (superdev's `hooks/content/manifest.md`, force-injected per session);
  (2) the `CLAUDE.md` cascade (terse agent orientation; `mem-claudemd`); (3) `.claude/rules/*` (path-scoped
  conventions; `mem-rules`, applied in-pipeline by `dev-improver`); (4) `.superdev/adr/`
  (architectural *why*; `dev-adr-analyzer`). In the dev pipeline, `dev-improver`
  promotes each task's review learnings into layer 3 (`.claude/rules/`), a config-gated step (`rules_improver`).
  The product's **end-user** help documentation is a distinct, non-agent layer owned by the `doc-` group below
  (NOT agent memory).
- **`doc-`** — end-user documentation (1 skill): `doc-help` (the end-user product-help layer → `.superdev/help/`).
  Authors the human-facing help that ships to the people who use the built app — distinct
  from the agent-facing `mem-` layers above; faces the end user, not Claude.
- **`dev-`** — the agentic-development pipeline + diagnostics/specs (16 skills): planning
  (`dev-interview`, `dev-extraplan`, `dev-plan-reviewer`), the orchestrated implementation pipeline
  (`dev-orchestrator` → `dev-adr-analyzer` → `dev-decomposer` → per task `dev-coder` / `dev-runner` /
  `dev-task-reviewer` / `dev-improver` → scripted commit (`commit-task.sh`) → `dev-final-reviewer`), the
  final-gate sub-skills (`dev-plan-auditor`, `dev-smoke`), plus `dev-tdd` / `dev-debug` / `dev-spec`.
- **`gh-`** — GitHub: `gh-cli` (+ `gh-cli-executor`), `gh-commit-context` (entry) + `gh-committer`,
  `gh-issue`, `gh-pr`.

## Architecture invariants

- **One injected manifest.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superdev` dispatcher) **verbatim** once per session; `source == "resume"` is excluded by the
  matcher; fail-open (an unreadable manifest = banner only, no `additionalContext`). The hook does no
  per-project rendering — the manifest is injected as-is, identically for every project.
- **Opt-in switches (`.superdev/config.yml`).** Two booleans — `adr`, `rules_improver` — both
  **default-enabled** (a missing file/key = `true`, fail-open; a repo that never ran `/setup` behaves exactly
  as before). `setup` writes the file; `dev-orchestrator` reads the config and skips the `dev-adr-analyzer` /
  `dev-improver` steps — each skip is **one terse line, never a paragraph**. Config readers are
  `dev-orchestrator` and `setup` (writer); the `SessionStart` hook does not read config (the manifest is
  injected verbatim, the same for every project).
- **Plan gate, plan-mode-enforced.** Planning always happens in plan mode, enforced by **two** `PreToolUse`
  hooks: `require-plan-mode.sh` (matcher `Write|Edit`) denies writing a plan file (`.claude/plans/*.md`) unless
  `permission_mode == "plan"` — forcing `EnterPlanMode` regardless of the starting mode — and `review-plan.sh`
  (matcher `ExitPlanMode`) denies the plan's approval until `dev-plan-reviewer` returns `STATUS: PASS`. The
  ExitPlanMode hook is the primary gate in every mode; `dev-orchestrator` keeps a **defense-in-depth** plan-review
  self-check before starting the pipeline (in case plan mode was bypassed — note a `PreToolUse` deny is only
  best-effort in the permission-relaxed modes `bypassPermissions`/`dontAsk`/`auto`). Keep all paths in sync.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that path; adding a
  `hooks` field to `plugin.json` is a hard install error.
- **File-based dispatch.** The orchestrator dispatches by passing **file paths** (task file + path params
  like feedback/retry, reports); agents receive content **injected via dynamic context `!`**, not via `Read`.
  Pipeline state lives under `.temp/.workflows/<slug>/`; agents reply with a 3-line `STATUS / Report / Summary`
  stdout.
- **Script vs. fork.** A pipeline step collapses to a deterministic bundled script (under the owning skill's
  `scripts/` dir) when it operates on a known, fixed tool / format — git, a basename, paths, globs (e.g.
  `dev-orchestrator/scripts/commit-task.sh` for the per-task commit). It stays an LLM fork when it must interpret heterogeneous, stack-specific tool
  output (e.g. `dev-runner` reading arbitrary build / test output). A self-verifying script carries its I/O
  contract in its header comment and is trusted by its caller — so the caller does NOT re-verify or retry the
  script's result (the verify-before-claim guarantee lives in the script, not a fork-era re-check guard).
- **Self-documentation.** Any skill add / remove / rename MUST update the **owning plugin's**
  `<plugin>/.claude-plugin/plugin.json` `skills[]` (superdev's for a `mem-`/`doc-`/`dev-`/`gh-` skill, superui's
  for a `ui-`/`cc-` skill) and this file — they must stay in sync, and a skill must never appear in both catalogs.
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
