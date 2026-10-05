To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Run the host project's own agents at the close of a build

## Goal

Let a host project run its own agents, defined in its `.claude/agents/`, at the close of every viber build, just before the run is archived, so a project can add a closing step of its own (for example end-user help files written after all tasks). Add a user-only skill that helps the user create or adapt such an agent and register it.

## Problem

A viber build closes only with viber's own agents (memory, rules, QA, closeout). A host project has no way to add a step of its own: TimeHarmony cannot have end-user help files written once every task of a build is committed. Today the user has to remember to ask for it by hand after each build, and nothing gives that agent the run's specification and notes.

## Current behaviour

`implementor` step 6 dispatches the memory, rules and QA writers its switches load, commits their files, then step 7 runs `closeout`, which archives the run. `viber.yml` has no key naming host agents, `config.sh` prints only switches, titles, directories, tiers and the branching mode, and no skill writes into the host's `.claude/agents/`.

### Must not change

- A build whose `build.extensions` is empty or absent behaves exactly as today: no extra dispatch, task-list entry, commit or summary line.
- Every existing line of the `config.sh` block keeps its text and relative order; `branching.mode` stays the last line.
- Every existing `commit-task.sh` form keeps its arguments, subject, footer, stdout and exit codes.
- Every existing `switch-text.sh` key keeps its value-to-fragment mapping.
- `bootstrap.sh` keeps a user's own values when it merges the template.

## Behaviour

### S1 - A listed extension runs before the archive [NEW]

The project lists an agent in `build.extensions`; the build runs it after the memory, rules and QA files are committed and before `closeout`, and commits what it wrote.

Given `.claude/agents/user-help-writer.md` exists and `build.extensions: user-help-writer`
When a build reaches its close
Then `user-help-writer` is dispatched with the run directory, the specification, the notes directory and its own `.temp/` directory, its returned files land in one commit of their own, and the archive follows

### S2 - Several extensions, serial or parallel [NEW]

Given two agents listed and `build.extensions-parallel: false`
When the close runs
Then they are dispatched one after another in listed order; with `true` they are dispatched in one message; their commits always land one at a time

### S3 - A failing extension never blocks the archive [NEW]

Given an extension returns `VERDICT: FAIL`, or the harness answers that its agent type is not found
When the close runs
Then the build names it in the final summary (the not-found case with a hint to reload the session) and archives the run anyway

### S4 - A resumed build does not run a finished extension again [NEW]

Given an earlier session committed an extension's files and recorded it as closed
When the build resumes
Then that extension is not dispatched again

### S5 - A listed name with no agent file [NEW]

Given `build.extensions` names an agent with no `.claude/agents/<name>.md`
When the build closes
Then that name is not dispatched and the final summary names it as missing

### S6 - Creating an extension with `/viber:extension` [NEW]

Given a project with `.claude/viber.yml`
When the user runs `/viber:extension`
Then the skill shows the current list and the project's agents, asks whether to create a new agent or adapt an existing one, interviews briefly, writes `.claude/agents/<name>.md` carrying the extension contract, adds the name to `build.extensions`, leaves both files unstaged and tells the user to reload the session

### S7 - Setup brings the new keys into an existing configuration [NEW]

Given a project whose `.claude/viber.yml` is at schema 2 without the two keys
When the user runs `/viber:setup`
Then the file gains `extensions:` and `extensions-parallel: false` under `build:` with their comments, keeps every value the user set, and moves to schema 3; the help page, the flow diagrams and the README describe the step and the command

### Edge cases

- The same name listed twice -> dispatched once.
- A listed name that is not a valid agent name (anything but lowercase letters, digits and hyphens, starting with a letter or digit) -> treated as missing.
- An extension returns `VERDICT: NONE` -> no commit, nothing recorded.
- An extension returns `VERDICT: DENIED` -> one question: retry / accept / abort.
- An extension returns no `VERDICT:` line -> one reminder message, then treated as `FAIL`.
- The build ended on `abort` -> no extension runs.
- `build.cleanup: false` -> extensions still run.
- `/viber:extension` with no `.claude/viber.yml`, or one without an `extensions:` line under `build:` -> the skill names `/viber:setup` and adds nothing.
- `/viber:extension` adding a name already listed -> the list is left as it is.

## Glossary

- extension - an agent from the host project's own `.claude/agents/` that a viber build runs at its close, named in `build.extensions`; not a Claude Code plugin and not a viber agent.
- extension contract - the input lines an extension receives and the output lines it must return, plus the marker line that identifies an agent file carrying them.

## Acceptance criteria

1. The resolved configuration shows which listed extensions have an agent file (listed order, each once), which listed names do not, and whether extensions run in parallel.
2. `switch-text.sh build.extensions` selects the `off`, `serial` or `parallel` fragment from those lines.
3. The extension commit form commits only the named files under a script-derived subject with the run's close footer and records the extension as closed in the run's state.
4. `implementor` runs every listed extension not yet closed after the memory, rules and QA commits and before the archive, serially or in parallel per the switch; `FAIL` and an unknown agent type never block the archive, `DENIED` asks retry / accept / abort, and missing names reach the final summary.
5. `/viber:extension` creates or adapts an agent carrying the extension contract, registers it in `build.extensions`, leaves its writes unstaged and ends by telling the user to reload the session.
6. The skill's script lists the project's agents with whether each carries the contract, and adds a name to `build.extensions` once, refusing when the configuration is missing or lacks the key.
7. The `viber.yml` template carries `build.extensions` and `build.extensions-parallel` at schema 3, and `/viber:setup` restores them into an existing configuration.
8. The help page, the flow diagrams, the README and `plugin.json` describe the new skill, both keys and the extension step.

## Scope

### File map

- modify - viber/skills/setup/templates/viber.yml - the two new `build:` keys, schema 3, the header comment's wording on value kinds
- modify - tests/viber/bootstrap.test.ts - `SCHEMA_KEYS` entry for schema 3 and the schema literals that move with it
- modify - viber/scripts/config.sh - resolves the extension list, its missing names and the parallel switch
- modify - tests/viber/config.test.ts - cases for the three new lines and the updated full-block expectations
- modify - viber/scripts/switch-text.sh - the `build.extensions` key and its derived value
- modify - tests/viber/switch-text.test.ts - cases for that key
- modify - tests/portability.unit.test.ts - the key's valid values in `SWITCH_VALUES`
- modify - viber/scripts/commit-task.sh - the `--extension` form
- modify - tests/viber/commit-task.test.ts - cases for that form
- add - viber/skills/extension/scripts/extension.sh - lists the project's agents and the configured list, adds a name to the list
- add - tests/viber/extension.test.ts - cases for that script
- add - viber/skills/extension/SKILL.md - the `/viber:extension` skill
- add - viber/skills/extension/templates/extension.md - the extension agent template carrying the contract
- modify - viber/skills/implementor/SKILL.md - the extension step's preload, task-list entry and commit form
- add - viber/skills/implementor/fragments/extensions.serial.md - the extension step, one dispatch at a time
- add - viber/skills/implementor/fragments/extensions.parallel.md - the extension step, all dispatches in one message
- modify - viber/skills/setup/assets/help.html - switch entries, the skill card, the extension step
- modify - viber/skills/setup/assets/viber-flow-en.svg - the extension step in the close
- modify - viber/skills/setup/assets/viber-flow-pl.svg - the same in Polish
- modify - viber/README.md - the switches, the command, where it writes
- modify - viber/.claude-plugin/plugin.json - the new skill in `skills[]`

### Out of scope

- `intent`'s fast path: it has no run and no `implementor`, so no extension runs there.
- Personal agents from `~/.claude/agents/`, and `build.extensions` in `viber.local.yml` (it stays an ignored key there).
- Any hook point other than "before the archive".
- A review of the files an extension writes.
- The `CLAUDE.md` nodes (`viber/CLAUDE.md`, `viber/CLAUDE.switches.md`, `viber/skills/CLAUDE.md`, `viber/agents/CLAUDE.md`, `viber/scripts/CLAUDE.md`): `build.memory` is on, so the build's close updates them, never a task.
- This repository's own `.claude/viber.yml`: `/viber:setup` brings it to schema 3.

## Solution requirements

- Every script runs in Git Bash on Windows and in macOS bash 3.2; awk takes shell values through `ENVIRON`, never `-v`.
- Every bundled-script call in a skill is one literal pre-approved line; the new script ships 100755.
- The harness loads an agent file created mid-session only after the session is reloaded; after a reload the main session dispatches a project agent by its bare name and an unknown name returns a tool error with no fallback (verified empirically).
- No heredoc anywhere; no em or en dash in any shipped text.
- The extension step's text loads as a serial or a parallel fragment, chosen from the configuration, never one fragment that itself branches on `build.extensions-parallel`: no skill text branches on a switch.
