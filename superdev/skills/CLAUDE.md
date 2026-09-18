# superdev/skills

## Purpose

The skill layer of superdev: 21 skill directories. Grouped here by role rather than listed
flatly - derive the grouping from each skill's actual `description:` and body when it drifts.
The authoritative contract of a skill is its own body (`# Input contract` / `# Output format`),
never this node - this node says who owns what and how they chain.

## Groups

- **Interview / planning front ends** (model-invocable, main context): `intent`, `phases`,
  `superspec`, `superspec-refine`, `superplan`, `simpleplan`, `tdd`, `simpledebug`.
- **Planning reviewers** (read-only forks, invoked only by their front end): `phases-reviewer`,
  `superspec-reviewer`, `superplan-reviewer`, `simpleplan-reviewer`.
- **Build orchestrators** (main context): `superbuild` (Super track), `simplebuild` (Simple
  track). Every worker they dispatch is an agent - the build reviewers moved to `../agents/`
  with the rest, so no skill in this layer takes part in a build round.
- **Support forks**: `executor` (runs one shell command out of context, returns a short
  verdict), `adr` (judges confirmed decisions against the three ADR criteria), `e2e` (user-only,
  generates/verifies Playwright tests from a QA handoff file).
- **Memory and rules fronts**: `superdev-memory`, `superdev-rules`.
- **User-only commands** (`disable-model-invocation: true`, never routed): `setup`, `e2e`.
- **Plan-less track**: `vibe` (model-invocable). Two ways in, and no third: an explicit "skip the
  planning ceremony" request, or the user picking the Vibe path at `intent`'s handoff gate. That
  gate hands it ONE sentence, never the `intent.md` path - `vibe` takes a one-sentence change,
  not a file - and its own entry guard is what refuses a request too large for the track and
  offers `intent` back.

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
  `*` or `[`. bash leaves an unmatched glob as a literal; zsh's default `nomatch` aborts the WHOLE
  command, killing the fork preload so it loads with no input - invisible on bash, only surfaces
  on zsh. Never rely on bash-only behavior; assume the strictest shell. No PowerShell syntax
  anywhere. No preload in the repo carries such an argument today (the optional-label
  `resolve-input.sh` that did is gone with the build reviewers), so `tests/portability.test.ts`
  is the only thing standing between a future author and this trap.
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
- `AskUserQuestion` takes at most FOUR options per question. A gate that has to offer more picks
  one of two shapes, never a fifth option: make two of them mutually exclusive by condition, or
  keep the least-used one out of the option list and name it in one prose line under the question
  (the user reaches it through **Other**). `intent`'s handoff gate is the worked example - Phases
  only when the intent path has no `phases/` segment, `Stop here` in prose whenever Phases took
  the fourth slot.
- A worker must NEVER appear in both `plugin.json` `skills[]` and `agents[]`.
- A user-only command (`disable-model-invocation: true`) does not participate in routing and
  stays out of the injected manifest entirely - that gap is deliberate, do not "fix" it.
- The injected manifest (`hooks/content/manifest.md`) carries MANDATORY RULES only - the
  instruction priority, the always-override rules, the `.temp/` rule. It names no skill, no group
  and no chain, so routing lives entirely in each skill's own CSO `description:`. A per-skill
  change never touches it; only a change to one of those standing rules does.

## Anti-patterns

- Adding, removing or renaming a skill without updating `superdev/.claude-plugin/plugin.json`
  `skills[]` and this node.
- Restating a skill's full `# Input contract` here instead of pointing at its own body.

## Related context

- Plugin-wide facts (config switches, knowledge layers, scripts): `../CLAUDE.md`
- Agent layer: `../agents/CLAUDE.md`
- Review vocabulary owner: `../references/review-contract.md`
