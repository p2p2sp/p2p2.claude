# superdev + superui + supergh

Three independent, self-contained Claude Code plugins, each a cohesive ecosystem driven by its own injected
dispatcher manifest. Skills are grouped by a short prefix and compose through CSO + documented natural chains.

- **superdev** (`./superdev`) — the agentic-development ecosystem: project memory, planning, and the
  implementation pipeline.
- **superui** (`./superui`) — the design / frontend ecosystem: the framework-agnostic design system, target
  adaptation, web preview, the UI-edit guardian, and a shareable-artifact publisher.
- **supergh** (`./supergh`) — the GitHub / git ecosystem: the `gh` CLI/REST/GraphQL reference, a
  fully-specified operation executor, Conventional-Commits commits, and template-driven issue / PR creation.

This repository is the **marketplace catalog** for all three: each plugin lives in its own subdirectory, and
the root `.claude-plugin/marketplace.json` co-lists them by `source: "./superdev"`, `source: "./superui"`,
and `source: "./supergh"`. Each plugin injects its own manifest and is **independently installable** —
install any subset; none declares another as a dependency.

## Install

```
/plugin marketplace add https://github.com/p2p2sp/p2p2.claude
/plugin install superdev
/plugin install superui
/plugin install supergh
```

Every plugin is self-contained — none declares any dependencies. Installing one gives you that whole
ecosystem: its single injected manifest routes every request to the right skill / chain. Install only the
one(s) you need.

## superdev skills

| Area | Skills |
| --- | --- |
| Entry interview & environment | `superdev` — the always-on entry skill named after the plugin; interviews you to map the design before any plan/code, then hands off to planning. `setup` — run `/setup` once to seed `.temp/` + `.superdev/`, copy the `.gitignore` / `.claude/settings.json` templates, and choose the opt-in switches written to `.superdev/config.yml` |
| Project memory (agent-facing) | `memory-layers` (CLAUDE.md cascade), `memory-rules` (`.claude/rules/` layer) |
| End-user documentation | `help-writer` (end-user product help → `.superdev/help/`) |
| Development pipeline + diagnostics/specs | Skills: `superplan`, `superplan-reviewer`, `orchestrator`, `agent-adr-recorder`, `agent-decomposer`, `agent-runner`, `agent-final-reviewer`, `agent-plan-auditor`, `tdd`, `debug`, `spec-writer`. Plugin agents (per-task pipeline workers): `coder`, `task-reviewer`, `improver` |

## supergh skills

Flat-named (single-domain plugin, no group prefix):

| Skill | Role |
| --- | --- |
| `cli` | GitHub CLI reference — which layer (`gh` subcommand / `gh api` REST / `gh api graphql`) a given operation needs; reference-only, never executes |
| `cli-executor` | Fork that runs ONE fully-specified gh/REST/GraphQL operation out of the main context and returns a single tagged line |
| `commit` | Main-context commit-context resolver — gathers the file set (session / `all` / `staged`) and delegates Conventional-Commits authoring to `agent-committer` |
| `agent-committer` | Fork that stages, reads the staged diff, authors the commit subject, and commits (invoked only by `commit`) |
| `create-issue` | Interactive, template-driven GitHub issue creation (`gh issue create`) |
| `create-pr` | Interactive, template-driven draft pull-request creation (`gh pr create --draft`) |

## superui skills

Flat-named (single-domain plugin, no group prefix):

| Skill | Role |
| --- | --- |
| `extract-design-system` | Reverse-engineer a framework-agnostic L1 design system from screenshots / a URL — DTCG tokens, foundations, pure-CSS `tokens.css`, tiered component catalog |
| `create-component` | Author a net-new component into the existing L1 system — interactive draft → pure-CSS preview → write spec into the catalog |
| `adapt-target` | Adapt the agnostic L1 system to ONE concrete UI target (pure-css / tailwind / react-shadcn / react-mui / flutter) — per-target theme + component mapping |
| `web-preview` | Render zero-build, self-contained static HTML preview pages for a web target |
| `design-guardian` | Bind UI edits to the documented tokens / components / foundations (auto-triggered before UI implementation work) |
| `cc-artifact` | Claude Code platform — opt-in, main-session publisher of one self-contained `.html`/`.htm`/`.md` file as a shareable Claude Code Artifact; validates single-file / no-external-ref / size, asks first, falls back to the local path (fail-open) |

## How it works

- **Each plugin injects its own manifest** (`<plugin>/hooks/content/manifest.md`) once per session and routes
  across that plugin's domains (instruction priority, the 1% rule, decision flow, the skill catalog, the
  natural chains, and red flags). Install several and their manifests coexist.
- **Skills auto-engage via CSO** — each skill's `description:` is its trigger, in any language.
- **Opt-in per project (superdev)** — `/setup` writes `.superdev/config.yml` (two switches: `adr`,
  `rules_improver`). The routing manifest is always injected as-is; a disabled switch only skips its
  `orchestrator` pipeline step (`agent-adr-recorder` / the `improver` agent); both switches default off (a missing config = both off,
  fail-closed), so these two optional steps run only once you enable them via `/setup`.
- **The implementation pipeline is file-based (superdev)**: `orchestrator` dispatches forked executors
  that hand state through files and reply with a 3-line status, keeping the main context lean.
- **Planning always happens in plan mode (superdev).** Whatever mode you start in, superdev's planning skill
  enters plan mode before drafting a plan, so the plan-review gate runs
  every time — the planning pipeline behaves the same regardless of the mode you started in.

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog (co-lists superdev "./superdev" + superui "./superui" + supergh "./supergh")
superdev/            The superdev plugin
  .claude-plugin/plugin.json   Plugin manifest (skills[])
  hooks/             Injected manifest + SessionStart + two PreToolUse plan-gate hooks
  skills/            Skills (bare-named by functional role; `agent-` = fork-only worker)
superui/             The superui plugin
  .claude-plugin/plugin.json   Plugin manifest (skills[])
  hooks/             Injected manifest + SessionStart (no plan gate)
  skills/            Flat-named skills (extract-design-system, create-component, adapt-target, web-preview, design-guardian, cc-artifact)
supergh/             The supergh plugin
  .claude-plugin/plugin.json   Plugin manifest (skills[])
  hooks/             Injected manifest + SessionStart (no plan gate)
  skills/            Flat-named skills (cli, cli-executor, commit, agent-committer, create-issue, create-pr)
.github/             CI workflows + the shared release.sh version-bump script (syncs all three manifests)
.claude/rules/       Development-only conventions for this repo
```

## Versioning

Versions are git tags in `MAJOR.MINOR.PATCH` form (no `v` prefix), starting at `0.1.0`. The highest tag
is the source of truth; all three plugins share one version namespace. CI mirrors the tag into each plugin's
`plugin.json` `version` field (`superdev/`, `superui/`, and `supergh/`), so `/plugin update` ships a new
version on each bump:

- **Automatic** — every push to `main` runs **Auto patch version**
  (`.github/workflows/auto-version.yml`), which bumps the **patch** number, syncs it into all three
  `plugin.json` files, commits (`chore(bump): …`), and pushes the matching tag. The job guards against its own bump commit
  (`if: !startsWith(head_commit.message, 'chore(bump)')`) so the push does not loop.
- **Manual** — run **Manual version bump** (`.github/workflows/release-version.yml`) from the **Actions**
  tab and pick `major`, `minor`, or `patch` to cut a larger release on demand.

Both delegate to `.github/scripts/release.sh`, which computes the next version from the tags and performs
the sync + tag + push, then publishes a **GitHub Release** whose notes are built from the commits since the
previous tag (grouped by conventional type) with GitHub's auto-generated notes appended.
