# superdev

A single, self-contained Claude Code plugin: one cohesive agentic-development ecosystem driven by one
injected dispatcher manifest. Skills are grouped by a short prefix and compose through CSO + documented
natural chains (including across domains).

This repository is **both the plugin and its marketplace catalog**: the plugin lives at the repo root, and
`.claude-plugin/marketplace.json` lists it by `source: "./"`.

## Install

```
/plugin marketplace add https://github.com/p2p2sp/p2p2.claude
/plugin install superdev
```

`superdev` is self-contained — it declares no dependencies. Installing it gives you the whole ecosystem:
the single injected manifest routes every request to the right skill / chain.

## Skill groups

| Prefix | Domain | Skills |
| --- | --- | --- |
| — | Environment bootstrap (user-only) | `setup` — run `/setup` once to seed `.temp/` + `.superdev/`, copy the `.gitignore` / `.claude/settings.json` templates, and choose the opt-in switches written to `.superdev/config.yml` |
| `mem-` | Project memory | `mem-claudemd` (CLAUDE.md cascade), `mem-rules` (`.claude/rules/` layer) |
| `dev-` | Development pipeline + diagnostics/specs | `dev-interview`, `dev-extraplan`, `dev-plan-reviewer`, `dev-orchestrator`, `dev-adr-analyzer`, `dev-decomposer`, `dev-coder`, `dev-runner`, `dev-task-reviewer`, `dev-final-reviewer`, `dev-plan-auditor`, `dev-smoke`, `dev-improver`, `dev-tdd`, `dev-debug`, `dev-spec` |
| `ui-` | Design / frontend | `ui-extract`, `ui-component-creator`, `ui-adapt`, `ui-web-preview`, `ui-guardian` |
| `gh-` | GitHub | `gh-cli`, `gh-cli-executor`, `gh-commit-context`, `gh-committer`, `gh-issue`, `gh-pr` |
| `cc-` | Claude Code platform | `cc-artifact` — opt-in, main-session publisher of one self-contained `.html`/`.htm`/`.md` file as a shareable Claude Code Artifact; validates single-file / no-external-ref / size, asks first, falls back to the local path (fail-open) |

## How it works

- **One injected manifest** (`hooks/content/manifest.md`) is force-injected once per session and routes
  across all domains (instruction priority, the 1% rule, decision flow, the skill catalog, the natural
  chains, and red flags).
- **Skills auto-engage via CSO** — each skill's `description:` is its trigger, in any language.
- **Opt-in per project** — `/setup` writes `.superdev/config.yml` (four switches: `adr`, `artifacts`,
  `rules_improver`, `ui`). A disabled area is dropped from the injected manifest and skipped by
  the pipeline; a missing config means everything is enabled, so superdev works fully out of the box.
- **The implementation pipeline is file-based**: `dev-orchestrator` dispatches forked executors that hand
  state through files and reply with a 3-line status, keeping the main context lean.
- **The planning pipeline works the same in plan mode and accept-edits mode.**

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog (lists superdev by source "./")
  plugin.json        Plugin manifest (skills[])
hooks/               One injected manifest + two hook scripts
skills/              Skills grouped by prefix (mem- / dev- / ui- / gh- / cc-)
.github/             CI workflows + the shared release.sh version-bump script
.claude/rules/       Development-only conventions for this repo
```

## Versioning

Versions are git tags in `MAJOR.MINOR.PATCH` form (no `v` prefix), starting at `0.1.0`. The highest tag
is the source of truth; CI mirrors it into `plugin.json`'s `version` field, so `/plugin update` ships a
new version on each bump:

- **Automatic** — every push to `main` runs **Auto patch version**
  (`.github/workflows/auto-version.yml`), which bumps the **patch** number, syncs it into `plugin.json`,
  commits (`chore(release): … [skip ci]`), and pushes the matching tag.
- **Manual** — run **Manual version bump** (`.github/workflows/release-version.yml`) from the **Actions**
  tab and pick `major`, `minor`, or `patch` to cut a larger release on demand.

Both delegate to `.github/scripts/release.sh`, which computes the next version from the tags and performs
the sync + tag + push.
