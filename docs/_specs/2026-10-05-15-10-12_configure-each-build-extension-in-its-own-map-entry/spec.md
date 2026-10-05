To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Configure each build extension in its own map entry

## Goal

Replace the one comma-separated `build.extensions` line and the global `build.extensions-parallel` switch with a map of agent entries in `.claude/viber.yml`, each entry carrying its own `parallel` option, so a project decides per agent which extensions may run together and which must run alone. The setup template, the extension registration and the documentation follow the new shape.

## Problem

A project with several extensions can only run all of them at once or all one after another. An agent that needs something exclusive (a running application, a device) forces every other extension to run serially, which makes the close of every build slower than it needs to be. The comma line also has no room for any option per agent.

## Current behaviour

`build.extensions` is one line of agent names separated by commas, in run order, and `build.extensions-parallel` is one switch for all of them. `config.sh` prints `build.extensions-parallel:`, `build.extensions:` (names with an agent file) and `build.extensions-missing:` (the others). `switch-text.sh build.extensions` derives `off`, `serial` or `parallel` from those three lines, and `implementor` loads `extensions.serial.md` or `extensions.parallel.md` at step 6. `extension.sh --add` appends a name to the comma line. Neither shape has been released: the last release ships `schema: 2` without any extension key.

### Must not change

- A build with no extension configured behaves as today: no extension dispatch, task-list entry, commit or summary line.
- Every other line of the `config.sh` block keeps its text and relative order; `branching.mode` stays the last line.
- The extension agent contract (`run:`/`spec:`/`notes:`/`out:` input lines, `VERDICT: WRITTEN`/`NONE`/`FAIL`/`DENIED` plus `FILES:`), one `commit-task.sh --extension` call per return, the handling of `FAIL`, `DENIED`, a not-found agent type and a refused commit, and skipping a name the index's `closed:` line holds.
- A missing agent file or an invalid name still reaches the final summary as a listed extension with no agent file.
- `schema:` stays `3`; a `schema: 2` config still gets the empty `extensions:` key from `/viber:setup`.

## Behaviour

### S1 - Extensions declared as a map [CHANGED - was: one comma-separated line plus a global parallel switch]

A user lists each extension as its own entry under `build.extensions`, in run order, and marks with `parallel: true` the ones that may run together.

Given `build.extensions` holds the entries `help-builder` (`parallel: true`), `readme-sync` (`parallel: true`) and `e2e-test-adb-writer` (`parallel: false`), each with an agent file
When the configuration is resolved
Then `help-builder` and `readme-sync` form one step and `e2e-test-adb-writer` forms the next step on its own

### S2 - The build runs the extensions step by step [CHANGED - was: all in one message or all one at a time]

Given the steps of S1
When `implementor` reaches its extension step at the close of a build
Then it dispatches `help-builder` and `readme-sync` in one message, commits each return, and dispatches `e2e-test-adb-writer` only once both have returned and their commits have run

### S3 - Registering an extension [CHANGED - was: the name appended to the comma line]

Given a `viber.yml` whose `build:` group has an `extensions:` key
When `/viber:extension` registers the agent `release-notes`
Then the map gains the entry `release-notes:` with `parallel: false` under it, after every existing entry, and every other line stays as it was

### S4 - Setting up a new or older config [CHANGED - was: the template shipped `extensions:` and `extensions-parallel: false`]

Given a project with no `viber.yml`, or a `schema: 2` one
When `/viber:setup` runs
Then the file carries an empty `extensions:` key under `build:` with a comment explaining the entries and their `parallel` option, and no `extensions-parallel` key

### S5 - Reading how to configure extensions [CHANGED - was: the documentation described a comma list and a global switch]

Given a user opening `/viber:help` or the plugin README
When they look up `build.extensions`
Then they find the map of entries, the `parallel` option and how entries group into steps, and no `build.extensions-parallel` key

### Edge cases

- An entry with no option, or with `parallel:` holding anything but `true` in any letter case -> it runs alone.
- A `parallel: true` entry with no `parallel: true` neighbour -> a step of one agent.
- Two runs of `parallel: true` entries separated by a `parallel: false` entry -> two separate multi-agent steps around the lone one.
- A listed name with no agent file, or an invalid name, between two `parallel: true` entries -> reported as missing and dropped before grouping, so its neighbours stay one step.
- The same name in two entries -> it counts once, at its first entry, with that entry's option.
- An entry named like a `build:` switch (`memory`, `qa`, `rules`) -> that switch keeps the value its own line gives it, and `/viber:setup` still restores the switch when its own line is missing.
- `extensions:` holding an inline value (`extensions: a, b`) -> the map holds no entry.
- A resumed build whose `closed:` line already names some extensions of a step -> the rest of that step is dispatched together, the named ones never again.
- `--add` on a CRLF file -> the two new lines end in CRLF too.

## Glossary

- extension entry - one agent name under `build.extensions`, written as a key with its options indented below it; not a switch.
- step - the unit `implementor` dispatches at once: one entry on its own, or a run of consecutive `parallel: true` entries sent in one message.

## Acceptance criteria

1. `config.sh` reads `build.extensions` as a map of entries per C1 and prints the found and missing names per C2.
2. `config.sh` prints the found names grouped into steps per C2: consecutive `parallel: true` entries joined into one step, every other entry a step of its own, in listed order.
3. The resolved block carries no `build.extensions-parallel` line, and the setup template ships no `extensions-parallel` key.
4. A line inside the extension map never changes a `build.` switch value `config.sh` prints, and `bootstrap.sh`'s merge never takes it for a present `build:` child, restoring a missing switch after the map.
5. `implementor`'s extension step dispatches the steps in order, every name of a multi-agent step in one message, each step only once the previous one has returned and its commits have run; `switch-text.sh build.extensions` selects that text per C3.
6. `extension.sh --add <name>` writes the entry per C4, answers `present` for a name that already has an entry, and its `LISTED=` line stays a plain list of names.
7. The setup template ships an empty `extensions:` key under `build:` whose comment explains the entries and the `parallel` option.
8. `help.html` and `README.md` describe the map and its `parallel` option and no longer name `build.extensions-parallel`.

## Scope

### File map

- modify - viber/scripts/config.sh - parses the extension map, prints the steps and the missing names, keeps map lines out of the `build.` switches
- modify - tests/viber/config.test.ts - pins the map grammar, the grouping and the switch isolation
- modify - viber/scripts/switch-text.sh - derives `off` or `on` for `build.extensions`
- modify - tests/viber/switch-text.test.ts - pins the `off`/`on` derivation
- add - viber/skills/implementor/fragments/extensions.on.md - the step-by-step extension dispatch at the close of a build
- delete - viber/skills/implementor/fragments/extensions.serial.md - replaced by `extensions.on.md`
- delete - viber/skills/implementor/fragments/extensions.parallel.md - replaced by `extensions.on.md`
- modify - tests/portability.unit.test.ts - the fragment values `build.extensions` accepts
- modify - viber/skills/extension/scripts/extension.sh - registers an entry in the map, reports the listed names as a plain list
- modify - tests/viber/extension.test.ts - pins the entry write and the `present` check
- modify - viber/skills/extension/SKILL.md - what `STATUS=added` means for the user
- modify - viber/skills/setup/templates/viber.yml - the empty map key and its comment, no `extensions-parallel`
- modify - viber/skills/setup/scripts/bootstrap.sh - keeps the extension map out of the `build:` children it compares
- modify - tests/viber/bootstrap.test.ts - the template keys, the schema binding and the merge around a filled map
- modify - viber/skills/setup/assets/help.html - the `build.extensions` entry, the switch summary, the `/viber:extension` card
- modify - viber/README.md - the switch table and summary, the `/viber:extension` section

### Out of scope

- `viber/CLAUDE.switches.md`, `viber/CLAUDE.md`, `viber/scripts/CLAUDE.md`, `viber/skills/CLAUDE.md`: the build's memory close brings them to the new shape.
- `.claude/rules/viber/switch-count-prose.md`: the build's rules close brings it to the new shape.
- `viber/skills/implementor/SKILL.md`: its `switch-text.sh build.extensions ... extensions` preload and its `Run extensions` entry stay as they are.
- `viber/skills/setup/assets/viber-flow-en.svg` and `viber-flow-pl.svg`: their "`build.extensions` not empty" condition still holds.
- `viber/skills/extension/templates/extension.md`: the agent contract does not change.
- Any per-agent option other than `parallel`; migrating the comma line (never released); `viber.local.yml`, which keeps ignoring both extension keys; `intent`'s fast path, which runs no extension.

## Solution requirements

- `schema:` stays `3`: the layout changes in place, since no released version carries the comma line.
- Every script keeps running under macOS bash 3.2 with BSD awk and under Git Bash on Windows.
- `parallel` reads `true` in any letter case, as every other `viber.yml` switch does (the user's answer during planning).
- Every script stays fail-open with exit 0 in preload mode.
