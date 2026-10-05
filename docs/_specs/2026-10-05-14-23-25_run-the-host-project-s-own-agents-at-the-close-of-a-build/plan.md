---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-05-14-23-25_run-the-host-project-s-own-agents-at-the-close-of-a-build/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Add the extension keys to the viber.yml template
- TDD: none
- Covers: #7
- Uses: C6
- Depends-on: none
- Files: viber/skills/setup/templates/viber.yml, tests/viber/bootstrap.test.ts, viber/skills/setup/assets/help.html, viber/README.md
- Delivers: the template's `build:` group carries `extensions:` (empty) and `extensions-parallel: false`, each with its explaining comment, at schema 3, with the header comment naming the list key as a value kind of its own; the bootstrap schema binding and fixtures follow schema 3; the help page carries an entry for each key and the README's switch table and counts name them.
- Verification: `node --test tests/viber/bootstrap.test.ts tests/viber/help.unit.test.ts` -> every test passes; `grep -n "extensions-parallel" viber/skills/setup/templates/viber.yml viber/skills/setup/assets/help.html viber/README.md` -> one hit or more in each file
- DoD: the template reads `schema: 3` and carries both keys under `build:`; `SCHEMA_KEYS` binds schema 3 to the template's key list; a schema-2 configuration lacking both keys gains them through the bootstrap merge with the user's values kept; `help.html` carries `id="key-build-extensions"` and `id="key-build-extensions-parallel"` with en and pl text, and its `key-schema` entry shows 3; the README switch table lists both keys; no text this task adds names the `/viber:extension` command, which `plugin.json` does not list yet
<!-- /TASK -->

<!-- TASK -->
### T2 - Resolve the extension list in the config block
- TDD: required
- Covers: #1
- Uses: C1, C6
- Depends-on: T1
- Files: viber/scripts/config.sh, tests/viber/config.test.ts
- Delivers: `config.sh` prints the three extension lines after `github.pr-title`, checking each listed name against the project's agent files.
- Verification: `node --test tests/viber/config.test.ts tests/viber/bootstrap.test.ts` -> every test passes
- DoD: a list naming two existing agents prints them in listed order on `build.extensions`; a listed name with no agent file and an invalid name print on `build.extensions-missing`, not on `build.extensions`; a duplicated name prints once; an empty or absent key prints `none` on both lines; `build.extensions-parallel` prints `true` only for `true` and `false` otherwise; a trailing comment on the list line is not part of any name; the header `Contract:` documents the three lines
<!-- /TASK -->

<!-- TASK -->
### T3 - Select the extension fragment from the config block
- TDD: required
- Covers: #2
- Uses: C1, C2
- Depends-on: T2
- Files: viber/scripts/switch-text.sh, tests/viber/switch-text.test.ts, tests/portability.unit.test.ts
- Delivers: `switch-text.sh` accepts `build.extensions` and prints the `off`, `serial` or `parallel` fragment the extension lines select.
- Verification: `node --test tests/viber/switch-text.test.ts "tests/portability.unit.test.ts"` -> every test passes
- DoD: `none` on both `build.extensions` and `build.extensions-missing` selects `<name>.off.md`; a dispatchable or a missing name with `build.extensions-parallel: false` selects `<name>.serial.md`; the same with `true` selects `<name>.parallel.md`; a list holding only missing names selects the serial or parallel fragment, never `off`; a missing fragment file prints nothing and exits 0; `SWITCH_VALUES` lists `off`, `serial` and `parallel` for the key; the header `Contract:` documents the key
<!-- /TASK -->

<!-- TASK -->
### T4 - Commit an extension's files with commit-task.sh --extension
- TDD: required
- Covers: #3
- Uses: C3
- Depends-on: none
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: the `--extension` form commits the named files of one extension under a derived subject and records it as closed.
- Verification: `node --test tests/viber/commit-task.test.ts` -> every test passes
- DoD: `--extension <plan> user-help-writer docs/help/a.md` commits only that file with subject `chore(viber): extension user-help-writer`; its message carries `Refs: <plan> close` plus the issue line when the plan has one; `status.md`'s `closed:` line gains `extension:user-help-writer` once, kept on a second call; stdout is exactly the `committed:` and `subject:` lines; a `.temp/` path is refused with the existing warning; an invalid name or no file exits 2; no change exits 4; `rulings.md` rides along like every other plan form; the usage text and header list the form
<!-- /TASK -->

<!-- TASK -->
### T5 - List agents and register an extension with extension.sh
- TDD: required
- Covers: #6
- Uses: C1, C4, C5, C6
- Depends-on: T2
- Files: viber/skills/extension/scripts/extension.sh, tests/viber/extension.test.ts
- Delivers: a bundled script that, with no argument, prints the configuration state, the configured list, its missing names and one line per project agent saying whether it carries the extension marker; with `--add <name>` it adds the name to the `extensions:` line under `build:`.
- Verification: `node --test tests/viber/extension.test.ts` -> every test passes; `git ls-files -s viber/skills/extension/scripts/extension.sh` -> mode 100755
- DoD: with no argument it prints the C4 lines, `AGENT=` lines sorted by name, `contract` only for a file holding the marker line; `--add x` on an empty list writes `extensions: x`; `--add y` after it writes `extensions: x, y`; `--add x` again prints `STATUS=present` and leaves the file byte-identical; a trailing comment on the line is kept; no `.claude/viber.yml` prints `STATUS=no-config`, no `extensions:` under `build:` prints `STATUS=stale`, an invalid name prints `STATUS=invalid-name`, each leaving files untouched; every run exits 0; the header carries its `Contract:`
<!-- /TASK -->

<!-- TASK -->
### T6 - Create or adapt an extension agent with /viber:extension
- TDD: none
- Covers: #5
- Uses: C4, C5
- Depends-on: T3, T5
- Files: viber/skills/extension/SKILL.md, viber/skills/extension/templates/extension.md
- Delivers: the user-only inline skill and the agent template: the skill preloads the script's listing, asks create new or adapt existing, interviews briefly in prose (what the agent produces, where, in which language, from which inputs), writes or edits `.claude/agents/<name>.md` from the template, consults `supercc:skill-designer` through `Skill` only when it is listed, registers the name through `extension.sh --add`, leaves both files unstaged and ends by telling the user to reload the session.
- Verification: `node --test "tests/portability.unit.test.ts"` -> every test passes; `grep -c "viber:extension" viber/skills/extension/templates/extension.md viber/skills/extension/scripts/extension.sh` -> 1 or more in each; `grep -n "skills/extension/scripts/extension.sh" viber/skills/extension/SKILL.md` -> the preload, the `--add` call and their `allowed-tools` patterns
- DoD: the frontmatter carries `disable-model-invocation: true`, no `context: fork`, and an `allowed-tools` naming the script's two literal call patterns plus `Write` and `Edit` scoped to `.claude/agents/`; one `AskUserQuestion` offers create new or adapt an existing agent from the listing; the interview covers what the agent produces, where it writes, in which language and from which inputs; `supercc:skill-designer` is invoked through `Skill` only when it is in the skill listing; the template carries the C5 input lines, the C5 way to find the build's commits, output vocabulary and marker line, a description ending "Invoked only by viber's implementor at the close of a build, never directly.", a ban on git writes and on writes into the run directory, the refused-tool paragraph, a "Stop what you started" section and a read-back of every written file for an orphan closing tag; the body stops on `STATUS=no-config` or `STATUS=stale` naming `/viber:setup`; every question offering options goes through `AskUserQuestion`; the last line tells the user to reload the session before a build uses the agent
<!-- /TASK -->

<!-- TASK -->
### T7 - Run the listed extensions at the close of a build
- TDD: none
- Covers: #4
- Uses: C1, C2, C3, C5
- Depends-on: T4, T6
- Files: viber/skills/implementor/SKILL.md, viber/skills/implementor/fragments/extensions.serial.md, viber/skills/implementor/fragments/extensions.parallel.md
- Delivers: `implementor` preloads the extension fragment at the end of step 6, once the memory, rules and QA writers have returned and their commits landed; the fragment dispatches each listed extension the index's `closed:` line does not name, serially or all in one message, commits each `WRITTEN` return through `--extension` one call per message, and carries every outcome to the final summary; step 3 creates a `Run extensions` entry when the fragment is loaded.
- Verification: `node --test "tests/portability.unit.test.ts"` -> every test passes; `grep -n -- "--extension" viber/skills/implementor/fragments/extensions.serial.md viber/skills/implementor/fragments/extensions.parallel.md viber/scripts/commit-task.sh` -> one hit or more in each file
- DoD: the step 6 preload is the literal `switch-text.sh` line for `build.extensions` with name `extensions`, placed after step 6's `--chore` commit paragraph and its `TaskUpdate` paragraph, outside the one-message batch of the memory, rules and QA dispatches; each fragment dispatches by the bare agent name with no `model` and exactly the C5 input lines; the two fragments differ only in the dispatch-order paragraph; a `WRITTEN` return is committed through `--extension` with its `FILES:` paths, never two `commit-task.sh` calls in one message, parallel dispatch included; `NONE` commits nothing and records nothing; `FAIL` and a not-found agent type go to the final summary, the latter with the reload hint, with no retry, no arbiter and no question, and never stop the archive; the `implementor` rule for a non-zero `commit-task.sh` exit lists an `--extension` call among its exceptions with its parenthetical owner note reworded to match, and step 4's "Commit outside a task" definition excludes `--extension`, and a failed `--extension` commit leaves its paths named uncommitted in the final summary with no retry, no arbiter and no question; step 3 creates the `Run extensions` entry only when the extension fragment text is loaded, and it is completed once every extension has returned and its commit, if any, has run; `DENIED` asks retry / accept / abort; a reply with no `VERDICT:` gets one reminder, then counts as `FAIL`; every `build.extensions-missing` name reaches the final summary, also when no listed name is dispatchable and nothing is dispatched; the step runs whatever `build.cleanup` says; the step is skipped after `abort`
<!-- /TASK -->

<!-- TASK -->
### T8 - Describe extensions in the help page, flow and README
- TDD: none
- Covers: #8
- Uses: none
- Depends-on: T7
- Files: viber/skills/setup/assets/help.html, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg, viber/README.md, viber/.claude-plugin/plugin.json
- Delivers: `plugin.json` lists the new skill; the help page carries its card and the extension step in the build's close; both flow diagrams show the step between the close writers and `closeout`; the README names the command and `.claude/agents/` among the places viber writes.
- Verification: `node --test tests/viber/help.unit.test.ts` -> every test passes; `grep -n "skills/extension" viber/.claude-plugin/plugin.json` and `grep -n "skill-extension" viber/skills/setup/assets/help.html` -> one hit each
- DoD: `skills[]` holds `./skills/extension/`; `help.html` carries `id="skill-extension"` with en and pl text and no auto tag; both SVGs name the extension step in their own language between the close writers and `closeout`; the README quick-start table carries `/viber:extension` and its "Where it writes" section names `.claude/agents/`
<!-- /TASK -->

## Contracts

### C1 - Extension lines of the config block

File: viber/scripts/config.sh

Printed right after `github.issue-title:` and `github.pr-title:`, in this order:

```
build.extensions-parallel: true | false
build.extensions: <name>, <name> | none
build.extensions-missing: <name>, <name> | none
```

`<name>` matches `^[a-z0-9][a-z0-9-]*$`; `build.extensions` holds the listed names with a file `.claude/agents/<name>.md` under the repository root, in listed order, each once; `build.extensions-missing` holds every other listed name, each once.

### C2 - switch-text.sh value for build.extensions

File: viber/scripts/switch-text.sh

```
switch-text.sh build.extensions <skill dir> <name>
  build.extensions: none and build.extensions-missing: none   -> <skill dir>/fragments/<name>.off.md
  either line not none, build.extensions-parallel: false      -> <skill dir>/fragments/<name>.serial.md
  either line not none, build.extensions-parallel: true       -> <skill dir>/fragments/<name>.parallel.md
```

### C3 - commit-task.sh --extension

File: viber/scripts/commit-task.sh

```
commit-task.sh --extension <plan-file> <name> <file> [<file>...]
  subject:  chore(viber): extension <name>
  footer:   Refs: <plan-file> close   (+ Refs: #<N> when the plan has issue:)
  status:   closed: ... extension:<name>
  stdout:   committed: <short sha>
            subject: <subject>
  exit:     0 committed | 2 bad arguments or invalid <name> | 4 no change | 5 git failure
```

### C4 - extension.sh output

File: viber/skills/extension/scripts/extension.sh

```
extension.sh
  CONFIG=ok | no-config | stale
  LISTED=<name>, <name> | none
  MISSING=<name>, <name> | none
  AGENT=<name> | contract | plain        one line per .claude/agents/*.md, by name
extension.sh --add <name>
  STATUS=added | present | no-config | stale | invalid-name
exit: always 0
```

### C5 - Extension agent contract

File: viber/skills/extension/templates/extension.md

```
marker line in the agent body:  <!-- viber:extension -->
input (dispatch prompt, nothing else):
  run: <run directory>
  spec: <run directory>/spec.md
  notes: <run directory>/work/
  out: .temp/viber/extension-<name>/
the build's commits: every commit whose message carries `Refs: <run>/plan.md`
output (only channel):
  VERDICT: WRITTEN
  FILES: <repo-relative paths, comma-separated>
  | VERDICT: NONE
  | VERDICT: FAIL
    REASON: <one line>
  | VERDICT: DENIED
    REASON: <refused tool name>: <the exact refused command, or the path for a file tool>
```

### C6 - Extension keys of viber.yml

File: viber/skills/setup/templates/viber.yml

```
build:
  extensions: <name>, <name>        comma-separated agent names, one line, run order; empty = none
  extensions-parallel: false        true = all extensions dispatched in one message
```
