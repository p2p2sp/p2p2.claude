# superdev — Claude Code plugin (root-level) + marketplace catalog

> **These are the plugin's SOURCE files, not the live plugin.** This repo is the source
> of the `superdev` plugin that is *also installed* in this session. Editing files here (skills, manifest,
> hooks, `plugin.json`) does **NOT** change the behavior of the currently loaded plugin — the routing
> manifest and skill instructions active in this session were loaded at install/session start and stay
> frozen regardless of edits. Your changes take effect only after the **user publishes** them (commit +
> push to the marketplace source, then `/plugin update`). So: do not expect an edit to alter how skills
> route or behave in the current session, and do not "test" a change by trying to trigger the edited skill
> here — it will run the old, installed version.
>
> **Likewise, this repo's own `CLAUDE.md` and `.claude/rules/` are NOT plugin inputs.** They are dev-time
> orientation for editing the source (and conventions for working *in this repo*) — they never reach the
> skills, manifest, or hooks as runtime data. The plugin is stack-agnostic and reads host-project memory
> from the **consuming** repo's `CLAUDE.md` + `.claude/rules/` only when it runs there, and every host has
> different ones. So when reasoning about how any skill / manifest / hook behaves, do NOT factor in this
> repo's `CLAUDE.md` or rules as though they shaped that behavior — they don't ship, they don't travel, and
> the plugin will execute against entirely different memory files elsewhere. Treat them strictly as guidance
> for working on the source, never as a runtime signal the plugin consumes.

## What this repo is

A **single, self-contained Claude Code plugin — `superdev` — that lives at the repository root**. The same
root also carries a one-entry **marketplace catalog** (`.claude-plugin/marketplace.json`) that points at
itself (`source: "./"`), so the repo is simultaneously the plugin and the catalog that ships it. End-user
help lives in `README.md`; this file is orientation for the assistant.

It ships no application code — the artefacts are markdown (skills) + JSON (manifests) + the three hook scripts
under `hooks/scripts/`, plus a handful of deterministic helper scripts bundled under individual skills'
`scripts/` dirs (the `ui-*` preview scripts, the pipeline script `dev-orchestrator/scripts/commit-task.sh`,
and the one-time `setup/scripts/bootstrap.sh`).
**Editing markdown / JSON IS shipping** — there is no build / test /
lint at any level. Contracts between files are enforced by humans reading carefully.

The plugin is **stack-agnostic on purpose**: skills read project-specific knowledge (test framework, build
tool, naming, how to launch the app) from the **host** project's `CLAUDE.md` + `.claude/rules/`, never from
superdev. Do not bake ecosystem assumptions (dotnet, npm, pytest…) into skill prompts.

DO NOT USE ADR capture for this project. The plugin is constantly refactored.

## Why one plugin

superdev keeps every skill — memory, development, design, GitHub — in a single plugin so cross-domain
composition is first-class. Skills compose through CSO (frontmatter `description:`) and the single injected
manifest documents the chains, including across domains (`dev-spec → gh-issue`, `dev-final-reviewer → gh-pr`,
`ui-guardian → dev-orchestrator`, `dev-improver → mem-rules`). It is **self-contained**: `plugin.json` declares
**no `dependencies`** — installing it gives the whole ecosystem.

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog — lists the single plugin superdev by source "./" (the repo root)
  plugin.json        The plugin manifest — skills[] is the catalog of record
hooks/               One injected dispatcher manifest + the three hook scripts
  hooks.json         SessionStart (inject manifest) + PreToolUse: ExitPlanMode (plan-review gate) + Write|Edit (plan-mode guard)
  content/manifest.md  The injected `using-superdev` dispatcher
  scripts/           session-start.sh, review-plan.sh, require-plan-mode.sh
skills/              Skills grouped by prefix (mem- / doc- / dev- / ui- / gh- / cc-); some skills bundle a
                     deterministic helper under their own scripts/ dir (ui-* preview scripts,
                     dev-orchestrator/scripts/commit-task.sh, setup/scripts/bootstrap.sh)
README.md            User-facing help (install + how it works)
.github/             CI: scripts/release.sh + workflows/ (auto-version.yml, release-version.yml)
.claude/rules/       Development-only conventions for this repo
```

Versioning is tag-driven. CI keeps `plugin.json`'s `version` in sync with the highest `MAJOR.MINOR.PATCH`
git tag (no `v` prefix, seed `0.1.0`): `.github/workflows/auto-version.yml` patch-bumps on every push to
`main`, and `.github/workflows/release-version.yml` is a manual `workflow_dispatch` that bumps a chosen
part (major/minor/patch). The shared `.github/scripts/release.sh` computes the next version from the tags,
writes it into `plugin.json`, commits `[skip ci]`, and pushes the commit + tag. The tag is the source of
truth; `plugin.json.version` is derived. Because `plugin.json` now carries a `version`, `/plugin update`
ships a new version on each bump.

## Skill taxonomy (prefix = functional group)

Skills are grouped by a short prefix. The **per-skill** catalog of record is `plugin.json` `skills[]`;
the injected manifest (`hooks/content/manifest.md`) documents the prefix **groups + cross-skill chains**,
not individual skills.

- **(no prefix)** — `setup`: one-time, user-only environment bootstrap (`/setup`). Seeds `.temp/` + `.superdev/`,
  copies the bundled `.gitignore` / `.claude/settings.json` templates, and **interactively asks the 5 opt-in
  switches → writes `.superdev/config.yml`** (never overwriting an existing one). Runs in the **main session**
  (not a fork) so it can prompt via `AskUserQuestion`. It is `disable-model-invocation` (Claude never auto-routes
  to it) so it is **deliberately absent from the manifest** — see the Self-documentation invariant.
- **`mem-`** — project memory (agent-facing) (2 skills): `mem-claudemd` (CLAUDE.md cascade), `mem-rules`
  (`.claude/rules/` layer).

  **Memory layer division.** Agent-facing project knowledge splits current truth across four non-overlapping
  layers, picked by *kind of truth* — all four face the **agent**: (1) the general-rules
  manifest (this `hooks/content/manifest.md`, force-injected per session);
  (2) the `CLAUDE.md` cascade (terse agent orientation; `mem-claudemd`); (3) `.claude/rules/*` (path-scoped
  conventions; `mem-rules`, applied in-pipeline by `dev-improver`); (4) `.superdev/adr/` + `.superdev/layout/`
  (architectural *why* + design system; `dev-adr-analyzer` / `ui-extract`). In the dev pipeline, `dev-improver`
  promotes each task's review learnings into layer 3 (`.claude/rules/`), a config-gated step (`rules_improver`).
  The product's **end-user** help documentation is a distinct, non-agent layer owned by the `doc-` group below
  (NOT agent memory).
- **`doc-`** — end-user documentation (1 skill): `doc-help` (the end-user product-help layer → `.superdev/help/`,
  config-gated by `help`). Authors the human-facing help that ships to the people who use the built app — distinct
  from the agent-facing `mem-` layers above; faces the end user, not Claude.
- **`dev-`** — the agentic-development pipeline + diagnostics/specs (16 skills): planning
  (`dev-interview`, `dev-extraplan`, `dev-plan-reviewer`), the orchestrated implementation pipeline
  (`dev-orchestrator` → `dev-adr-analyzer` → `dev-decomposer` → per task `dev-coder` / `dev-runner` /
  `dev-task-reviewer` / `dev-improver` → scripted commit (`commit-task.sh`) → `dev-final-reviewer`), the
  final-gate sub-skills (`dev-plan-auditor`, `dev-smoke`), plus `dev-tdd` / `dev-debug` / `dev-spec`.
- **`ui-`** — design / frontend (5 skills): `ui-extract` (reverse-engineer the framework-agnostic L1
  system), `ui-component-creator` (author a net-new component into the L1 system), `ui-adapt` (adapt the
  L1 system to ONE concrete L2 target: pure-css / tailwind / react-shadcn / react-mui / flutter),
  `ui-web-preview` (render zero-build static HTML previews of a chosen web target), `ui-guardian` (bind UI
  work to documented tokens / components before edits).
- **`gh-`** — GitHub: `gh-cli` (+ `gh-cli-executor`), `gh-commit-context` (entry) + `gh-committer`,
  `gh-issue`, `gh-pr`.
- **`cc-`** — Claude Code platform (1 skill): `cc-artifact` (opt-in, main-session publisher of ONE
  self-contained `.html`/`.htm`/`.md` file as a shareable Claude Code Artifact; validates single-file /
  no-external-ref / size, asks first, falls back to the local path — fail-open). Never forked, never part of
  the 3-line orchestrator pipeline. Chains: `ui-web-preview → cc-artifact`, `dev-plan-reviewer PASS → cc-artifact`.

## Architecture invariants

- **One injected manifest, config-aware.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superdev` dispatcher) once per session; `source == "resume"` is excluded by the matcher; fail-open.
  The hook **renders** the manifest from `.superdev/config.yml`: each switchable area is wrapped in
  `<!--SUPERDEV:AREA x-->` sentinels, and a disabled area's block is replaced by a one-line OFF directive (the
  sentinel markers are always stripped). A missing/unreadable config = everything enabled.
- **Opt-in switches (`.superdev/config.yml`).** Five booleans — `adr`, `artifacts`, `help`, `rules_improver`,
  `ui` — all **default-enabled** (a missing file/key = `true`, fail-open; a repo that never ran
  `/setup` behaves exactly as before). `setup` writes the file; the `SessionStart` hook gates main-session routing
  (OFF directives in the manifest — `artifacts`, `ui`, and `help` are gated here); `dev-orchestrator` reads the
  config and skips the `dev-adr-analyzer` / `dev-improver` steps — each skip is **one terse line, never a
  paragraph**. Config readers are only the hook, `dev-orchestrator`, and `setup` (writer).
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
- **Self-documentation.** Any skill add / remove / rename MUST update `plugin.json` `skills[]` and this file —
  they must stay in sync. The injected manifest (`hooks/content/manifest.md`) lists prefix **groups + chains**,
  not individual skills, so update it only when a change adds/removes a group, shifts a group's scope, or alters
  a documented chain or config-gated area — not for every per-skill change. **Exception:** a user-only one-time
  command (`disable-model-invocation: true`, e.g. `setup`) does not participate in routing and stays out of the
  manifest entirely — do not "fix" that gap.

## Where contracts live

This file is orientation only. The authoritative contract of each skill is its own body (`# Input contract` /
`# Output format`); hook contracts live in `hooks/hooks.json` and the header comments of `hooks/scripts/*.sh`.

## When editing

- **Catalog / install layer** (`.claude-plugin/marketplace.json`, root `README.md`): keep changes minimal and
  structural. The marketplace lists exactly one plugin by `source: "./"`; renaming the plugin must update the
  marketplace manifest, `plugin.json`, and the root `README.md`.
- **Plugin internals** (`plugin.json`, `hooks/`, `skills/`): obey the architecture invariants above. Paths in
  `plugin.json` are root-relative (`./skills/…`); hook commands use `${CLAUDE_PLUGIN_ROOT}` (the install dir,
  which equals the repo root here).

# Assistant Conventions

## Environment
- Shell is bash on Windows; do NOT use PowerShell syntax in Bash tool calls.
