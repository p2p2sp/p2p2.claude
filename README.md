# P2P2 Claude Code Plugins

A Claude Code **plugin marketplace**: seven independent plugins in one repository, each in its own
subdirectory, co-listed by the catalog at `.claude-plugin/marketplace.json`. Install any subset - none
declares another as a dependency, and installing one gives you that whole ecosystem.

The plugins ship no application code. They are Markdown skills, JSON manifests, a few agents, and
deterministic bash / TypeScript / Python helper scripts - there is no build step. All seven are **stack-agnostic on
purpose**: they read project-specific knowledge (test framework, build tool, naming, how to launch the app)
from the consuming repository's own `CLAUDE.md` and `.claude/rules/`, never from the plugin sources.

All seven share one version namespace, driven by the git tag.

## Install

Run these from a terminal to install at **user scope** - available across all your projects, not just
whichever repo you happen to be in:

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superdev@p2p2 --scope user
claude plugin install superui@p2p2 --scope user
claude plugin install supergh@p2p2 --scope user
claude plugin install superfix@p2p2 --scope user
claude plugin install superbiz@p2p2 --scope user
claude plugin install supercc@p2p2 --scope user
claude plugin install viber@p2p2 --scope user
```

`--scope user` is the default for both commands (it writes to `~/.claude/settings.json`); it is spelled out
above for clarity. Inside an active Claude Code session you can instead run
`/plugin marketplace add https://github.com/p2p2sp/p2p2.claude` followed by `/plugin install superdev@p2p2`
and pick **User scope** when prompted - `project` or `local` scope installs the plugin for the current repo
only.

## The plugins

| Plugin | What it is for | Details |
| --- | --- | --- |
| **superdev** | Agentic development end to end: a design interview before any code, project memory (`CLAUDE.md` cascade, `.claude/rules/`, a build changelog), specs and plans that must pass a reviewer, then a task-by-task build with a commit per task. | [superdev/README.md](superdev/README.md) |
| **superui** | Design and frontend: professional UI/UX standards on every interface you build - visual hierarchy, color, type, spacing, accessibility, motion, and an aesthetic direction that refuses the generated look. | [superui/README.md](superui/README.md) |
| **supergh** | GitHub and git: Conventional-Commits commits, template-driven issues and draft PRs, and a `gh` CLI/REST/GraphQL reference so the model stops guessing which API layer to use. | [supergh/README.md](supergh/README.md) |
| **superfix** | Codebase investigation: sweeps the whole repo with cheap agents, ranks findings by Impact x Opportunity, and sends frontier investigators only into the hotspots. | [superfix/README.md](superfix/README.md) |
| **superbiz** | Idea validation: web research, a nine-dimension scorecard and a seven-member council debating over two rounds decide whether an idea is worth turning into a side project, ending in one self-contained HTML report. | [superbiz/README.md](superbiz/README.md) |
| **supercc** | Claude Code itself: designing skills and agents - creating them, splitting an overloaded one, shrinking a bloated one, fixing one that never triggers, auditing a whole set. | [supercc/README.md](supercc/README.md) |
| **viber** | The short track from idea to committed code: an interview that refuses to leave an unknown open, a reviewed plan, then an orchestrated build where every task is coded, gated and committed by its own agent. | [viber/README.md](viber/README.md) |

Each plugin's README carries its own description, a short usage guide, and the list of its skills.

## Requirements

- **superfix** needs **Node.js >= 22.6** (its scripts are TypeScript run directly by Node's native type
  stripping - no packages, no build step); **superui** uses the same runtime for its optional contrast
  check and degrades with a note when it is absent.
- **supergh** needs the `gh` CLI installed and authenticated.
- **superbiz** needs web access, plus **Python 3** (any maintained version, standard library only) to render
  `idea-validator`'s report.
- **superdev**, **supercc** and **viber** have no runtime dependencies.

## How they fit together

Within a plugin, skills compose through their `description:` triggers, and the model routes to them by
itself. Two plugins ship hooks: `superdev` (a `SessionStart` hook injecting its mandatory-rules manifest,
plus a `PreToolUse` hook gating `ExitPlanMode` on a reviewed plan) and `viber` (a `PreToolUse` hook gating
`ExitPlanMode` on its own plan review). The other five ship no hooks and no manifest.

Because both of those gates match `ExitPlanMode` and each recognizes only its own plan format, **`superdev`
and `viber` are not meant to run side by side**: superdev's gate denies a viber plan, which declares neither
`# SimplePlan` nor `# SuperPlan`. Install one of the two tracks at a time.

Cross-plugin chains are soft and optional: a skill that names another plugin's skill engages only when that
plugin is also installed, and simply does not fire otherwise.
