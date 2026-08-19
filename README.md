# P2P2 Claude Code Plugins

Five independent, self-contained Claude Code plugins. `superdev` is a cohesive ecosystem driven by its own injected dispatcher manifest; `superui`, `supergh`, `superfix` and `superbiz` ship no manifest and no hooks (`supergh` routes its skills purely via CSO descriptions; `superui` routes `pro-designer` via CSO and reaches `design-extractor` as a user-only command with an internal fork worker behind it; `superfix` is a single user-invoked skill; `superbiz`'s three entry skills route via CSO descriptions, each backed by an internal fork worker). Skills compose through CSO + documented natural chains.

- **superdev** - a configurable agentic-development ecosystem: project memory, planning, and the implementation pipeline.
- **superui** - the design / frontend ecosystem, pairing Claude Code CLI and Claude Design: `/superui:design-extractor` turns a folder of UI screenshots into the pure, platform-neutral design system (`DESIGN.md`) at `docs/design-system/`, then loops to chain `/superui:component-extractor` per platform (`web-app` / `mobile` / `website`) for that platform's component/pattern bundle - Claude Design consumes both to build live, inline-styled Design Components, backed by a professional UI/UX standards advisor. No manifest, no hooks - `pro-designer` routes via its CSO description; `design-extractor` is a user-only command, `component-extractor` is model-invocable behind a guarded CSO description so the chain can reach it, and can also be run standalone. Requires Node.js >= 22.6, nothing else - see `superui/README.md`.
- **supergh** - the GitHub / git ecosystem: the `gh` CLI/REST/GraphQL reference, a fully-specified operation executor, Conventional-Commits commits, and template-driven issue / PR creation. No manifest, no hooks - skills route via their CSO descriptions.
- **superfix** - prioritized multi-agent codebase investigation: the `/superfix:code-auditor` command sweeps a repo with cheap triage agents, scores Impact × Opportunity, and sends frontier investigators only into the hotspots. No manifest, no hooks - one user-invoked skill.
- **superbiz** - the business validation / product roadmap ecosystem: `business-idea-validator` grounds a BUILD / PIVOT / DROP verdict on a side-income autopilot product idea - judged as a supplementary income source that runs with minimal owner time after launch, not as a venture-scale startup - in deep web research for a real comparative baseline, and writes the report to `docs/business/<idea-slug>/`; `product-phase-roadmap` turns a validated idea (typically that report) into phased execution documentation - landing page + waitlist through MVP to full-scope growth - at `docs/business/<idea-slug>/plan/`; `council-this` runs a decision with real stakes through a council of five advisor agents and writes the chairman verdict to `docs/business/<decision-slug>/`. Each entry hands off to its own fork worker (`business-idea-validator-researcher`, `product-phase-roadmap-writer`, `council-this-chairman`) that does the work out of the main context, and the validator ends by offering to chain straight into the roadmap. No manifest, no hooks - all three entry skills route via CSO descriptions.

Each is **independently installable** - install any subset; none declares another as a dependency.

## Install

Run these from a terminal to install at **user scope** - available across all your projects, not just whichever repo you happen to be in:

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superdev@p2p2 --scope user
claude plugin install superui@p2p2 --scope user
claude plugin install supergh@p2p2 --scope user
claude plugin install superfix@p2p2 --scope user
claude plugin install superbiz@p2p2 --scope user
```

`--scope user` is already the default for both commands (writes to `~/.claude/settings.json`); it's spelled out above for clarity. Inside an active Claude Code session you can instead run the interactive `/plugin marketplace add https://github.com/p2p2sp/p2p2.claude` + `/plugin install superdev@p2p2` and pick **User scope** when prompted - `project` / `local` scope installs the plugin only for the current repo.

`superui` and `superfix` additionally need Node.js >= 22.6 on the machine running them (their bundled scripts are TypeScript run directly by Node's native type stripping - no packages, no build step) - see `superui/README.md`, or run `/superui:setup` after install to diagnose.

Every plugin is self-contained - none declares any dependencies. Installing one gives you that whole ecosystem: `superdev` routes every request through its injected manifest; `supergh`, `superfix` and `superbiz` route purely via skill descriptions; `superui` routes `pro-designer` the same way while `design-extractor` is a user-only command. Install only the one(s) you need.

## Super Dev

Every request enters through the same interview, then the user picks one of two tracks at an explicit gate - Simple (plan straight away) or Super (spec first, then plan). Both meet the same `ExitPlanMode` hook, and both end in the same Close Out:

![superdev flow - the Simple track and the Super track](docs/assets/superdev-flow.svg)

| Area | Skills |
| --- | --- |
| Entry interview & environment | `superdev` - the always-on entry skill named after the plugin; interviews you to map the design before any plan/code, then gates on the track choice. `setup` - run `/setup` once to seed `.temp/`, copy the `.gitignore` / `.claude/settings.json` templates, add the `docs/.workflows/**` linguist rule to `.gitattributes`, and choose the opt-in switches written to `.claude/superdev.yml` (`adr`, `rules`, `memory`, `docs` - all `false` by default) |
| Project memory & product docs | `superdev-memory` + `superdev-memory-writer` (CLAUDE.md cascade), `superdev-rules` + `superdev-rules-writer` (`.claude/rules/` layer), `superdev-docs` + `superdev-docs-writer` (user-facing product docs in `docs/product/<feature-slug>.md`, treated as user intent - divergence is surfaced, never silently overwritten). Run them directly any time; the writers are also invoked at Close Out on both tracks when the matching config switch is on |
| Simple track | `simpleplan` + `simpleplan-reviewer` (plan carries its own DoD - no spec), then `simplebuild` driving `simplebuild-implementor` (implements, self-reviews) and `simplebuild-reviewer` (one final review); Close Out also runs `superbuild-adr` when `adr: true`, so an architectural decision taken on this track is recorded too |
| Super track | `superspec` + `superspec-reviewer` (the `What & Why` spec; `superspec-refine` to evolve an existing one), then `superplan` + `superplan-reviewer`, then `superbuild` driving `superbuild-adr` (only when `adr: true`; writes `docs/adr/<YYYYMMDDHHMMSS>-<title-slug>.md`, and no file at all when the plan commits to no architectural decision), `superbuild-task-coder` + `superbuild-task-reviewer` per task, and `superbuild-reviewer-spec` → `superbuild-reviewer-code` at the end |
| Cross-cutting | `tdd` (Red-Green-Refactor discipline on any task marked `TDD: required`), `simpledebug` (trace the flow, prove the diagnosis with a failing test, hand the fix plan to `simpleplan`) |

The reviewers, coders, and writers above run as forks in their own context - the track drives them for you; you never invoke them by hand.

## Super GH

Flat-named (single-domain plugin, no group prefix). No manifest, no hooks - skills route via their CSO `description:`:

| Skill | Role |
| --- | --- |
| `cli` | GitHub CLI reference - which layer (`gh` subcommand / `gh api` REST / `gh api graphql`) a given operation needs; reference-only, never executes |
| `cli-executor` | Fork that runs ONE fully-specified gh/REST/GraphQL operation out of the main context and returns a single tagged line |
| `commit` | Haiku fork that gathers the change context (recent-commit style + `git status`/diff for `all` / `staged` / a path), authors the Conventional-Commits message, commits via the self-verifying `commit.sh`, then self-checks that HEAD moved |
| `create-issue` | Interactive, template-driven GitHub issue creation (`gh issue create`) |
| `create-pr` | Interactive, template-driven draft pull-request creation (`gh pr create --draft`) |

## Super UI

Flat-named (single-domain plugin, no group prefix). No manifest, no hooks - `pro-designer` routes via its CSO
`description:`; `design-extractor` is a user-only command, `component-extractor` is model-invocable behind
its own guarded CSO `description:` (so `design-extractor`'s ending loop can chain into it), and both carry an
internal fork worker behind them. Requires Node.js >= 22.6, nothing else - run `/superui:setup` to verify.
Full detail: `superui/README.md`.

| Skill | Role |
| --- | --- |
| `pro-designer` | Professional UI/UX design standards - visual hierarchy, color discipline, type ramps, 4/8pt spacing, accessibility, component states, form-validation UX, and evidence-based conversion psychology with anti-dark-pattern rules; fires when creating, styling, or reviewing any interface; bundles topic reference docs only - its WCAG contrast script lives at the plugin-root shared `scripts/`, not inside the skill |
| `setup` | User-only environment diagnostic (`/superui:setup`) - reports Node.js runtime status; installs nothing |
| `design-extractor` | User-only (`/superui:design-extractor <screenshots-dir> [<target>]`) - turns a folder of UI screenshots into the pure, platform-neutral design system alone at `docs/design-system/` (or `docs/design-system/<target>/` for a monorepo shipping one bundle per app): `DESIGN.md` (YAML front-matter tokens + prose body). Ends by looping to offer chaining `component-extractor` per platform |
| `component-extractor` | Model-invocable via a guarded CSO description, also user-runnable (`/superui:component-extractor <screenshots-dir> <platform> [<target>]`, `platform`: `web-app` \| `mobile` \| `website`) - reads an existing `DESIGN.md` and builds that platform's component/pattern bundle at `docs/design-system/[<target>/]<platform>/`: the `DESIGN.components.md` / `DESIGN.patterns.md` spec satellites and canonical screens. Runs any number of times, one platform per run, chained or standalone |

superui pairs Claude Code CLI (measurement, agentic fan-out) with Claude Design (live, inline-styled Design
Components) through a two-stage pipeline. `design-extractor` dispatches one agent - `source-scout` (source
mapping) - then hands off to its internal fork worker `design-extractor-builder`, which dispatches
`foundation-analyst` (per-foundation measurement) and `design-synthesizer` (proposed-token synthesis for
gaps) to produce `DESIGN.md` alone. `component-extractor` dispatches `source-scout` again plus
`component-scout` (component/pattern inventory, gap-checked against a per-platform reference checklist), then
hands off to its own internal fork worker `component-extractor-builder`, which dispatches `spec-writer`
(observed specs), `component-synthesizer` (invented specs for checklist gaps, marked
`> NEEDS ATTENTION`), and `bundle-reviewer` (bundle review) - see `superui/README.md` and `superui/CLAUDE.md`
for the full pipeline.

## Super Fix

Single user-invoked skill (no manifest, no hooks); runs only via `/superfix:code-auditor`:

| Skill | Role |
| --- | --- |
| `code-auditor` | Prioritized multi-agent codebase investigation - sweeps every file, scores each one Impact × Opportunity, gates to the hotspots, sends deep investigators only there, and synthesizes a verified, severity-ranked hotlist. User-only (`disable-model-invocation`), so nothing auto-routes to it |

## Super Biz

Flat-named (single-domain plugin, no group prefix). No manifest, no hooks - the three entry skills route via their CSO `description:`, each backed by a fork worker; the council fork additionally dispatches five persona agents:

| Skill | Role |
| --- | --- |
| `business-idea-validator` | Interactive entry - resolves the idea, the accepted post-launch maintenance hours and the target supplementary income with the user, then hands one capture file to its fork worker. On the finished report it runs a mandatory council round (`council-this-chairman`, no opt-in) and relays both verdicts, then always offers (`AskUserQuestion`) to chain straight into `product-phase-roadmap` |
| `business-idea-validator-researcher` | Fork - does the deep web research for a real competitive baseline and writes the BUILD / PIVOT / DROP report, judging the idea as a side-income autopilot product, to `docs/business/<idea-slug>/` |
| `product-phase-roadmap` | Interactive entry - resolves the report (often the validator's own output), the slug, and every open decision with the user, then hands one capture file to its fork worker |
| `product-phase-roadmap-writer` | Fork - refreshes best practices from the web and writes the phased execution documentation (landing page + waitlist through MVP to full-scope growth) to `docs/business/<idea-slug>/plan/` |
| `council-this` | Interactive entry - frames the decision and its stakes with the user, then hands one capture file to its fork worker |
| `council-this-chairman` | Fork - convenes the five council persona agents in parallel and writes the chairman verdict to `docs/business/<decision-slug>/` |
