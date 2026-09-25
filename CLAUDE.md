# P2P2 Claude Code plugins (one per subdir) + marketplace catalog

> Always in English: every CLAUDE.md, script, skill, agent and reference.
> Every plugin script MUST work on Windows (Git Bash) and macOS.
> Do not use `heredoc` - it is unreliable.
> Do not use `red` color in agents.

This repo is the **source** of five independently installable Claude Code plugins - `superui`,
`superfix`, `superbiz`, `supercc`, `viber` - co-listed by the root
`.claude-plugin/marketplace.json` (marketplace name `p2p2`). The retired `superdev` plugin sits in
`docs/archive/superdev/` for reference only: not listed, not released, not tested, not shipped.

Editing a file here does NOT change the plugins loaded in the current session: skill bodies and
the injected manifest were frozen at install / session start and change only after a release is
published and reinstalled. This repo's own `CLAUDE.md` files and `.claude/rules/` are dev-time
orientation for editing the source, never plugin inputs, never read at runtime.

No application code ships: artifacts are markdown (skills, agents, references) + JSON
(manifests) + bundled scripts (bash everywhere, plus `superfix`/`superui` `.ts` run by Node and
`superbiz`'s Python report builder). Editing markdown/JSON IS shipping - no build step, no lint,
no test tooling inside any plugin. The only automated checks are the dev-time suites under
`tests/` (see `tests/CLAUDE.md`); every other contract between files is enforced by a human
reading carefully.

All five plugins are **stack-agnostic on purpose**: skills read project-specific knowledge (test
framework, build tool, naming, how to launch the app) from the HOST project's `CLAUDE.md` /
`.claude/rules/`, never from plugin sources. Never bake ecosystem assumptions (dotnet, npm,
pytest) into a skill prompt. This binds the projects being planned/built, not a plugin's own
tooling: a plugin may depend on a specific tool for its own work as a deliberate, documented
choice (Node for superui's contrast checker, Python for superbiz's report, playwright-cli for a
viber opt-in switch), always named in the owning plugin's node. Prefer putting such a dependency
behind an opt-in switch or a skip-with-note fallback where that is practical - a recommendation,
not a requirement.

**DO NOT use ADR capture for this project.** The plugins are constantly refactored; never write
ADRs here and never suggest them (`.claude/viber.yml` keeps `adr: false`).

## Layout (top level)

```
.claude-plugin/marketplace.json   Co-lists the five plugins by subdir source
superui/ superfix/ superbiz/ supercc/ viber/   One dir per plugin, each with README.md
README.md            Catalog page for humans (install commands, requirements)
.github/             CI, release workflow + scripts/release.sh, CODEOWNERS
.claude/             Dev-time rules/, settings, viber.yml switches for building THIS repo
tests/               Dev-time regression suites for plugin scripts (outside every plugin)
docs/archive/        Retired plugins kept for reference (superdev), never shipped
docs/assets/         Images embedded in READMEs (viber-flow.svg)
docs/specs/          viber's archived runs of work on this repo
```

Each plugin dir carries `.claude-plugin/plugin.json`, whose `skills[]` (and `agents[]` for
`superfix` and `viber`) is the catalog of record. Only `viber` carries `hooks/`.

## Versioning and CI

- Tag-driven, one shared namespace across all five plugins (`MAJOR.MINOR.PATCH`, no `v` prefix,
  seed `0.1.0`). The only versioning path is `.github/workflows/release-version.yml`: a manual
  `workflow_dispatch` (patch/minor/major) on a **self-hosted** runner, running
  `.github/scripts/release.sh`, which writes the version into all five `plugin.json`, commits
  `chore(bump): ...`, tags, pushes and publishes a GitHub Release. Nothing bumps on push.
- `release.sh` never touches `.claude-plugin/marketplace.json`: its own `version` is separate and
  hand-maintained. Verify script mechanics against `release.sh` before restating them.
- CI (`.github/workflows/ci.yml`) runs the suite on Linux only for push/PR; the macOS + Windows
  matrix, where portability actually gets exercised, runs only on a manual dispatch.
- `.gitattributes` forces `eol=lf` on every text file - a CRLF script breaks under bash.

## Cross-plugin architecture invariants

- **Host-repo `docs/` is the one home for persisted, user-facing knowledge.** viber's run
  directory `docs/_specs/<stamp>_<slug>/` (plan, `status.md`, decomposition, QA documents,
  `work/`, the run's notes - committed, because a build resumes from it in another session or
  machine) and its archive `docs/specs/<stamp>_<slug>/` (what `cleanup` leaves: the
  specification and QA documents; both directory names configurable in `viber.yml`);
  `docs/business/<slug>/` (superbiz's rendered report only); `docs/adr/`, written by viber
  through a plan task. `supercc` writes no `docs/<layer>/` - its deliverable is the skill/agent
  file itself.
- **No plugin ever creates a plugin-named dot-dir in the host repo** (no `.superui/` etc.). Only
  three host locations are writable at a plugin's own choosing: `docs/<layer>/`, `.claude/`
  (user-owned config/rules) and `.temp/<plugin>/` (every temporary artifact). A fourth is writable
  only because the HOST names it: the host's e2e test dir, written by viber's `e2e-writer` into
  the directory the project's own instructions name, falling back to the QA handoff's header
  lines or a direct answer from the user - never a default of its own, never a sibling it
  invented.
- **`viber` is the only manifest-bearing plugin.** Its `SessionStart` hook injects
  `hooks/content/manifest.md` verbatim once per session (`resume` excluded, fail-open: an empty
  or unreadable file leaves only the banner). The manifest is not a dispatcher: it names no
  skill, group or chain; routing is each skill's own CSO `description:`. The other four ship no
  manifest.
- **Script vs. fork.** A step collapses to a deterministic bundled script when it operates on a
  known, fixed tool/format (git, a basename, paths, globs); it stays an LLM fork when it must
  interpret heterogeneous, stack-specific output. A script whose header carries its I/O contract
  is TRUSTED by its caller - never re-verified or retried.
- **Pre-approved bundled-script calls, skill side.** Every `!` preload and every runtime `Bash`
  call of a bundled script is one literal line `"${CLAUDE_PLUGIN_ROOT}/.../x.sh" <args>` (never
  `bash`-prefixed, never assigned, never after `cd`, never chained with `;`), with one matching
  `Bash(${CLAUDE_PLUGIN_ROOT}/.../x.sh:*)` PATTERN in the skill's `allowed-tools` - a bare `Bash`
  allow does not cover a preload, and the permission classifier matches the literal prefix, so
  any other form is a new, unapproved command. Single-quote any preload argument holding `?`,
  `*` or `[`: the host shell (zsh on macOS) parses it first and `nomatch` kills the fork load. No
  PowerShell syntax anywhere. The script-side half lives in `.claude/rules/`.
- **`allowed-tools` does NOT restrict the tool set** - it is a one-turn pre-approval only. A
  strictly read-only skill needs `disallowed-tools:` (bare names, never `Tool(pattern)`) PLUS a
  body line naming its only tools; the agent-side equivalent is `tools:`. A skill that dispatches
  agents never carries `disallowed-tools:`: the removal holds until the next user message,
  subagents included, so every agent dispatched meanwhile runs without those tools. Such a skill
  states its limits in its body alone. A skill that both `!`-preloads and denies bare `Bash` is
  undefined behavior.
- **Dispatch strength.** An orchestrator's dispatch passes only `model` - the `Agent` tool takes
  no `effort`, so an agent's frontmatter is the only place its effort is set.
- **Text is the product in THIS repo.** Skill, agent and reference markdown plus the JSON
  manifests are production code here, so no task editing them ever skips its per-task review,
  however mechanical it looks. This line is the host declaration the planning track reads:
  - viber: `implementor` never profiles a task touching this repo's markdown or `plugin.json` as
    mechanical/no-review; such a task gets at least the `sonnet` plus review profile, and
    `task-reviewer` gates it before `commit-task.sh`.
- **No orphan closing tag in a written file.** Writer agents sometimes end a created file with a
  bare `</content>` leaked from their own write call; the read-back guard in every writing agent
  lowers the rate but never removes it. `tests/orphan-tags.test.ts` fails CI on any tracked file
  outside `docs/` holding a closing tag with no opener - one did ship once, inside a format
  reference an agent reads as its authority.
- **Self-documentation.** A skill add/remove/rename updates the owning `plugin.json` `skills[]`,
  an agent one its `agents[]`, and the owning `<plugin>/CLAUDE.md` in the same edit (this root
  file only when the change is repo-wide). A worker never appears in both arrays. A user-only
  command (`disable-model-invocation: true`) never participates in routing and stays out of any
  manifest - that gap is deliberate.

## Where contracts live

This file is orientation only. A skill's authoritative contract is its own body
(`# Input contract` / `# Output format`); an agent's is its own file; hook contracts live in
`viber/hooks/hooks.json` and the header comments of `viber/hooks/scripts/*.sh`.

## When editing

- **No source attribution.** Never add a "Sources" section, never name where knowledge came from
  (upstream repos, skills, courses, authors) - anywhere: skills, references, agents, CLAUDE.md,
  reports, chat answers.
- **Catalog/install layer** (`.claude-plugin/marketplace.json`, root `README.md`): keep changes
  minimal and structural. READMEs are for humans: short, usage only, no implementation detail.
- **Plugin internals**: obey the invariants above plus the plugin-specific ones in its own
  `<plugin>/CLAUDE.md`. Paths in each `plugin.json` are plugin-root-relative; hook commands and
  bundled-script calls use `${CLAUDE_PLUGIN_ROOT}` (or `${CLAUDE_SKILL_DIR}` for a skill's own
  files).

## Memory Layer

**Before working on an area, read its node first.**

| Node | Read when working on |
|---|---|
| `CLAUDE.md` | anything repo-wide - catalog, release, CI, cross-plugin invariants |
| `superbiz/CLAUDE.md` | `idea-validator` - the side-project viability workflow and its report |
| `supercc/CLAUDE.md` | `skill-designer` - authoring/refactoring/splitting/linting skills and agents |
| `superfix/CLAUDE.md` | `code-auditor` and its five agents - the investigation sweep |
| `superui/CLAUDE.md` | the `pro-designer` skill (design/frontend advisory, contrast check) |
| `tests/CLAUDE.md` | any `*.test.ts` under `tests/` - harness contract, cross-platform rules |
| `viber/CLAUDE.md` | its thirteen skills (`setup` to `commit`), fourteen agents, hooks, thirteen plugin scripts, references, the run directory and its archive, config switches, the plan gate |
