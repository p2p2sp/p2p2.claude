# P2P2 Claude Code plugins (one per subdir) + marketplace catalog

> Always in English: all CLAUDE.MD files, scripts

> **These are the plugins' SOURCE files, not the live plugins.** This repo is the source
> of the `superdev`, `superui`, `supergh`, `superfix`, `superbiz`, and `supercc` plugins (the first three are *also installed* in this session). Editing files here (skills,
> manifests, hooks, the `plugin.json` of any plugin) does **NOT** change the behavior of the currently loaded
> plugins - the routing manifests and skill instructions active in this session were loaded at install/session
> start and stay frozen regardless of edits. Your changes take effect only after the **user publishes** them
> (commit + push to the marketplace source, then `/plugin update`). So: do not expect an edit to alter how skills
> route or behave in the current session, and do not "test" a change by trying to trigger the edited skill
> here - it will run the old, installed version.
>
> **Likewise, this repo's own `CLAUDE.md` files and `.claude/rules/` are NOT plugin inputs.** They are dev-time
> orientation for editing the source (and conventions for working *in this repo*) - they never reach the
> skills, manifests, or hooks as runtime data. All six plugins are stack-agnostic and read host-project memory
> from the **consuming** repo's `CLAUDE.md` + `.claude/rules/` only when they run there, and every host has
> different ones. So when reasoning about how any skill / manifest / hook behaves, do NOT factor in this
> repo's `CLAUDE.md` files or rules as though they shaped that behavior - they don't ship, they don't travel, and
> the plugins will execute against entirely different memory files elsewhere. Treat them strictly as guidance
> for working on the source, never as a runtime signal the plugins consume.
>
> **Per-plugin detail lives in `<plugin>/CLAUDE.md`.** `superui`, `supergh`, `superfix`, `superbiz`, and
> `supercc` each keep their own dev-time orientation file - `superui/CLAUDE.md`, `supergh/CLAUDE.md`,
> `superfix/CLAUDE.md`, `superbiz/CLAUDE.md`, `supercc/CLAUDE.md` - with that plugin's skill taxonomy, internal
> layout, and plugin-specific architecture invariants; `superdev` currently has none.
> Claude Code auto-loads the one for whichever plugin dir you're editing under. **This root file holds only the repo-wide facts** (the catalog,
> versioning, and the cross-plugin invariants); go to the plugin's own file for anything specific to it.

## Environment
- The dev shell varies per machine - bash / Git-Bash on Windows, **zsh on macOS**, bash on Linux - so do NOT
  assume bash-only behavior when writing anything a shell parses (Bash tool calls AND the `` !`…` `` preloads
  the plugins ship). No PowerShell syntax; and assume the strictest shell - e.g. zsh's default `nomatch` aborts
  on an unquoted glob (`?`, `*`, `[`) where bash would let it pass, so quote such tokens (see the
  "Shell-portable `!` preload commands" invariant above).

## What this repo is

**Six self-contained Claude Code plugins, each in its own subdirectory - `superdev/`, `superui/`, `supergh/`,
`superfix/`, `superbiz/`, and `supercc/`.** The
repo root carries a **marketplace catalog** (`.claude-plugin/marketplace.json`) that co-lists them
by subdir `source` (`"./superdev"`, `"./superui"`, `"./supergh"`, `"./superfix"`, `"./superbiz"`).

> **`supercc` is temporarily DELISTED from the marketplace.** Its source still lives in `supercc/` and its
> `plugin.json` is still version-bumped by `.github/scripts/release.sh`, but it has **no entry in
> `.claude-plugin/marketplace.json`** and no row in the root `README.md`, so it is not installable from the
> catalog. Everywhere below that says "six plugins" / "all six", read it as the six plugin **directories** -
> the catalog currently publishes five. Re-listing it means re-adding the `{"name": "supercc", "source":
> "./supercc", …}` entry plus the README install line, table row and requirements bullet.

Each plugin is independently installable; none declares another as a dependency. End-user help is split:
the root `README.md` is the catalog page (what the repo is, install, one row per plugin linking onward),
and each plugin carries its own `<plugin>/README.md` with that plugin's description, a usage guide and its
skill/agent list. This file is orientation for the assistant.

- **superdev** - project memory, planning, and the agentic-development pipeline. Also ships a third,
  user-facing memory layer - `superdev-docs` + `superdev-docs-writer` maintain per-feature product docs in
  the host repo's `docs/product/<feature-slug>.md`, treated as user intent (divergence from code is surfaced
  as a requirement, never silently overwritten), wired into both build close-outs behind an opt-in `docs`
  config switch.
- **superui** - the design / frontend ecosystem, pairing Claude Code CLI (measurement, agentic fan-out) and
  Claude Design (live, inline-styled Design Components), via a **two-stage** screenshots-to-handoff-bundle
  pipeline: `/superui:design-extractor <screenshots-dir> [<target>]` turns a folder of UI screenshots into the
  pure, platform-neutral design system alone - `DESIGN.md` (YAML front-matter tokens + a prose body) at the
  host repo's `docs/design-system/` (or `docs/design-system/<target>/`), via an internal fork worker
  (`design-extractor-builder`) - then loops to offer chaining `/superui:component-extractor <screenshots-dir>
  <platform> [<target>]` (`platform`: `web-app` | `mobile` | `website`) once per platform, which reads that
  `DESIGN.md` and builds the platform component/pattern bundle (`DESIGN.components.md` /
  `DESIGN.patterns.md` spec satellites plus canonical screens) at `docs/design-system/[<target>/]<platform>/`,
  via its own internal fork worker (`component-extractor-builder`); `component-extractor` also runs standalone
  against an already-extracted `DESIGN.md`, any number of times, one platform per run. Also ships a
  professional UI/UX standards advisor (`pro-designer`) and a user-only `setup` diagnostic. Ships **no hooks
  and no manifest** - `pro-designer` routes purely via CSO `description:`; `design-extractor` and `setup` are
  user-only commands; `component-extractor` is a deliberate exception - model-invocable behind its own guarded
  CSO `description:` so `design-extractor`'s ending loop can chain it via the `Skill` tool, while a user can
  also invoke it directly. (→ `superui/CLAUDE.md`)
- **supergh** - the GitHub / git ecosystem: the `gh` CLI/REST/GraphQL reference, a fully-specified operation
  executor, Conventional-Commits commits, and template-driven issue / PR creation. Ships **no hooks and no
  manifest** - its skills route purely via CSO `description:`. (→ `supergh/CLAUDE.md`)
- **superfix** - prioritized multi-agent codebase investigation (one user-invoked skill, no hooks/manifest):
  the `code-auditor` skill sweeps a repo on two tracks - files, scored Impact × Opportunity, and
  producer/consumer artifact pairs, triaged `MATCH` / `MISMATCH` / `UNCLEAR` / `NO_CONTRACT` (the gate keeps
  `MATCH` and `NO_CONTRACT` out of dispatch) - and dispatches cheap-triage / deep-dive agents into the union of
  both. (→ `superfix/CLAUDE.md`)
- **superbiz** - the business analysis ecosystem: **one skill**, `idea-validator`
  (`disable-model-invocation: true`, argument `[idea text | path/to/idea.md] [--quick]`). It answers one
  question - is this idea worth turning into a side project - judging it as a side-income product that runs on
  autopilot after launch rather than a venture-scale startup, and treating the build as cheap and therefore
  non-differentiating. Fifteen fixed steps: intake (`AskUserQuestion`), Lean Canvas + hidden assumptions, risk
  hypotheses, three parallel `general-purpose` research subagents (problem / market / competition), the
  business-model / distribution / side-project-fit / autopilot-fit analyses, a seven-member council run as
  seven isolated `general-purpose` subagents over two rounds (round 2 skipped only with `--quick`), a
  moderator synthesis with a Go / Pivot / No-Go verdict and a mandatory dissenting opinion, an experiment plan
  and pre-committed decision thresholds, and finally `scripts/build_report.py` rendering one self-contained
  `report.html`. The plugin ships **no hooks, no manifest and no agents** - `idea-validator` does not route at
  all and fans out with the `Agent` tool rather than `Skill` forks. (→ `superbiz/CLAUDE.md`)
- **supercc** - Claude Code's own configuration on the machine it runs on. One CSO-routed skill,
  `setup-permissions`, writes permission rules into the **user's** settings (`~/.claude/settings.json`) - and,
  for blocks carrying a `memory` array, a marker-scoped block in the user's memory (`~/.claude/CLAUDE.md`) -
  never into the host project, via a bundled Node script over a single rules source (`references/rules.json`),
  offering either a one-shot `fast` preset or a four-question interview. This is the only plugin that writes
  outside the consuming repo, by design: permission rules must hold in every repository. Ships **no hooks and
  no manifest**. (→ `supercc/CLAUDE.md`)

They ship no application code - the artefacts are markdown (skills) + JSON (manifests) + per-plugin hook
scripts under `<plugin>/hooks/scripts/` (only `superdev` has hooks; `superui` / `supergh` / `superfix` /
`superbiz` / `supercc` ship none), plus deterministic helper scripts bundled either under an individual skill's own
`scripts/` dir or, when shared across a plugin's skills, at plugin level. `supergh` keeps its shared scripts
under `<plugin>/shared/` (a `scripts/` subdir); `superdev` keeps its shared scripts and references at the
plugin root (`superdev/scripts/`, `superdev/references/`), and `superui` keeps its shared scripts and its
seven agents at the plugin root (`superui/scripts/`, `superui/agents/`), both with no `shared/` subdir.
`superui` has no `references/` or `assets/` dir at the plugin root - only `pro-designer` and
`component-extractor` need a `references/` dir, and each keeps its own rather than sharing one at the plugin
root. `superbiz` ships no plugin-root dirs at all - its one skill, `idea-validator`, bundles its own
`references/` (including a `references/council/` subdir), `scripts/`, `assets/` and `evals/`. Its
`build_report.py` is the repo's only **Python** script (stdlib only), every other bundled script being bash
or TypeScript. `supercc` likewise ships
no plugin-root dirs - its single skill bundles its own `references/` and `scripts/`. Each
plugin's own `CLAUDE.md` inventories its scripts. **Editing markdown / JSON IS shipping** - there is no
build step and no lint at any level, and no test tooling inside any plugin. Dev-time regression suites for
plugin scripts live at the repo-root `tests/` tree (outside every plugin dir, so no `plugin.json` or
marketplace entry references it) and run with Node's native `node --test`. Contracts between files are
otherwise enforced by humans reading carefully.

All six plugins are **stack-agnostic on purpose**: skills read project-specific knowledge (test framework, build
tool, naming, how to launch the app) from the **host** project's `CLAUDE.md` + `.claude/rules/`, never from
the plugin sources. Do not bake ecosystem assumptions (dotnet, npm, pytest…) into skill prompts.

DO NOT USE ADR capture for this project. The plugins are constantly refactored.

## Why six plugins

Each plugin keeps its domain's skills together so a consumer can install just the development ecosystem
(`superdev`), just the design ecosystem (`superui`), just the GitHub ecosystem (`supergh`), just the
codebase-investigation tool (`superfix`), just the idea validation tool
(`superbiz`), or just the Claude Code configuration tool (`supercc`). Within a plugin, skills compose through CSO (frontmatter
`description:`) and - for the sole manifest-bearing plugin (`superdev`) - that plugin's single
injected manifest documents its routing (e.g. superdev's interview-first decision flow); `superui`, `supergh`,
`superfix`, `superbiz` and `supercc` ship no manifest (superfix's sole skill is user-only; supergh routes purely via CSO
descriptions; superui routes `pro-designer` the same way while its `design-extractor` skill is a user-only
command; superbiz's sole skill is a user-only command too, so nothing routes there at all;
supercc's sole skill routes via its own CSO description).
Each is **self-contained**: its `plugin.json` declares **no `dependencies`** - installing it gives that whole
ecosystem. Cross-plugin chains are **soft and optional** by design: any CSO composition that names another
plugin's skill fires only when that plugin is also installed; absent it it simply does not engage (no declared
dependency, graceful degradation).

## Repository layout (top level)

Each plugin's own internal layout lives in its `<plugin>/CLAUDE.md` (`superdev` excepted - it has none).

```
.claude-plugin/
  marketplace.json   Marketplace catalog - co-lists superdev "./superdev", superui "./superui", supergh "./supergh", superfix "./superfix", superbiz "./superbiz" (supercc is delisted - see the note above)
superdev/            The superdev plugin (project memory, planning, dev pipeline)
superui/             The superui plugin (design / frontend; NO hooks, NO manifest)  → superui/CLAUDE.md
supergh/             The supergh plugin (GitHub / git; NO hooks, NO manifest)       → supergh/CLAUDE.md
superfix/            The superfix plugin (codebase investigation; NO hooks/manifest) → superfix/CLAUDE.md
superbiz/            The superbiz plugin (idea validation; one user-only skill, NO hooks, NO manifest, NO agents) → superbiz/CLAUDE.md
supercc/             The supercc plugin (Claude Code's own configuration; NO hooks, NO manifest) → supercc/CLAUDE.md
README.md            User-facing catalog page (what the repo is, install, one row per plugin linking to
                     that plugin's own <plugin>/README.md - which carries its description, usage guide and
                     skill list; every plugin has one)
.github/             CI: scripts/release.sh + workflows/ (release-version.yml - manual dispatch only)
.claude/rules/       Development-only conventions for this repo
docs/.workflows/     Run records of superdev builds executed ON this repo (one dir per build: spec, plan,
                     tasks, implementation reports) - history, never rewritten; ships with no plugin
tests/               Dev-time regression suites for plugin scripts, run from the repo root with
                     `node --test "tests/**/*.test.ts"` (a bare directory argument, e.g. `tests/superui/`,
                     does not work - `node --test` resolves it as a module path, not a glob)
                     - sits outside every plugin dir, so no plugin.json and no marketplace entry references it;
                     ships with no plugin. Fixtures, expected outputs and stub scenarios stay file-local to
                     each `*.test.ts` - `tests/harness/` is the single exception, exposing shared *mechanism*
                     only (subprocess execution, temp dirs, throwaway git repos, PATH stubs, shell discovery,
                     path-separator normalisation, PNG fixtures), never per-script knowledge.
                     CI (.github/workflows/tests.yml) runs the suite on ubuntu only for push / pull_request,
                     and on the full ubuntu / macos / windows matrix on manual workflow_dispatch, so every
                     test must hold under Git-Bash too: compare script-printed paths with `slash()` from
                     `tests/harness/paths.ts` (a shell script joins with "/" whatever native path it was
                     handed), and never assume `chmod` denies access.
docs/assets/         Images embedded in a README so they render publicly on GitHub - superdev-flow.svg
                     (the superdev Simple/Super flow diagram, embedded by superdev/README.md via the
                     relative path ../docs/assets/). Ships with no plugin; moving or deleting anything
                     here breaks that image link
.docs/               Dev-time notes + source material (per-plugin subdirs, e.g. .docs/superui/) - reference
                     documents behind skill content; NOT part of any plugin, never shipped, never read at runtime
```

Each plugin dir carries a `.claude-plugin/plugin.json` (its `skills[]` (+ `agents[]`) is the catalog of record).
`superdev` alone also carries `hooks/` (one injected dispatcher manifest + hook scripts); plugin-level shared
scripts live in `superdev/scripts/`, `superdev/references/` and `superui/scripts/` (no `shared/` subdir);
`supergh` carries `shared/` only; `superui` and `superfix` carry `agents/`. `superbiz` and `supercc` each carry
`skills/` and nothing else at the plugin root - their single skills bundle everything they need.

## Versioning

Versioning is tag-driven and shared across all six plugins (one version namespace). A release keeps **all six**
`plugin.json` `version` fields (`superdev/`, `superui/`, `supergh/`, `superfix/`, `superbiz/`, `supercc/`) in sync with the highest `MAJOR.MINOR.PATCH`
git tag (no `v` prefix, seed `0.1.0`). The sole versioning workflow is `.github/workflows/release-version.yml`
(the "Release" workflow) - a **manual** `workflow_dispatch` that bumps a chosen part (major/minor/patch, default
patch); there is **no** automatic bump on push to `main`. It runs the shared `.github/scripts/release.sh`, which
computes the next version from the tags, writes it into all six manifests, commits the bump (`chore(bump): …`),
pushes the commit + tag, and then publishes a **GitHub Release** whose notes are built from the commits since the
previous tag (grouped by conventional type) with GitHub's auto-generated notes appended. The `chore(bump)` commit
is pushed to `main` but nothing runs on push, so there is no bump loop to guard against. The tag is the source of
truth; each `plugin.json.version` is derived. Because each `plugin.json` carries a `version`, `/plugin update`
ships a new version on each release.

## Cross-plugin architecture invariants

Plugin-specific invariants (superdev's config switches / plan gate / recipe / file-based dispatch, superui's /
supergh's / superfix's / superbiz's / supercc's manifest-less rationale) live in the respective
`<plugin>/CLAUDE.md`.
The invariants below hold across the repo.

- **Host-repo `docs/` is the one home for user-facing persisted knowledge.** Every long-lived document a
  plugin writes into the consuming repo lands under `docs/<layer>/`, never in a host-root dot-dir and never
  in a plugin-named dir: `docs/adr/` (superdev's `superbuild-adr`, gated by the `adr` config switch),
  `docs/design-system/` (superui's `design-extractor`; `docs/design-system/<target>/` with the optional
  `<target>` argument), `docs/product/` (superdev's docs layer, gated by the `docs` switch),
  `docs/.workflows/` (superdev's per-build working dirs written by `decompose.sh` - spec, plan copy,
  task files, implementation reports - plus the specs `superspec` saves; marked `linguist-generated`
  in `.gitattributes` so GitHub collapses them in review). These are
  version-controlled deliverables the user reads and edits.
  **Open deviation:** superbiz's `idea-validator` currently writes its whole run - working files 00-13 *and*
  the `report.html` deliverable - to `./idea-validation/<slug>-<YYYY-MM-DD>/` at the host repo root, which is
  none of the three allowed locations. Either the skill moves (working files to `.temp/superbiz/`, the report
  to `docs/business/<idea-slug>/`) or this invariant gets amended; until then it is a known divergence, not a
  precedent.
- **No plugin ever creates a plugin-named dot-dir in the host repo** - no `.superdev/`, no `.superui/`,
  no equivalent for any future plugin. Only three host-repo locations are writable: `docs/<layer>/` for
  persisted user-facing knowledge (above), `.claude/` for configuration the user owns and edits
  (superdev's opt-in switches live in `.claude/superdev.yml`, read by `scripts/read-config.sh`; rules in
  `.claude/rules/`), and `.temp/` for every temporary artifact, grouped in per-plugin subdirs
  (`.temp/superdev/{docs,memory,rules}/capture-<RUN_ID>.md`, superui run dirs). A new persisted
  user-facing artifact means a new `docs/<layer>/`; new machine state means `.temp/<plugin>/` - never a
  dot-dir at the host root. **One carve-out, and only this one:** `supercc`'s `setup-permissions` writes the
  user's machine-wide Claude Code configuration (`~/.claude/settings.json`, plus a marker-scoped block in
  `~/.claude/CLAUDE.md`), because permission rules and the standing instructions that back them must hold in
  every repository, not one. That is outside the host repo entirely - it does not weaken the rule above, and no
  plugin may take it as licence to write host-repo state anywhere else.
- **One injected manifest per manifest-bearing plugin.** A single `SessionStart` hook force-injects
  `hooks/content/manifest.md` **verbatim** once per session; `source == "resume"` is excluded by the matcher;
  fail-open (an unreadable manifest = banner only, no `additionalContext`). The hook does no per-project
  rendering - the manifest is injected as-is, identically for every project. This holds for `superdev` only;
  **`superui`, `supergh`, `superfix`, `superbiz` and `supercc` ship no `hooks/` and no manifest at all** (superfix's sole
  skill is user-only with nothing to auto-route; supergh stays fully model-routable via CSO `description:`;
  superui routes `pro-designer` the same way while `design-extractor` is a user-only command with an internal
  fork worker behind it; superbiz's sole skill is a user-only command with nothing to auto-route;
  supercc's sole skill stays model-routable via its CSO `description:`).
  A manifest-less plugin is valid whenever a `SessionStart`-injected dispatcher would add no
  routing value over the skill descriptions.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that path; adding a
  `hooks` field to `plugin.json` is a hard install error.
- **Script vs. fork (the principle).** A pipeline step collapses to a deterministic bundled script when it
  operates on a known, fixed tool / format (git, a basename, paths, globs); it stays an LLM fork when it must
  interpret heterogeneous, stack-specific tool output. A self-verifying script carries its I/O contract in its
  header comment and is **trusted by its caller** - the caller does NOT re-verify or retry the script's result
  (the verify-before-claim guarantee lives in the script). A script may still be *invoked through* a thin fork
  without losing this property, as long as the fork only relays the script's verbatim result. Per-plugin
  examples live in each `<plugin>/CLAUDE.md`.
- **Shell-portable `!` preload commands (bash / Windows / zsh).** Every inline `` !`…` `` preload in a SKILL.md
  is parsed by the **host's** shell before its content ever reaches the invoked script - and that shell varies
  per machine: zsh on macOS, bash on Linux, bash/Git-Bash on Windows. The command line MUST behave **identically
  under all of them**. The concrete trap: an argument containing a glob metacharacter (`?`, `*`, `[`) left
  **unquoted**. bash's default leaves an unmatched glob as the literal string (so it silently works), but zsh's
  default (`nomatch`) **aborts the whole command** with `no matches found` and a non-zero exit - which kills the
  entire fork preload (`Shell command failed for pattern…`), so the fork loads with no input. This is why the
  bug is invisible on bash and only surfaces on zsh. Rule: **single-quote any argument bearing `?`, `*`, or `[`**
  - e.g. `resolve-input.sh`'s optional-label convention (`'?plan'`, `'?spec'`), never bare
  `?plan`. Never rely on bash-only unmatched-glob-as-literal behavior; assume the strictest shell.
- **Pre-approved `!` preload commands.** A preload runs at skill-load time and is permission-checked like any
  Bash call, but a bare `Bash` entry in `allowed-tools` (or a blanket `"Bash"` allow in the user's settings)
  does **not** cover it - an unmatched preload aborts the whole fork load with
  `Shell command permission check failed for pattern…`, so the fork never sees its input. Two rules, both
  required: (1) the skill's `allowed-tools` MUST carry a **pattern** entry for the preload, e.g.
  `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh:*)` (supergh precedent: `Bash(sh:*)`); (2) invoke a
  bundled script **directly** (`` !`"${CLAUDE_PLUGIN_ROOT}/…/foo.sh" …` ``), never through an interpreter
  (`bash foo.sh`) - which also means every preloaded script MUST keep its exec bit (`100755` in the git index)
  and its `#!/usr/bin/env bash` shebang.
- **`allowed-tools` does NOT restrict the tool set.** It is a one-turn permission pre-approval only; every
  other tool stays in the model's pool and remains callable, so an unlisted tool is not blocked - it merely
  **prompts the user**, stalling the run. A worker that must be strictly read-only therefore needs
  `disallowed-tools:` in its frontmatter (bare tool names, comma/space-separated, no `Tool(pattern)` form),
  which removes those tools from the model's context entirely - no prompt can fire. Precedent: the three
  planning reviewers (`simpleplan-reviewer`, `superplan-reviewer`, `superspec-reviewer`) pair
  `allowed-tools: Read, Grep, Glob` with a `disallowed-tools` denylist led by `Bash`, and back it with an
  explicit "your only tools are Read, Grep, Glob; never run a command" line in the body - a frontmatter
  restriction and a body instruction, because "read-only" alone reads to a model as "do not write files"
  and leaves `git`/`ls`/`rg` looking allowed. The equivalent hard allowlist for an **agent** is its `tools:`
  field. Note the interaction with the preload rule above: a skill that both `!`-preloads a script and
  denies bare `Bash` is undefined behavior - a strictly read-only worker takes its inputs as PATHS in
  `"$ARGUMENTS"` and reads them itself, no preload.
- **Self-documentation.** Any skill add / remove / rename MUST update the **owning plugin's**
  `<plugin>/.claude-plugin/plugin.json` `skills[]` (superdev's for any of its skills, superui's
  for any of its skills, supergh's for a `cli`/`cli-executor`/`commit`/`create-issue`/`create-pr` skill,
  superfix's for the `code-auditor` skill, superbiz's for the `idea-validator` skill;
  supercc's for the `setup-permissions` skill);
  any **agent** add / remove / rename MUST likewise update that plugin's `agents[]`
  (superfix's `scout` / `edge-scout` / `detective` / `critic` live there, not in `skills[]`; superui's seven
  agents live there too, split 2+5 across its four pipeline skills - `design-extractor` dispatches
  `source-scout`; `design-extractor-builder` dispatches `foundation-analyst` and `design-synthesizer`;
  `component-extractor` dispatches `source-scout` again and `component-scout`; `component-extractor-builder`
  dispatches `spec-writer`, `component-synthesizer` and `bundle-reviewer`; superdev, superbiz and supercc ship
  no agents at all - superdev's workers are skills, and superbiz's council members are `general-purpose`
  subagents prompted from `references/council/`, not declared agents) - and the relevant `CLAUDE.md`
  (that plugin's, and this root file when the change is repo-wide) in either case. They must stay in sync, and a
  worker must never appear in both `skills[]` and `agents[]`.
  For the manifest-bearing plugin (`superdev`), its injected manifest
  (`superdev/hooks/content/manifest.md`) lists its **groups/roles + chains**, not individual skills, so update it
  only when a change adds/removes a group, shifts a group's scope, or alters a documented chain or config-gated
  area - not for every per-skill change. `superui` / `supergh` / `superfix` / `superbiz` / `supercc` have no
  manifest, so nothing of the sort to sync.
  **Exception:** a user-only one-time command (`disable-model-invocation: true`, e.g. `setup`) does not
  participate in routing and stays out of the manifest entirely - do not "fix" that gap.

## Where contracts live

This file is orientation only. The authoritative contract of each skill is its own body (`# Input contract` /
`# Output format`); hook contracts live in `hooks/hooks.json` and the header comments of `hooks/scripts/*.sh`.

## When editing

- **No source attribution.** Never add a "Sources" section and never mention where knowledge was
  taken from (upstream repos, skills, courses, authors) - not in skill/reference/agent content, not in
  CLAUDE.md files, not in reports or chat answers. Distilled knowledge ships as this repo's own content.
- **Catalog / install layer** (`.claude-plugin/marketplace.json`, root `README.md`): keep changes minimal and
  structural. The marketplace co-lists exactly five plugins by subdir `source` (`"./superdev"`, `"./superui"`,
  `"./supergh"`, `"./superfix"`, `"./superbiz"`) - `supercc` is delisted, see the note at the top; renaming a
  plugin must update the marketplace manifest, that plugin's `<plugin>/.claude-plugin/plugin.json`, and the
  root `README.md`.
- **Plugin internals** (`<plugin>/.claude-plugin/plugin.json`, `<plugin>/hooks/`, `<plugin>/skills/`): obey the
  architecture invariants above and the plugin-specific ones in its `<plugin>/CLAUDE.md`. Paths in each
  `plugin.json` are plugin-root-relative (`./skills/…`); hook commands use `${CLAUDE_PLUGIN_ROOT}` (that
  plugin's install dir, i.e. its `superdev/`, `superui/`, `supergh/`, `superfix/`, `superbiz/`, or `supercc/` subdir).
