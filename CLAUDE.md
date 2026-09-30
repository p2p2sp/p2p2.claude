# P2P2 Claude Code plugins (one per subdir) + marketplace catalog

> Always in English: every CLAUDE.md, script, skill, agent and reference.
> Every plugin script MUST work on Windows (Git Bash) and macOS.
> Do not use `heredoc` - it is unreliable.
> Do not use `red` color in agents.
> Present state only: every CLAUDE.md, README, help page and `.claude/rules/` file says what holds
> now, never a change history (what changed, was renamed, replaced or used to hold): git keeps that.
> Tokens are a design constraint: every token a skill, agent or reference makes a model read
> counts against the user's Claude Code usage limits (5-hour and weekly), and an agent holding
> too many instructions at once drifts. Prefer the design that makes a model read and re-read less.

This repo is the **source** of four independently installable Claude Code plugins - `superui`,
`superbiz`, `supercc`, `viber` - co-listed by the root
`.claude-plugin/marketplace.json` (marketplace name `p2p2`). The retired `superdev` plugin sits in
`docs/archive/superdev/` for reference only: not listed, not released, not tested, not shipped.

Editing a file here does NOT change the plugins loaded in the current session: skill bodies and
the injected manifest were frozen at install / session start and change only after a release is
published and reinstalled. This repo's own `CLAUDE.md` files and `.claude/rules/` are dev-time
orientation for editing the source, never plugin inputs, never read at runtime.

No application code ships: artifacts are markdown (skills, agents, references) + JSON
(manifests) + bundled scripts (bash everywhere, plus `viber`/`superui` `.ts` run by Node and
`superbiz`'s Python report builder). Editing markdown/JSON IS shipping - no build step, no lint,
no test tooling inside any plugin. The only automated checks are the dev-time suites under
`tests/` (per-plugin suites for superui and viber - supercc and superbiz have none -
plus `github/` for `release.sh` and the root-level `harness`, `portability` and `orphan-tags`
sweeps): run only the ones a change reaches (`tests/CLAUDE.md` maps
them), the whole suite only before handover; every other contract between files is enforced by
a human reading carefully.

All four plugins are **stack-agnostic on purpose**: skills read project-specific knowledge (test
framework, build tool, naming, how to launch the app) from the HOST project's `CLAUDE.md` /
`.claude/rules/`, never from plugin sources. Never bake ecosystem assumptions (dotnet, npm,
pytest) into a skill prompt. This binds the projects being planned/built, not a plugin's own
tooling: a plugin may depend on a specific tool for its own work as a deliberate, documented
choice (Node for superui's contrast checker and viber's `code-auditor` gates, Python for superbiz's report, playwright-cli and
`@playwright/test` for viber's user-only `e2e` skill, installed only once the user agrees), always named in the owning plugin's node. Prefer putting such a dependency
behind an opt-in switch or a skip-with-note fallback where that is practical - a recommendation,
not a requirement.

**DO NOT use ADR capture for this project.** The plugins are constantly refactored; never write
ADRs here and never suggest them (`.claude/viber.yml` keeps `adr: false`).

## Layout (top level)

```
.claude-plugin/marketplace.json   Co-lists the four plugins by subdir source
superui/ superbiz/ supercc/ viber/   One dir per plugin, each with README.md
README.md            Catalog page for humans (install commands, requirements)
.github/             CI, release workflow + scripts/release.sh, CODEOWNERS
.claude/             Dev-time rules/, settings, viber.yml switches for building THIS repo
tests/               Dev-time regression suites for plugin scripts (outside every plugin)
docs/archive/        Retired plugins kept for reference (superdev), never shipped
docs/specs/          viber's archived runs of work on this repo
```

Each plugin dir carries `.claude-plugin/plugin.json`, whose `skills[]` (and `agents[]` for
`viber`) is the catalog of record. Only `viber` carries `hooks/`.

## Versioning and CI

Tag-driven, one shared version across all four plugins, bumped only by a manual release workflow.
Read `CLAUDE.release.md` before editing `.github/` (CI, release workflow, `release.sh`) or
cutting a release.

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
  only because the HOST names it: the host's e2e test dir, resolved by viber's `e2e` skill from
  the project's own instructions, else one direct answer from the user, and passed to
  `e2e-writer` as `spec-dir:` - never a default of its own, never a sibling it invented.
- **`viber` is the only manifest-bearing plugin.** Its `SessionStart` hook injects
  `hooks/content/manifest.md` verbatim once per session (`resume` excluded, fail-open: an empty
  or unreadable file leaves only the banner). The manifest is not a dispatcher: it names a
  viber skill only to scope a rule (an exception or a limit), never to route to it; routing is
  each skill's own CSO `description:`.
- **Script vs. fork.** A step collapses to a deterministic bundled script when it operates on a
  known, fixed tool/format (git, a basename, paths, globs); it stays an LLM fork when it must
  interpret heterogeneous, stack-specific output. A script whose header carries its I/O contract
  is TRUSTED by its caller - never re-verified or retried.
- **Pre-approved bundled-script calls, skill side.** In viber, every `!` preload and every
  runtime `Bash` call of a bundled script is one literal line `"${CLAUDE_PLUGIN_ROOT}/.../x.sh" <args>` (never
  `bash`-prefixed, never assigned, never after `cd`, never chained with `;`), with one matching
  `Bash(${CLAUDE_PLUGIN_ROOT}/.../x.sh:*)` PATTERN in the skill's `allowed-tools` - a bare `Bash`
  allow does not cover a preload, and the permission classifier matches the literal prefix, so
  any other form is a new, unapproved command. Single-quote any preload argument holding `?`,
  `*` or `[`: the host shell (zsh on macOS) parses it first and `nomatch` kills the fork load. No
  PowerShell syntax anywhere. The script-side half lives in `.claude/rules/`. The other three
  plugins, and viber's `code-auditor` (a bare `Bash` allow), call their scripts through an
  interpreter (`sh`, `bash`, `node`, `python3`).
- **`allowed-tools` does NOT restrict the tool set** - it is a one-turn pre-approval only. A
  strictly read-only skill needs `disallowed-tools:` (bare names, never `Tool(pattern)`) PLUS a
  body line naming its only tools; the agent-side equivalent is `tools:`. A skill that dispatches
  agents never carries `disallowed-tools:`: the removal holds until the next user message,
  subagents included, so every agent dispatched meanwhile runs without those tools. Such a skill
  states its limits in its body, which is soft: a hard limit goes into each dispatched agent's
  `tools:` or into permissions. A skill that both `!`-preloads and denies bare `Bash` is
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
  outside `docs/` holding a closing tag with no opener.
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
- **Plugin internals**: paths in each `plugin.json` are plugin-root-relative; hook commands and
  bundled-script calls use `${CLAUDE_PLUGIN_ROOT}` (or `${CLAUDE_SKILL_DIR}` for a skill's own
  files).

## Memory Layer

**Before working on an area, read its node first.**

| Node | Read when working on |
|---|---|
| `CLAUDE.md` | anything repo-wide - catalog, release, CI, cross-plugin invariants |
| `superbiz/CLAUDE.md` | `idea-validator` - the side-project viability workflow and its report |
| `supercc/CLAUDE.md` | `skill-designer` (authoring and linting skills and agents), `model-prompting` |
| `supercc/skills/CLAUDE.md` | the files of both supercc skills |
| `superui/CLAUDE.md` | the `pro-designer` skill (design/frontend advisory, contrast check) |
| `superui/skills/CLAUDE.md` | the `pro-designer` skill files and its scripts |
| `tests/CLAUDE.md` | running tests (which suite a change reaches), any `*.test.ts` under `tests/` |
| `tests/harness/CLAUDE.md` | the shared test helpers |
| `tests/superui/CLAUDE.md` | superui's test suite |
| `tests/viber/CLAUDE.md` | viber's test suite |
| `viber/CLAUDE.md` | anything viber - the run directory and its archive, config switches, the plan gate |
| `viber/agents/CLAUDE.md` | viber's twenty-three agents, the five `code-auditor` sweep agents included |
| `viber/hooks/CLAUDE.md` | viber's hooks - the `plan-gate.sh` and `plan-hints.sh` contracts |
| `viber/references/CLAUDE.md` | viber's shared references |
| `viber/scripts/CLAUDE.md` | viber's plugin-level scripts |
| `viber/skills/CLAUDE.md` | viber's seventeen skills and their bundled scripts, `code-auditor` included |
