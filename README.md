# superdev + superui + supergh + superfix

Four independent, self-contained Claude Code plugins. `superdev` and `superui` are cohesive ecosystems, each driven by its own injected dispatcher manifest; `supergh` and `superfix` ship no manifest and no hooks (`supergh` routes its GitHub skills purely via CSO descriptions; `superfix` is a single user-invoked skill). Skills compose through CSO + documented natural chains.

- **superdev** (`./superdev`) — a configurable agentic-development ecosystem: project memory, planning, and the implementation pipeline.
- **superui** (`./superui`) — the design / frontend ecosystem: the framework-agnostic design system, target adaptation, web preview, the UI-edit guardian, and a shareable-artifact publisher.
- **supergh** (`./supergh`) — the GitHub / git ecosystem: the `gh` CLI/REST/GraphQL reference, a fully-specified operation executor, Conventional-Commits commits, and template-driven issue / PR creation. No manifest, no hooks — skills route via their CSO descriptions.
- **superfix** (`./superfix`) — prioritized multi-agent codebase investigation: the `/superfix:code-auditor` command sweeps a repo with cheap `scout` agents, scores Impact × Opportunity, and sends frontier `detective` agents only into the hotspots. No manifest, no hooks — one user-invoked skill.

This repository is the **marketplace catalog** for all four: each plugin lives in its own subdirectory, and the root `.claude-plugin/marketplace.json` co-lists them by `source: "./superdev"`, `source: "./superui"`, `source: "./supergh"`, and `source: "./superfix"`. Each is **independently installable** — install any subset; none declares another as a dependency.

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

Every plugin is self-contained — none declares any dependencies. Installing one gives you that whole ecosystem: `superdev` / `superui` route every request through their injected manifest, while `supergh` / `superfix` route purely via skill descriptions. Install only the one(s) you need.

## superdev skills

| Area | Skills |
| --- | --- |
| Entry interview & environment | `superdev` — the always-on entry skill named after the plugin; interviews you to map the design before any plan/code, then hands off to planning. `setup` — run `/setup` once to seed `.temp/` + `.superdev/`, copy the `.gitignore` / `.claude/settings.json` templates, seed `.claude/rules/_superdev.md` (a frozen pointer to the manifest's mandatory rules), and choose the opt-in switches written to `.superdev/config.yml` |
| Project memory (agent-facing) | `memory-layers` (CLAUDE.md cascade), `memory-rules` (`.claude/rules/` layer) |
| End-user documentation | `help-writer` (end-user product help → `.superdev/help/`) |
| Development pipeline + diagnostics/specs | Skills: `superplan`, `superplan-reviewer`, `superbuild`, `superbuild-adr`, `superbuild-decomposer`, `superbuild-runner`, `superbuild-reviewer`, `superbuild-reviewer-plan`, `tdd`, `debug`, `superspec`, `superspec-reviewer`. Plugin agents (per-task pipeline workers): `coder`, `task-reviewer`, `improver` |

## supergh skills

Flat-named (single-domain plugin, no group prefix). No manifest, no hooks — skills route via their CSO `description:`:

| Skill | Role |
| --- | --- |
| `cli` | GitHub CLI reference — which layer (`gh` subcommand / `gh api` REST / `gh api graphql`) a given operation needs; reference-only, never executes |
| `cli-executor` | Fork that runs ONE fully-specified gh/REST/GraphQL operation out of the main context and returns a single tagged line |
| `commit` | Main-context commit-context resolver — gathers the file set (session / `all` / `staged`); authors inline in `context` mode, delegates to `agent-committer` for `all`/`staged`; the actual commit always runs through the self-verifying `commit.sh` |
| `agent-committer` | Fork that reads the diff and authors the Conventional-Commits subject for `all`/`staged`, then commits via the self-verifying `commit.sh` (runs no `git add`/`git commit` itself; invoked only by `commit`) |
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

## superfix skills

Single user-invoked skill (no manifest, no hooks); runs only via `/superfix:code-auditor`:

| Component | Role |
| --- | --- |
| `code-auditor` (skill) | Prioritized multi-agent codebase investigation — sweep every file, score Impact × Opportunity, gate to the hotspots, dispatch deep investigators, synthesize a verified, severity-ranked hotlist. User-only (`disable-model-invocation`) |
| `scout` (agent) | Cheap, fast triage scorer — rates one file (or a small batch) for Impact and Opportunity 1-5; spawn many in parallel during the sweep |
| `detective` (agent) | Frontier-model deep investigator — hunts the actual issue in one hotspot, verifies it on a clean checkout, writes a structured finding; spawn few |

## How it works

- **The manifest-bearing plugins (`superdev`, `superui`) inject their manifest** (`<plugin>/hooks/content/manifest.md`) once per session and route across that plugin's domains (instruction priority, the 1% rule, decision flow, the skill catalog, the natural chains, and red flags). `supergh` / `superfix` ship no manifest and route purely via CSO descriptions. Install several and their manifests coexist.
- **Skills auto-engage via CSO** — each skill's `description:` is its trigger, in any language.
- **Opt-in per project (superdev)** — `/setup` writes `.superdev/config.yml` (two switches: `adr`, `rules_improver`). The routing manifest is always injected as-is; a disabled switch only skips its `superbuild` pipeline step (`superbuild-adr` / the `improver` agent); both switches default off (a missing config = both off, fail-closed), so these two optional steps run only once you enable them via `/setup`.
- **The implementation pipeline is file-based (superdev)**: `superbuild` dispatches forked executors that hand state through files and reply with a 3-line status, keeping the main context lean.
- **Planning always happens in plan mode (superdev).** Whatever mode you start in, superdev's planning skill enters plan mode before drafting a plan, so the plan-review gate runs every time — the planning pipeline behaves the same regardless of the mode you started in.
