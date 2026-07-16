# P2P2 Claude Code Plugins

Four independent, self-contained Claude Code plugins. `superdev` and `superui` are cohesive ecosystems, each driven by its own injected dispatcher manifest; `supergh` and `superfix` ship no manifest and no hooks (`supergh` routes its GitHub skills purely via CSO descriptions; `superfix` is a single user-invoked skill). Skills compose through CSO + documented natural chains.

- **superdev** — a configurable agentic-development ecosystem: project memory, planning, and the implementation pipeline.
- **superui** — the design / frontend ecosystem: a framework-agnostic design system extracted from screenshots or designed from intent, enforced on every UI task, and backed by a professional UI/UX standards advisor. Requires Python 3 + `pip install pillow numpy pyyaml` — see `superui/README.md`.
- **supergh** — the GitHub / git ecosystem: the `gh` CLI/REST/GraphQL reference, a fully-specified operation executor, Conventional-Commits commits, and template-driven issue / PR creation. No manifest, no hooks — skills route via their CSO descriptions.
- **superfix** — prioritized multi-agent codebase investigation: the `/superfix:code-auditor` command sweeps a repo with cheap `scout` agents, scores Impact × Opportunity, and sends frontier `detective` agents only into the hotspots. No manifest, no hooks — one user-invoked skill.

Each is **independently installable** — install any subset; none declares another as a dependency.

## Install

Run these from a terminal to install at **user scope** — available across all your projects, not just whichever repo you happen to be in:

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superdev@p2p2 --scope user
claude plugin install superui@p2p2 --scope user
claude plugin install supergh@p2p2 --scope user
claude plugin install superfix@p2p2 --scope user
```

`--scope user` is already the default for both commands (writes to `~/.claude/settings.json`); it's spelled out above for clarity. Inside an active Claude Code session you can instead run the interactive `/plugin marketplace add https://github.com/p2p2sp/p2p2.claude` + `/plugin install superdev@p2p2` and pick **User scope** when prompted — `project` / `local` scope installs the plugin only for the current repo.

`superui` additionally needs Python 3 + `pip install pillow numpy pyyaml` on the machine running it — see `superui/README.md` for the full requirements, or run `/superui:setup` after install to diagnose.

Every plugin is self-contained — none declares any dependencies. Installing one gives you that whole ecosystem: `superdev` / `superui` route every request through their injected manifest, while `supergh` / `superfix` route purely via skill descriptions. Install only the one(s) you need.

## Super Dev

| Area | Skills |
| --- | --- |
| Entry interview & environment | `superdev` — the always-on entry skill named after the plugin; interviews you to map the design before any plan/code, then hands off to planning. `setup` — run `/setup` once to seed `.temp/` + `.superdev/`, copy the `.gitignore` / `.claude/settings.json` templates, seed `.claude/rules/_superdev.md` (a frozen pointer to the manifest's mandatory rules), and choose the opt-in switches written to `.superdev/config.yml` |
| Project memory (agent-facing) | `memory-layers` (CLAUDE.md cascade), `memory-rules` (`.claude/rules/` layer) |
| End-user documentation | `help-writer` (end-user product help → `.superdev/help/`) |
| Development pipeline + diagnostics/specs | Skills: `superplan`, `superplan-reviewer`, `superbuild`, `superbuild-adr`, `superbuild-decomposer`, `superbuild-runner`, `superbuild-reviewer`, `superbuild-reviewer-plan`, `tdd`, `simpledebug`, `superspec`, `superspec-reviewer`. Plugin agents (per-task pipeline workers): `coder`, `task-reviewer`, `improver` |

## Super GH

Flat-named (single-domain plugin, no group prefix). No manifest, no hooks — skills route via their CSO `description:`:

| Skill | Role |
| --- | --- |
| `cli` | GitHub CLI reference — which layer (`gh` subcommand / `gh api` REST / `gh api graphql`) a given operation needs; reference-only, never executes |
| `cli-executor` | Fork that runs ONE fully-specified gh/REST/GraphQL operation out of the main context and returns a single tagged line |
| `commit` | Haiku fork that gathers the change context (recent-commit style + `git status`/diff for `all` / `staged` / a path), authors the Conventional-Commits message, commits via the self-verifying `commit.sh`, then self-checks that HEAD moved |
| `create-issue` | Interactive, template-driven GitHub issue creation (`gh issue create`) |
| `create-pr` | Interactive, template-driven draft pull-request creation (`gh pr create --draft`) |

## Super UI

Flat-named (single-domain plugin, no group prefix). Requires Python 3 + `pip install pillow numpy
pyyaml` — run `/superui:setup` to verify. Full detail: `superui/README.md`.

| Skill | Role |
| --- | --- |
| `design-system-extractor` | The measurement head — reverse-engineer a framework-agnostic design system from UI screenshots via a multi-agent pipeline — DTCG tokens (`dtcg.yml`), `DESIGN.md`, pure-CSS `tokens.css`, component/pattern specs, and an HTML documentation site (per-foundation/component/pattern sheets + `index.html`) |
| `design-system-creator` | The creative head — designs a NEW design system from a prose interview (product, audience, mood) plus optional inspiration images (hints, never canon); gates on the user's approval of the direction before generating anything |
| `design-system-completer` | Opt-in gap-completion — validates an existing extracted/designed system for what could not be measured/covered and, only with explicit per-gap approval, synthesizes the missing pieces with marked provenance |
| `design-system-guardian` | Enforces the project's design system on every UI task (create, style, review) — mandates reading `DESIGN.md`'s agent rules + the touched component/pattern specs, tokens-only values, no inventions beyond spec, and a post-generation self-check; silently stands down when `.superui/design-system/` does not exist |
| `pro-designer` | Professional UI/UX design standards — visual hierarchy, 60-30-10 color discipline, type ramps, 4/8pt spacing, accessibility, component states, form-validation UX, and evidence-based conversion psychology with anti-dark-pattern rules; fires when creating, styling, or reviewing any interface; bundles topic reference docs + a WCAG contrast script |
| `setup` | User-only environment diagnostic (`/superui:setup`) — reports Python interpreter + module status; installs nothing |
| `design-system-generator` (internal) | The shared mechanical artifact tail invoked by the extractor and the creator — not directly invocable |

## Super Fix

Single user-invoked skill (no manifest, no hooks); runs only via `/superfix:code-auditor`:

| Component | Role |
| --- | --- |
| `code-auditor` (skill) | Prioritized multi-agent codebase investigation — sweep every file, score Impact × Opportunity, gate to the hotspots, dispatch deep investigators, synthesize a verified, severity-ranked hotlist. User-only (`disable-model-invocation`) |
| `scout` (agent) | Cheap, fast triage scorer — rates one file (or a small batch) for Impact and Opportunity 1-5; spawn many in parallel during the sweep |
| `detective` (agent) | Frontier-model deep investigator — hunts the actual issue in one hotspot, verifies it on a clean checkout, writes a structured finding; spawn few |
