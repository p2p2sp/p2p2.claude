# P2P2 Claude Code plugins (one per subdir) + marketplace catalog

> Always in English: all CLAUDE.md files, scripts, etc.
> All plugin scripts MUST work on `Windows` & `MacOs`.
> Do not use `heredoc` – it is unreliable.

This repo is the **source** for six independently-installable Claude Code plugins -
`superui`, `supergh`, `superfix`, `superbiz`, `supercc`, `viber` - co-listed by the root
`.claude-plugin/marketplace.json`. The retired `superdev` plugin (and its test suites) sits in
`docs/archive/superdev/` for reference only: not listed, not released, not tested, not shipped.
Editing a file here does NOT change the behavior of the currently loaded plugins: the injected manifest and the skill instructions active in a session were
frozen at install / session start and change only after the user **publishes**. This repo's own
`CLAUDE.md` files and `.claude/rules/` are dev-time orientation for editing the source, never
plugin inputs, never read at runtime.

They ship no application code: artifacts are markdown (skills/agents) + JSON (manifests) +
hook scripts (`viber` only). Editing markdown/JSON IS shipping - no build step, no
lint at any level, no test tooling inside any plugin. Contracts between files are enforced by
humans reading carefully.

All six plugins are **stack-agnostic on purpose**: skills read project-specific knowledge (test
framework, build tool, naming, how to launch the app) from the HOST project's `CLAUDE.md` /
`.claude/rules/`, never from plugin sources. Never bake ecosystem assumptions (dotnet, npm,
pytest) into skill prompts. Scope: this is about projects being planned/built, not the plugins'
own tooling - a plugin may depend on a specific tool for its own work when that is a deliberate,
documented choice (Node for superui's contrast checker, Python for superbiz's report builder,
playwright-cli for a viber opt-in switch), always behind an opt-in switch or a skip-with-note
fallback, always named in the owning plugin's node.

**DO NOT use ADR capture for this project.** The plugins are constantly refactored; do not write
ADRs here and do not suggest them.

## Layout (top level)

```
.claude-plugin/marketplace.json   Co-lists all six plugins by subdir source
superui/  supergh/  superfix/  superbiz/  supercc/  viber/    One dir per plugin
README.md            Catalog page; each plugin also has its own README.md
.github/             CI + release workflow (manual dispatch only, tag-driven)
.claude/rules/       Dev-time conventions for this repo
docs/archive/        Retired plugins kept for reference (superdev), never shipped
tests/               Dev-time regression suites for plugin scripts (outside every plugin)
docs/assets/         Images embedded in READMEs (e.g. viber-flow.svg)
.docs/               Dev-time notes/source material, never shipped, never read at runtime
```

Each plugin dir carries `.claude-plugin/plugin.json` (`skills[]` + optional `agents[]` = catalog
of record). `superfix` and `viber` carry `agents/`; `viber` carries `hooks/`.

## Versioning

Tag-driven, one shared namespace across all six plugins (`MAJOR.MINOR.PATCH`, no `v` prefix, seed
`0.1.0`). The only versioning workflow is `.github/workflows/release-version.yml` - a **manual**
`workflow_dispatch` (no automatic bump on push to main) running `.github/scripts/release.sh`,
which computes the next version, writes it into all six `plugin.json` files, commits, tags,
pushes, and publishes a GitHub Release. The tag is the source of truth; verify exact script
mechanics against `.github/scripts/release.sh` before restating them.

## Cross-plugin architecture invariants

- **Host-repo `docs/` is the one home for persisted, user-facing knowledge.**
  `docs/_specs/<stamp>_<slug>/` (viber's run
  directory: the plan, its `status.md`, its decomposition, the build's two QA documents and `work/`, the run's own
  notes and reports - committed, because a build resumes from them in another session or on another
  machine), `docs/specs/<stamp>_<slug>/` (viber again: what that run directory leaves behind once
  its `cleanup` switch archived it - the specification, carrying whatever the build delivered that
  it does not promise, and the QA documents, with the plan, the status file, the decomposition and
  the trail dropped, git being where their history already is),
  `docs/business/<slug>/` (superbiz's rendered report
  only), and `docs/adr/`, written by viber through a plan task - a host repo has one decision log.
  `supercc` writes no `docs/<layer>/` of its own and never
  will - its deliverable is the skill/agent file itself, not a record about it.
- **No plugin ever creates a plugin-named dot-dir in the host repo** (no `.superdev/`, no
  `.superui/`, etc). Only three host-repo locations are writable at a plugin's own choosing:
  `docs/<layer>/` (persisted knowledge), `.claude/` (user-owned config/rules), `.temp/<plugin>/`
  (every temporary artifact, grouped per plugin). A fourth is writable only because the HOST
  names it: the host's own e2e test dir, written by viber's `e2e-writer` under its user-run `e2e`
  skill, into the directory the host's instructions name and never a sibling it invented.
- **`viber` is the only manifest-bearing plugin.** It ships ONE injected `SessionStart` manifest
  (`hooks/content/manifest.md`, verbatim, once per session, `source == "resume"` excluded,
  fail-open: an empty or unreadable file injects nothing and leaves only the banner). It is not a
  dispatcher: it names no skill, no group and no chain, and routing is left to each skill's own
  CSO `description:`. The other five ship no manifest - there is nothing a dispatcher would add.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that
  path; adding a `hooks` field to `plugin.json` is a hard install error.
- **Script vs. fork.** A step collapses to a deterministic bundled script when it operates on a
  known, fixed tool/format (git, a basename, paths, globs); it stays an LLM fork when it must
  interpret heterogeneous, stack-specific output. A self-verifying script carries its I/O
  contract in its header comment and is TRUSTED by its caller - never re-verified or retried.
- **Shell-portable `!` preload commands.** The host shell varies (zsh/macOS, bash/Linux,
  bash-Git-Bash/Windows) and every inline `` !`…` `` preload is parsed by IT before reaching the
  script. NEVER leave a `?`/`*`/`[`-bearing argument unquoted: zsh's default `nomatch` aborts the
  whole command (killing the fork load with no input) where bash would silently pass it through.
  Single-quote such arguments. No PowerShell syntax anywhere.
- **Pre-approved bundled-script calls (preload and runtime).** A preload is permission-checked
  like any Bash call; a bare `Bash` allow does NOT cover it. Required: (1) `allowed-tools`
  carries a PATTERN entry for the preload; (2) the bundled script is invoked DIRECTLY, never
  through an interpreter - so it keeps its exec bit (`100755`) and its `#!/usr/bin/env bash`
  shebang. The same two requirements bind a runtime call - a bundled script a skill has the
  model run via the `Bash` tool mid-session, not as a preload: it is one literal line,
  `"${CLAUDE_PLUGIN_ROOT}/…/x.sh" <args>` (a `run.sh` call pipes its input through a heredoc on
  stdin instead of an arg), never prefixed with `bash`, never assigned to a variable, never
  preceded by `cd`, never chained with `;`; the skill declares one
  `Bash(${CLAUDE_PLUGIN_ROOT}/…/x.sh:*)` pattern per such script; the script itself keeps the
  same `100755` exec bit and `#!/usr/bin/env bash` shebang. Reason: the auto-mode permission
  classifier matches a command's literal prefix, so any other form of the same call - a
  different prefix, an added flag, an interpreter wrapper - is a new, unapproved
  classification.
- **Dispatch strength.** An orchestrator's dispatch passes only `model` on every call - the
  `Agent` tool takes no `effort` parameter, so the agent's frontmatter is the only place an
  effort is set.
- **Text is the product in THIS repo.** Skill, agent and reference markdown plus the JSON
  manifests are production code here, so no task that edits them ever skips its per-task review,
  however mechanical it looks. This line is the host declaration the planning track reads for
  that override:
  - viber: `implementor` never profiles a task touching this repo's markdown or `plugin.json` as
    mechanical/no-review; such a task gets at least the `sonnet` plus review profile, and
    `task-reviewer` gates it before `commit-task.sh`.
- **`allowed-tools` does NOT restrict the tool set** - it is a one-turn pre-approval only; every
  other tool stays callable and merely prompts the user if unlisted. A strictly read-only worker
  needs `disallowed-tools:` (bare names, never `Tool(pattern)`) PLUS a body line naming its only
  tools. The agent-side equivalent is the `tools:` frontmatter field. A skill that dispatches
  agents never carries `disallowed-tools:`: the removal holds for the whole session until the
  next user message, subagents included, so an agent dispatched in that turn starts without the
  tools and keeps that list for its whole run (harness: "Edit is disabled for this session, in
  subagents as well as here"). Such a skill states its limits in its body alone. A skill that both
  `!`-preloads a script and denies bare `Bash` is undefined behavior.
- **No orphan closing tag in a written file.** A writer agent sometimes ends a file it creates
  with a bare `</content>` - the closing tag of its own write call leaking into the value. It is
  an emission artifact, not content the agent chose, so the read-back guard every `Write`/`Edit`
  agent carries lowers the rate and never removes it. `tests/orphan-tags.test.ts` is the
  enforcement: it fails CI on any tracked file outside `docs/` holding a self-standing closing
  tag with no opener. Without it nothing catches one - the repo has no build and no lint - and
  one did ship, inside a format reference an agent reads as its authority.
- **Self-documentation.** Any skill add/remove/rename updates the owning plugin's
  `plugin.json` `skills[]`; any agent add/remove/rename updates that plugin's `agents[]`. A
  worker must NEVER appear in both. Update the owning `<plugin>/CLAUDE.md` (and this root file
  only when the change is repo-wide) in the same edit. A user-only command
  (`disable-model-invocation: true`) never participates in routing and stays out of any manifest
  - that gap is deliberate.

## Where contracts live

This file is orientation only. The authoritative contract of each skill is its own body
(`# Input contract` / `# Output format`); hook contracts live in `hooks/hooks.json` and the
header comments of `hooks/scripts/*.sh`.

## When editing

- **No source attribution.** Never add a "Sources" section, never name where knowledge came from
  (upstream repos, skills, courses, authors) - anywhere: skills, references, agents, CLAUDE.md,
  reports, chat answers.
- **Catalog/install layer** (`.claude-plugin/marketplace.json`, root `README.md`): keep changes
  minimal and structural. Renaming a plugin updates the marketplace manifest, that plugin's own
  `plugin.json`, and the root `README.md`.
- **Plugin internals**: obey the invariants above plus the plugin-specific ones in its own
  `<plugin>/CLAUDE.md`. Paths in each `plugin.json` are plugin-root-relative; hook commands use
  `${CLAUDE_PLUGIN_ROOT}`.

## Memory Layer

**Before working on an area, read its node first.**

| Node | Read when working on |
|---|---|
| `superui/CLAUDE.md` | the `pro-designer` skill (design/frontend advisory) |
| `supergh/CLAUDE.md` | GitHub/git skills - `gh` reference, operation executor, commits, issue/PR creation |
| `superfix/CLAUDE.md` | `code-auditor` and its five agents - the two-track investigation sweep |
| `superbiz/CLAUDE.md` | `idea-validator` - the side-project viability workflow |
| `supercc/CLAUDE.md` | `skill-designer` - authoring/refactoring/splitting/linting skills and agents |
| `viber/CLAUDE.md` | `setup` / `idea` / `planner` / `implementor` / `fixer` / `tdd` / `e2e` / `memory` / `rules`, their twelve agents, the run directory with its decomposition, QA documents and trail, how a build resumes and how it is archived, the seven plugin scripts, the QA format, rule-admission and node-doctrine references, the config switches and the plan gate |
| `tests/CLAUDE.md` | any `*.test.ts` under `tests/` - harness contract, cross-platform rules |
