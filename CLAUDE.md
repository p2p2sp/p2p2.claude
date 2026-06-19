# superdev — Claude Code plugin (root-level) + marketplace catalog

## What this repo is

A **single, self-contained Claude Code plugin — `superdev` — that lives at the repository root**. The same
root also carries a one-entry **marketplace catalog** (`.claude-plugin/marketplace.json`) that points at
itself (`source: "./"`), so the repo is simultaneously the plugin and the catalog that ships it. End-user
help lives in `README.md`; this file is orientation for the assistant.

It ships no application code — the artefacts are markdown (skills) + JSON (manifests) + two hook scripts.
**Editing markdown / JSON IS shipping** — there is no build / test / lint at any level. Contracts between
files are enforced by humans reading carefully.

The plugin is **stack-agnostic on purpose**: skills read project-specific knowledge (test framework, build
tool, naming, how to launch the app) from the **host** project's `CLAUDE.md` + `.claude/rules/`, never from
superdev. Do not bake ecosystem assumptions (dotnet, npm, pytest…) into skill prompts.

DO NOT USE ADR capture for this project. The plugin is constantly refactored.

## Why one plugin

superdev keeps every skill — memory, development, design, GitHub — in a single plugin so cross-domain
composition is first-class. Skills compose through CSO (frontmatter `description:`) and the single injected
manifest documents the chains, including across domains (`dev-spec → gh-issue`, `dev-final-review → gh-pr`,
`ui-guardian → dev-orchestrate`, `dev-improve → mem-rules`). It is **self-contained**: `plugin.json` declares
**no `dependencies`** — installing it gives the whole ecosystem.

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog — lists the single plugin superdev by source "./" (the repo root)
  plugin.json        The plugin manifest — skills[] is the catalog of record
hooks/               One injected dispatcher manifest + two hook scripts
  hooks.json         SessionStart (inject manifest) + PreToolUse on ExitPlanMode (plan gate)
  content/manifest.md  The injected `using-superdev` dispatcher
  scripts/           session-start.sh, review-plan.sh
skills/              Skills grouped by prefix (mem- / dev- / ui- / gh-)
README.md            User-facing help (install + how it works)
.claude/rules/       Development-only conventions for this repo
```

No `version` is declared in `plugin.json` — every commit on `main` is treated as a new version, so
`/plugin update` always fetches the latest.

## Skill taxonomy (prefix = functional group)

Skills are grouped by a short prefix; the catalog of record is `plugin.json` `skills[]` and the injected
manifest (`hooks/content/manifest.md`).

- **(no prefix)** — `setup`: one-time, user-only environment bootstrap (`/setup`). Seeds `.temp/` + `.docs/`,
  copies the bundled `.gitignore` / `.claude/settings.json` templates, flags a legacy `docs/`. It is
  `disable-model-invocation` (Claude never auto-routes to it) so it is **deliberately absent from the manifest** —
  see the Self-documentation invariant.
- **`mem-`** — project memory: `mem-init` (CLAUDE.md cascade), `mem-rules` (`.claude/rules/` layer).
- **`dev-`** — the agentic-development pipeline + diagnostics/specs (17 skills): planning
  (`dev-interview`, `dev-plan`, `dev-plan-review`), the orchestrated implementation pipeline
  (`dev-orchestrate` → `dev-adr` → `dev-decompose` → per task `dev-code` / `dev-run` /
  `dev-task-review` / `dev-improve` / `dev-committer` → `dev-final-review`), the final-gate sub-skills
  (`dev-plan-audit`, `dev-smoke`), plus `dev-tdd` / `dev-debug` / `dev-spec`.
- **`ui-`** — design / frontend: `ui-extract`, `ui-mockup`, `ui-guardian`.
- **`gh-`** — GitHub: `gh-cli` (+ `gh-cli-exec`), `gh-commit` (router) + `gh-commit-exec`,
  `gh-commit-format`, `gh-issue`, `gh-pr`.

## Architecture invariants

- **One injected manifest.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superdev` dispatcher) once per session; `source == "resume"` is a no-op; fail-open.
- **One plan gate, mode-independent.** A `PreToolUse` hook on `ExitPlanMode` (`review-plan.sh`) denies
  until `dev-plan-review` returns `STATUS: PASS` — but that gate exists only in plan mode. In accept-edits
  mode the **same precondition is enforced inside `dev-orchestrate`** (it will not start the pipeline without
  a passed plan-review). Keep both paths in sync.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that path; adding a
  `hooks` field to `plugin.json` is a hard install error.
- **File-based dispatch.** The orchestrator dispatches by passing **file paths** (task file + path params
  like feedback/retry, reports); agents receive content **injected via dynamic context `!`**, not via `Read`.
  Pipeline state lives under `.temp/.workflows/<slug>/`; agents reply with a 3-line `STATUS / Report / Summary`
  stdout.
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
