# superdev/skills

## Purpose

The skill layer of superdev: 24 skill directories. Grouped here by role rather than listed
flatly - derive the grouping from each skill's actual `description:` and body when it drifts.
The authoritative contract of a skill is its own body (`# Input contract` / `# Output format`),
never this node - this node says who owns what and how they chain.

## Groups

- **Interview / planning front ends** (model-invocable, main context): `intent`, `phases`,
  `superspec`, `superspec-refine`, `superplan`, `simpleplan`, `tdd`, `simpledebug`.
- **Planning reviewers** (read-only forks, invoked only by their front end): `phases-reviewer`,
  `superspec-reviewer`, `superplan-reviewer`, `simpleplan-reviewer`.
- **Build orchestrators** (main context): `superbuild` (Super track), `simplebuild` (Simple
  track).
- **Build reviewers** (forks under the shared stage contract): `superbuild-reviewer-spec`,
  `superbuild-reviewer-change`, `simplebuild-reviewer`.
- **Support forks**: `executor` (runs one shell command out of context, returns a short
  verdict), `adr` (judges confirmed decisions against the three ADR criteria), `e2e` (user-only,
  generates/verifies Playwright tests from a QA handoff file).
- **Memory and rules fronts**: `superdev-memory`, `superdev-rules`.
- **User-only commands** (`disable-model-invocation: true`, never routed): `setup`, `e2e`.
- **Plan-less track**: `vibe` (model-invocable, fires only on an explicit "skip the planning
  ceremony" request).

## Contracts & invariants

- `allowed-tools` does NOT restrict the tool set - it is a one-turn permission pre-approval
  only. Every other tool stays in the model's pool and remains callable; an unlisted tool merely
  prompts the user and stalls the run. A strictly read-only worker needs `disallowed-tools:` in
  its frontmatter (bare tool names, never `Tool(pattern)`), plus an explicit body line naming
  its only tools - "read-only" in the frontmatter alone still leaves `git`/`ls`/`rg` looking
  allowed.
- A skill that both `!`-preloads a script and denies bare `Bash` is undefined behavior. A
  strictly read-only worker takes its inputs as PATHS in `"$ARGUMENTS"` and reads them itself,
  with no preload.
- Shell portability of `!` preloads (top trap, confirmed by the user): the host shell varies per
  machine (zsh/macOS, bash/Linux, bash-Git-Bash/Windows). Single-quote any argument bearing `?`,
  `*` or `[` (e.g. `resolve-input.sh`'s `'?plan'`, `'?spec'`). bash leaves an unmatched glob as a
  literal; zsh's default `nomatch` aborts the WHOLE command, killing the fork preload so it loads
  with no input - invisible on bash, only surfaces on zsh. Never rely on bash-only behavior;
  assume the strictest shell. No PowerShell syntax anywhere.
- **Pre-approved bundled-script calls (preload and runtime).** A preload is permission-checked
  like any Bash call; a bare `Bash` entry in `allowed-tools` does NOT cover it. Both required:
  the skill's `allowed-tools` carries a PATTERN entry for the preload, and the bundled script is
  invoked DIRECTLY, never through an interpreter - so every preloaded script keeps its exec bit
  (`100755` in the git index) and its `#!/usr/bin/env bash` shebang. The same two requirements
  bind a runtime call - a bundled script a skill has the model run via the `Bash` tool
  mid-session, not as a preload: it is one literal line,
  `"${CLAUDE_PLUGIN_ROOT}/…/x.sh" <args>` (a `run.sh` call pipes its input through a heredoc on
  stdin instead of an arg), never prefixed with `bash`, never assigned to a variable, never
  preceded by `cd`, never chained with `;`; the skill declares one
  `Bash(${CLAUDE_PLUGIN_ROOT}/…/x.sh:*)` pattern per such script; the script itself keeps the
  same `100755` exec bit and `#!/usr/bin/env bash` shebang. Reason: the auto-mode permission
  classifier matches a command's literal prefix, so any other form of the same call - a
  different prefix, an added flag, an interpreter wrapper - is a new, unapproved
  classification.
- A worker must NEVER appear in both `plugin.json` `skills[]` and `agents[]`.
- A user-only command (`disable-model-invocation: true`) does not participate in routing and
  stays out of the injected manifest entirely - that gap is deliberate, do not "fix" it.
- The injected manifest (`hooks/content/manifest.md`) lists groups/roles and chains, not
  individual skills. Update it only when a change adds/removes a group, shifts a group's scope,
  or alters a documented chain/config-gated area - not for every per-skill change.

## Anti-patterns

- Adding, removing or renaming a skill without updating `superdev/.claude-plugin/plugin.json`
  `skills[]` and this node.
- Restating a skill's full `# Input contract` here instead of pointing at its own body.

## Related context

- Plugin-wide facts (config switches, knowledge layers, scripts): `../CLAUDE.md`
- Agent layer: `../agents/CLAUDE.md`
- Review vocabulary owner: `../references/review-contract.md`
