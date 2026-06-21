# superdev — Claude Code plugin (root-level) + marketplace catalog

## What this repo is

A **single, self-contained Claude Code plugin — `superdev` — that lives at the repository root**. The same
root also carries a one-entry **marketplace catalog** (`.claude-plugin/marketplace.json`) that points at
itself (`source: "./"`), so the repo is simultaneously the plugin and the catalog that ships it. End-user
help lives in `README.md`; this file is orientation for the assistant.

It ships no application code — the artefacts are markdown (skills) + JSON (manifests) + the two hook scripts
under `hooks/scripts/`, plus a handful of deterministic helper scripts bundled under individual skills'
`scripts/` dirs (the `ui-*` preview scripts and the pipeline scripts `dev-orchestrator/scripts/commit-task.sh`
+ `mem-guardian/scripts/audit-docs.py`). **Editing markdown / JSON IS shipping** — there is no build / test /
lint at any level. Contracts between files are enforced by humans reading carefully.

The plugin is **stack-agnostic on purpose**: skills read project-specific knowledge (test framework, build
tool, naming, how to launch the app) from the **host** project's `CLAUDE.md` + `.claude/rules/`, never from
superdev. Do not bake ecosystem assumptions (dotnet, npm, pytest…) into skill prompts.

DO NOT USE ADR capture for this project. The plugin is constantly refactored.

## Why one plugin

superdev keeps every skill — memory, development, design, GitHub — in a single plugin so cross-domain
composition is first-class. Skills compose through CSO (frontmatter `description:`) and the single injected
manifest documents the chains, including across domains (`dev-spec → gh-issue`, `dev-final-reviewer → gh-pr`,
`ui-guardian → dev-orchestrator`, `dev-improver → mem-rules`, `dev-documenter → mem-doc`). It is **self-contained**: `plugin.json` declares
**no `dependencies`** — installing it gives the whole ecosystem.

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog — lists the single plugin superdev by source "./" (the repo root)
  plugin.json        The plugin manifest — skills[] is the catalog of record
hooks/               One injected dispatcher manifest + the two hook scripts
  hooks.json         SessionStart (inject manifest) + PreToolUse on ExitPlanMode (plan gate)
  content/manifest.md  The injected `using-superdev` dispatcher
  scripts/           session-start.sh, review-plan.sh
skills/              Skills grouped by prefix (mem- / dev- / ui- / gh- / cc-); some skills bundle a
                     deterministic helper under their own scripts/ dir (ui-* preview scripts,
                     dev-orchestrator/scripts/commit-task.sh, mem-guardian/scripts/audit-docs.py)
README.md            User-facing help (install + how it works)
.claude/rules/       Development-only conventions for this repo
```

No `version` is declared in `plugin.json` — every commit on `main` is treated as a new version, so
`/plugin update` always fetches the latest.

## Skill taxonomy (prefix = functional group)

Skills are grouped by a short prefix; the catalog of record is `plugin.json` `skills[]` and the injected
manifest (`hooks/content/manifest.md`).

- **(no prefix)** — `setup`: one-time, user-only environment bootstrap (`/setup`). Seeds `.temp/` + `.superdev/`,
  copies the bundled `.gitignore` / `.claude/settings.json` templates, and **interactively asks the 5 opt-in
  switches → writes `.superdev/config.yml`** (never overwriting an existing one). Runs in the **main session**
  (not a fork) so it can prompt via `AskUserQuestion`. It is `disable-model-invocation` (Claude never auto-routes
  to it) so it is **deliberately absent from the manifest** — see the Self-documentation invariant.
- **`mem-`** — project memory (4 skills): `mem-init` (CLAUDE.md cascade), `mem-rules` (`.claude/rules/` layer),
  `mem-doc` (the `.superdev/documentation/` layer — current functional truth, by concept-slug; interactive writer +
  doc-file contract owner), `mem-guardian` (read-only doc↔code audit gate — fails go/no-go on undocumented
  behaviour change; the `dev-plan-auditor` analogue for docs, NOT a token binder).

  **Memory layer division.** Project memory splits current truth across five non-overlapping layers, picked by
  *kind of truth*: (1) the general-rules manifest (this `hooks/content/manifest.md`, force-injected per session);
  (2) the `CLAUDE.md` cascade (terse agent orientation; `mem-init`); (3) `.claude/rules/*` (path-scoped
  conventions; `mem-rules`, applied in-pipeline by `dev-improver`); (4) `.superdev/adr/` + `.superdev/layout/`
  (architectural *why* + design system; `dev-adr-analyzer` / `ui-extract`); (5) `.superdev/documentation/*` (current
  functional/behavioural *what each feature does today*; `mem-doc` writer + `dev-documenter` in-pipeline sync +
  `mem-guardian` audit). Behavioural description belongs in layer 5 only — never restated in a rule, an ADR, or a
  spec. In the dev pipeline, `dev-improver` promotes each task's review learnings into layer 3 (`.claude/rules/`)
  and `dev-documenter` syncs each task's `## Docs` target into layer 5 per the `mem-doc` contract — two separate,
  independently config-gated steps (`rules_improver` / `documentation`) — and `dev-final-reviewer` runs
  `mem-guardian` as a terminal sub-gate (skipped when the `documentation` switch is off).
- **`dev-`** — the agentic-development pipeline + diagnostics/specs (17 skills): planning
  (`dev-interview`, `dev-extraplan`, `dev-plan-reviewer`), the orchestrated implementation pipeline
  (`dev-orchestrator` → `dev-adr-analyzer` → `dev-decomposer` → per task `dev-coder` / `dev-runner` /
  `dev-task-reviewer` / `dev-improver` / `dev-documenter` → scripted commit (`commit-task.sh`) → `dev-final-reviewer`), the
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
- **Opt-in switches (`.superdev/config.yml`).** Five booleans — `adr`, `artifacts`, `rules_improver`,
  `documentation`, `ui` — all **default-enabled** (a missing file/key = `true`, fail-open; a repo that never ran
  `/setup` behaves exactly as before). `setup` writes the file; the `SessionStart` hook gates main-session routing
  (OFF directives in the manifest); `dev-orchestrator` reads the config and skips the `dev-adr-analyzer` /
  `dev-improver` / `dev-documenter` steps (and passes `Doc audit: off` to `dev-final-reviewer`, which then skips
  `mem-guardian`) — each skip is **one terse line, never a paragraph**. Config readers are only the hook,
  `dev-orchestrator`, and `setup` (writer).
- **One plan gate, mode-independent.** A `PreToolUse` hook on `ExitPlanMode` (`review-plan.sh`) denies
  until `dev-plan-reviewer` returns `STATUS: PASS` — but that gate exists only in plan mode. In accept-edits
  mode the **same precondition is enforced inside `dev-orchestrator`** (it will not start the pipeline without
  a passed plan-review). Keep both paths in sync.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that path; adding a
  `hooks` field to `plugin.json` is a hard install error.
- **File-based dispatch.** The orchestrator dispatches by passing **file paths** (task file + path params
  like feedback/retry, reports); agents receive content **injected via dynamic context `!`**, not via `Read`.
  Pipeline state lives under `.temp/.workflows/<slug>/`; agents reply with a 3-line `STATUS / Report / Summary`
  stdout.
- **Script vs. fork.** A pipeline step collapses to a deterministic bundled script (under the owning skill's
  `scripts/` dir) when it operates on a known, fixed tool / format — git, a basename, paths, globs (e.g.
  `dev-orchestrator/scripts/commit-task.sh` for the per-task commit, `mem-guardian/scripts/audit-docs.py` for the
  `source:`-glob ∩ diff facts). It stays an LLM fork when it must interpret heterogeneous, stack-specific tool
  output (e.g. `dev-runner` reading arbitrary build / test output). A self-verifying script carries its I/O
  contract in its header comment and is trusted by its caller — so the caller does NOT re-verify or retry the
  script's result (the verify-before-claim guarantee lives in the script, not a fork-era re-check guard).
- **Self-documentation.** Any skill add / remove / rename MUST update `plugin.json` `skills[]`, the injected
  manifest (`hooks/content/manifest.md`), and this file — they must stay in sync. **Exception:** a user-only
  one-time command (`disable-model-invocation: true`, e.g. `setup`) does not participate in routing, so it is
  registered in `plugin.json` + this file but **intentionally omitted from the manifest** — do not "fix" that gap.

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
