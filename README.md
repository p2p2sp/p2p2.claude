# superdev + superui

Two independent, self-contained Claude Code plugins, each a cohesive ecosystem driven by its own injected
dispatcher manifest. Skills are grouped by a short prefix and compose through CSO + documented natural chains.

- **superdev** (`./superdev`) — the agentic-development ecosystem: project memory, planning, the
  implementation pipeline, and GitHub skills.
- **superui** (`./superui`) — the design / frontend ecosystem: the framework-agnostic design system, target
  adaptation, web preview, the UI-edit guardian, and a shareable-artifact publisher.

This repository is the **marketplace catalog** for both: each plugin lives in its own subdirectory, and the
root `.claude-plugin/marketplace.json` co-lists them by `source: "./superdev"` and `source: "./superui"`.
Each plugin injects its own manifest and is **independently installable** — install one, the other, or both;
neither declares the other as a dependency.

## Install

```
/plugin marketplace add https://github.com/p2p2sp/p2p2.claude
/plugin install superdev
/plugin install superui
```

Both plugins are self-contained — neither declares any dependencies. Installing one gives you that whole
ecosystem: its single injected manifest routes every request to the right skill / chain. Install only the
one(s) you need.

## superdev skill groups

| Prefix | Domain | Skills |
| --- | --- | --- |
| — | Environment bootstrap (user-only) | `setup` — run `/setup` once to seed `.temp/` + `.superdev/`, copy the `.gitignore` / `.claude/settings.json` templates, and choose the opt-in switches written to `.superdev/config.yml` |
| `mem-` | Project memory (agent-facing) | `mem-layers` (CLAUDE.md cascade), `mem-rules` (`.claude/rules/` layer) |
| `doc-` | End-user documentation | `doc-help` (end-user product help → `.superdev/help/`) |
| `dev-` | Development pipeline + diagnostics/specs | Skills: `dev-interview`, `dev-superplan`, `dev-plan-reviewer`, `dev-orchestrator`, `dev-agent-adr-recorder`, `dev-agent-decomposer`, `dev-agent-runner`, `dev-agent-final-reviewer`, `dev-agent-plan-auditor`, `dev-agent-smoke`, `dev-tdd`, `dev-debug`, `dev-spec`. Plugin agents (per-task pipeline workers): `dev-coder`, `dev-task-reviewer`, `dev-improver` |
| `gh-` | GitHub | `gh-cli`, `gh-cli-executor`, `gh-commit`, `gh-agent-committer`, `gh-issue`, `gh-pr` |

## superui skill groups

| Prefix | Domain |
| --- | --- |
| `ui-` | Design / frontend — reverse-engineer the framework-agnostic L1 design system, author net-new components into it, adapt it to one concrete target (pure-css / tailwind / react-shadcn / react-mui / flutter), render zero-build static HTML previews, and bind UI edits to documented tokens / components |
| `cc-` | Claude Code platform — opt-in, main-session publisher of one self-contained `.html`/`.htm`/`.md` file as a shareable Claude Code Artifact; validates single-file / no-external-ref / size, asks first, falls back to the local path (fail-open) |

## How it works

- **Each plugin injects its own manifest** (`<plugin>/hooks/content/manifest.md`) once per session and routes
  across that plugin's domains (instruction priority, the 1% rule, decision flow, the skill catalog, the
  natural chains, and red flags). Install both and both manifests coexist.
- **Skills auto-engage via CSO** — each skill's `description:` is its trigger, in any language.
- **Opt-in per project (superdev)** — `/setup` writes `.superdev/config.yml` (two switches: `adr`,
  `rules_improver`). The routing manifest is always injected as-is; a disabled switch only skips its
  `dev-orchestrator` pipeline step (`dev-agent-adr-recorder` / the `dev-improver` agent); both switches default off (a missing config = both off,
  fail-closed), so these two optional steps run only once you enable them via `/setup`.
- **The implementation pipeline is file-based (superdev)**: `dev-orchestrator` dispatches forked executors
  that hand state through files and reply with a 3-line status, keeping the main context lean.
- **Planning always happens in plan mode (superdev).** Whatever mode you start in, superdev enters plan mode
  before drafting a plan (a hook denies writing a plan file outside plan mode), so the plan-review gate runs
  every time — the planning pipeline behaves the same regardless of the mode you started in.

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog (co-lists superdev by "./superdev" + superui by "./superui")
superdev/            The superdev plugin
  .claude-plugin/plugin.json   Plugin manifest (skills[])
  hooks/             Injected manifest + SessionStart + two PreToolUse plan-gate hooks
  skills/            Skills grouped by prefix (mem- / doc- / dev- / gh-)
superui/             The superui plugin
  .claude-plugin/plugin.json   Plugin manifest (skills[])
  hooks/             Injected manifest + SessionStart (no plan gate)
  skills/            Skills grouped by prefix (ui- / cc-)
.github/             CI workflows + the shared release.sh version-bump script (syncs both manifests)
.claude/rules/       Development-only conventions for this repo
```

## Versioning

Versions are git tags in `MAJOR.MINOR.PATCH` form (no `v` prefix), starting at `0.1.0`. The highest tag
is the source of truth; both plugins share one version namespace. CI mirrors the tag into each plugin's
`plugin.json` `version` field (`superdev/` and `superui/`), so `/plugin update` ships a new version on each
bump:

- **Automatic** — every push to `main` runs **Auto patch version**
  (`.github/workflows/auto-version.yml`), which bumps the **patch** number, syncs it into both `plugin.json`
  files, commits (`chore(bump): …`), and pushes the matching tag. The job guards against its own bump commit
  (`if: !startsWith(head_commit.message, 'chore(bump)')`) so the push does not loop.
- **Manual** — run **Manual version bump** (`.github/workflows/release-version.yml`) from the **Actions**
  tab and pick `major`, `minor`, or `patch` to cut a larger release on demand.

Both delegate to `.github/scripts/release.sh`, which computes the next version from the tags and performs
the sync + tag + push, then publishes a **GitHub Release** whose notes are built from the commits since the
previous tag (grouped by conventional type) with GitHub's auto-generated notes appended.
