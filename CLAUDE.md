# P2P2 Claude Code plugins (one per subdir) + marketplace catalog

> **These are the plugins' SOURCE files, not the live plugins.** This repo is the source
> of the `superdev`, `superui`, `supergh`, and `superfix` plugins (the first three are *also installed* in this session). Editing files here (skills,
> manifests, hooks, the `plugin.json` of any plugin) does **NOT** change the behavior of the currently loaded
> plugins — the routing manifests and skill instructions active in this session were loaded at install/session
> start and stay frozen regardless of edits. Your changes take effect only after the **user publishes** them
> (commit + push to the marketplace source, then `/plugin update`). So: do not expect an edit to alter how skills
> route or behave in the current session, and do not "test" a change by trying to trigger the edited skill
> here — it will run the old, installed version.
>
> **Likewise, this repo's own `CLAUDE.md` files and `.claude/rules/` are NOT plugin inputs.** They are dev-time
> orientation for editing the source (and conventions for working *in this repo*) — they never reach the
> skills, manifests, or hooks as runtime data. All four plugins are stack-agnostic and read host-project memory
> from the **consuming** repo's `CLAUDE.md` + `.claude/rules/` only when they run there, and every host has
> different ones. So when reasoning about how any skill / manifest / hook behaves, do NOT factor in this
> repo's `CLAUDE.md` files or rules as though they shaped that behavior — they don't ship, they don't travel, and
> the plugins will execute against entirely different memory files elsewhere. Treat them strictly as guidance
> for working on the source, never as a runtime signal the plugins consume.
>
> **Per-plugin detail lives in `<plugin>/CLAUDE.md`.** `superui`, `supergh`, and `superfix` each keep their own
> dev-time orientation file — `superui/CLAUDE.md`, `supergh/CLAUDE.md`, `superfix/CLAUDE.md` — with that plugin's
> skill taxonomy, internal layout, and plugin-specific architecture invariants; `superdev` currently has none.
> Claude Code auto-loads the one for whichever plugin dir you're editing under. **This root file holds only the repo-wide facts** (the catalog,
> versioning, and the cross-plugin invariants); go to the plugin's own file for anything specific to it.

## What this repo is

**Four self-contained Claude Code plugins, each in its own subdirectory — `superdev/`, `superui/`, `supergh/`, and `superfix/`.** The
repo root carries a four-entry **marketplace catalog** (`.claude-plugin/marketplace.json`) that co-lists them
by subdir `source` (`"./superdev"`, `"./superui"`, `"./supergh"`, `"./superfix"`), so the repo is the catalog that ships all four.
Each plugin is independently installable; none declares another as a dependency. End-user help lives in
`README.md`; this file is orientation for the assistant.

- **superdev** — project memory, planning, and the agentic-development pipeline.
- **superui** — the design / frontend ecosystem: the multi-agent, framework-agnostic design-system extractor
  (an orchestrator skill dispatching eight extraction agents), a doctrinal guardian that enforces the
  extracted system on every UI task, and a professional UI/UX standards advisor. (→ `superui/CLAUDE.md`)
- **supergh** — the GitHub / git ecosystem: the `gh` CLI/REST/GraphQL reference, a fully-specified operation
  executor, Conventional-Commits commits, and template-driven issue / PR creation. Ships **no hooks and no
  manifest** — its skills route purely via CSO `description:`. (→ `supergh/CLAUDE.md`)
- **superfix** — prioritized multi-agent codebase investigation (one user-invoked skill, no hooks/manifest):
  the `code-auditor` skill sweeps a repo, scores Impact × Opportunity, and dispatches cheap-triage / deep-dive
  agents. (→ `superfix/CLAUDE.md`)

They ship no application code — the artefacts are markdown (skills) + JSON (manifests) + per-plugin hook
scripts under `<plugin>/hooks/scripts/` (only `superdev` / `superui` have hooks; `supergh` / `superfix` ship
none), plus deterministic helper scripts bundled either under an individual skill's own `scripts/` dir or, when
shared across a plugin's skills, at plugin-level `<plugin>/shared/scripts/`. Each plugin's own `CLAUDE.md`
inventories its scripts. **Editing markdown / JSON IS shipping** — there is no build / test / lint at any level.
Contracts between files are enforced by humans reading carefully.

All four plugins are **stack-agnostic on purpose**: skills read project-specific knowledge (test framework, build
tool, naming, how to launch the app) from the **host** project's `CLAUDE.md` + `.claude/rules/`, never from
the plugin sources. Do not bake ecosystem assumptions (dotnet, npm, pytest…) into skill prompts.

DO NOT USE ADR capture for this project. The plugins are constantly refactored.

## Why four plugins

Each plugin keeps its domain's skills together so a consumer can install just the development ecosystem
(`superdev`), just the design ecosystem (`superui`), just the GitHub ecosystem (`supergh`), or just the
codebase-investigation tool (`superfix`). Within a plugin, skills compose through CSO (frontmatter
`description:`) and — for the two manifest-bearing plugins (`superdev`, `superui`) — that plugin's single
injected manifest documents its routing (e.g. superdev's interview-first decision flow); `supergh` and
`superfix` ship no manifest (superfix's sole skill is user-only; supergh routes purely via CSO descriptions).
Each is **self-contained**: its `plugin.json` declares **no `dependencies`** — installing it gives that whole
ecosystem. Cross-plugin chains are **soft and optional** by design: any CSO composition that names another
plugin's skill fires only when that plugin is also installed; absent it it simply does not engage (no declared
dependency, graceful degradation).

## Repository layout (top level)

Each plugin's own internal layout lives in its `<plugin>/CLAUDE.md` (`superdev` excepted — it has none).

```
.claude-plugin/
  marketplace.json   Marketplace catalog — co-lists superdev "./superdev", superui "./superui", supergh "./supergh", superfix "./superfix"
superdev/            The superdev plugin (project memory, planning, dev pipeline)
superui/             The superui plugin (design / frontend ecosystem)               → superui/CLAUDE.md
supergh/             The supergh plugin (GitHub / git; NO hooks, NO manifest)       → supergh/CLAUDE.md
superfix/            The superfix plugin (codebase investigation; NO hooks/manifest) → superfix/CLAUDE.md
README.md            User-facing help (install + how it works)
.github/             CI: scripts/release.sh + workflows/ (release-version.yml — manual dispatch only)
.claude/rules/       Development-only conventions for this repo
.docs/               Dev-time notes + source material (per-plugin subdirs, e.g. .docs/superui/) — reference
                     documents behind skill content; NOT part of any plugin, never shipped, never read at runtime
```

Each plugin dir carries a `.claude-plugin/plugin.json` (its `skills[]` (+ `agents[]`) is the catalog of record).
`superdev` / `superui` also carry `hooks/` (one injected dispatcher manifest + hook scripts) and
`shared/` (plugin-level shared assets/scripts); `supergh` carries `shared/` only; `superui` and `superfix`
carry `agents/`.

## Versioning

Versioning is tag-driven and shared across all four plugins (one version namespace). A release keeps **all four**
`plugin.json` `version` fields (`superdev/`, `superui/`, `supergh/`, `superfix/`) in sync with the highest `MAJOR.MINOR.PATCH`
git tag (no `v` prefix, seed `0.1.0`). The sole versioning workflow is `.github/workflows/release-version.yml`
(the "Release" workflow) — a **manual** `workflow_dispatch` that bumps a chosen part (major/minor/patch, default
patch); there is **no** automatic bump on push to `main`. It runs the shared `.github/scripts/release.sh`, which
computes the next version from the tags, writes it into all four manifests, commits the bump (`chore(bump): …`),
pushes the commit + tag, and then publishes a **GitHub Release** whose notes are built from the commits since the
previous tag (grouped by conventional type) with GitHub's auto-generated notes appended. The `chore(bump)` commit
is pushed to `main` but nothing runs on push, so there is no bump loop to guard against. The tag is the source of
truth; each `plugin.json.version` is derived. Because each `plugin.json` carries a `version`, `/plugin update`
ships a new version on each release.

## Cross-plugin architecture invariants

Plugin-specific invariants (superdev's config switches / plan gate / recipe / file-based dispatch, superui's
injected manifest, supergh's / superfix's manifest-less rationale) live in the respective `<plugin>/CLAUDE.md`.
The invariants below hold across the repo.

- **One injected manifest per manifest-bearing plugin.** A single `SessionStart` hook force-injects
  `hooks/content/manifest.md` **verbatim** once per session; `source == "resume"` is excluded by the matcher;
  fail-open (an unreadable manifest = banner only, no `additionalContext`). The hook does no per-project
  rendering — the manifest is injected as-is, identically for every project. This holds for `superdev` /
  `superui`; **`supergh` and `superfix` are the exceptions** — they ship no `hooks/` and no manifest at all
  (superfix's sole skill is user-only with nothing to auto-route; supergh stays model-routable via CSO
  `description:`). A manifest-less plugin is valid whenever a `SessionStart`-injected dispatcher would add no
  routing value over the skill descriptions.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that path; adding a
  `hooks` field to `plugin.json` is a hard install error.
- **Script vs. fork (the principle).** A pipeline step collapses to a deterministic bundled script when it
  operates on a known, fixed tool / format (git, a basename, paths, globs); it stays an LLM fork when it must
  interpret heterogeneous, stack-specific tool output. A self-verifying script carries its I/O contract in its
  header comment and is **trusted by its caller** — the caller does NOT re-verify or retry the script's result
  (the verify-before-claim guarantee lives in the script). A script may still be *invoked through* a thin fork
  without losing this property, as long as the fork only relays the script's verbatim result. Per-plugin
  examples live in each `<plugin>/CLAUDE.md`.
- **Shell-portable `!` preload commands (bash / Windows / zsh).** Every inline `` !`…` `` preload in a SKILL.md
  is parsed by the **host's** shell before its content ever reaches the invoked script — and that shell varies
  per machine: zsh on macOS, bash on Linux, bash/Git-Bash on Windows. The command line MUST behave **identically
  under all of them**. The concrete trap: an argument containing a glob metacharacter (`?`, `*`, `[`) left
  **unquoted**. bash's default leaves an unmatched glob as the literal string (so it silently works), but zsh's
  default (`nomatch`) **aborts the whole command** with `no matches found` and a non-zero exit — which kills the
  entire fork preload (`Shell command failed for pattern…`), so the fork loads with no input. This is why the
  bug is invisible on bash and only surfaces on zsh. Rule: **single-quote any argument bearing `?`, `*`, or `[`**
  — e.g. `resolve-input.sh`'s optional-label convention (`'?previous-review'`, `'?plan'`, `'?spec'`), never bare
  `?previous-review`. Never rely on bash-only unmatched-glob-as-literal behavior; assume the strictest shell.
- **Self-documentation.** Any skill add / remove / rename MUST update the **owning plugin's**
  `<plugin>/.claude-plugin/plugin.json` `skills[]` (superdev's for any of its skills, superui's
  for any of its skills, supergh's for a `cli`/`cli-executor`/`commit`/`create-issue`/`create-pr` skill,
  superfix's for the `code-auditor` skill);
  any **agent** add / remove / rename MUST likewise update that plugin's `agents[]`
  (superfix's `scout` / `detective` and superui's eight extraction workers live there, not in `skills[]`;
  superdev ships no agents — every superdev worker is a skill) — and the relevant `CLAUDE.md`
  (that plugin's, and this root file when the change is repo-wide) in either case. They must stay in sync, and a
  worker must never appear in both `skills[]` and `agents[]`.
  For the manifest-bearing plugins (`superdev`, `superui`), that plugin's injected manifest
  (`<plugin>/hooks/content/manifest.md`) lists its **groups/roles + chains**, not individual skills, so update it
  only when a change adds/removes a group, shifts a group's scope, or alters a documented chain or config-gated
  area — not for every per-skill change. `supergh` / `superfix` have no manifest, so nothing of the sort to sync.
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
  architecture invariants above and the plugin-specific ones in its `<plugin>/CLAUDE.md`. Paths in each
  `plugin.json` are plugin-root-relative (`./skills/…`); hook commands use `${CLAUDE_PLUGIN_ROOT}` (that
  plugin's install dir, i.e. its `superdev/`, `superui/`, `supergh/`, or `superfix/` subdir).

# Assistant Conventions

## Environment
- The dev shell varies per machine — bash / Git-Bash on Windows, **zsh on macOS**, bash on Linux — so do NOT
  assume bash-only behavior when writing anything a shell parses (Bash tool calls AND the `` !`…` `` preloads
  the plugins ship). No PowerShell syntax; and assume the strictest shell — e.g. zsh's default `nomatch` aborts
  on an unquoted glob (`?`, `*`, `[`) where bash would let it pass, so quote such tokens (see the
  "Shell-portable `!` preload commands" invariant above).
