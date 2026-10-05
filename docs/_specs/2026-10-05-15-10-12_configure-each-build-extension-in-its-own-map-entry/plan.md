---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-05-15-10-12_configure-each-build-extension-in-its-own-map-entry/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Read the extension map and print its run steps
- TDD: required
- Covers: #1, #2, #3, #4
- Uses: C1, C2
- Depends-on: none
- Files: viber/scripts/config.sh, tests/viber/config.test.ts
- Delivers: `config.sh` resolving the extension map of C1 into the `build.extensions:` steps and `build.extensions-missing:` names of C2, with no `build.extensions-parallel:` line and no `build.` switch read from a map line; its header contract describes both. The old `serial`/`parallel` cases of `tests/viber/switch-text.test.ts` and the comma-line cases of `tests/viber/extension.test.ts` read the old lines and stay red until the tasks owning those files rewrite them.
- Verification: `node --test tests/viber/config.test.ts` -> every case passes
- DoD: a map of three found entries `a` (`parallel: true`), `b` (`parallel: true`), `c` (no option) prints `build.extensions: a + b, c`; an entry whose `parallel` reads `TRUE` joins its `parallel: true` neighbour and one reading `yes` stands alone; two `parallel: true` runs split by a `parallel: false` entry print as two joined steps around it; a missing name between two `parallel: true` entries prints on `build.extensions-missing:` while its neighbours stay one step; a duplicate entry counts once with its first option; an inline `extensions: a, b` value, an empty map and the key outside `build:` print `none` on both lines; a CRLF map resolves like an LF one; the block holds no `build.extensions-parallel:` line and every other line keeps its text and order; an entry named `memory` under the map, with `memory: true` written below the map, prints `build.memory: true`, and with no `memory:` line prints `build.memory: false`
<!-- /TASK -->

<!-- TASK -->
### T2 - Run the extensions step by step at the close of a build
- TDD: required
- Covers: #5
- Uses: C2, C3
- Depends-on: T1
- Files: viber/scripts/switch-text.sh, tests/viber/switch-text.test.ts, viber/skills/implementor/fragments/extensions.on.md, viber/skills/implementor/fragments/extensions.serial.md, viber/skills/implementor/fragments/extensions.parallel.md, tests/portability.unit.test.ts
- Delivers: `switch-text.sh build.extensions` selecting the `on` fragment per C3, and `extensions.on.md` telling `implementor` to dispatch the C2 steps in order, a multi-agent step in one message, each step after the previous one's returns and commits, the `closed:` names skipped inside a step; `extensions.serial.md` and `extensions.parallel.md` deleted; the portability sweep accepting `off` and `on` for `build.extensions`.
- Verification: `node --test tests/viber/switch-text.test.ts tests/portability.unit.test.ts` -> every case passes; `grep -c "build.extensions-missing" viber/skills/implementor/fragments/extensions.on.md viber/scripts/config.sh` -> both counts above 0; `grep -c " + " viber/skills/implementor/fragments/extensions.on.md viber/scripts/config.sh` -> both counts above 0; `grep -c -- "--extension" viber/skills/implementor/fragments/extensions.on.md viber/scripts/commit-task.sh` -> both counts above 0
- DoD: a map with one found entry selects the `on` fragment; a map of missing names alone selects the `on` fragment; an empty map selects nothing printed for `off`; the switch-text header names `off` and `on` for `build.extensions` and no `extensions-parallel` line; `extensions.on.md` reads the steps from the `build.extensions:` line, dispatches every name of a step joined by ` + ` in one message and starts the next step only once every return of the current one has been handled and its commits have run; `extensions.on.md` skips each name the `closed:` line holds as `extension:<name>` and keeps every outcome bullet of the deleted fragments; `extensions.serial.md` and `extensions.parallel.md` no longer exist; the portability sweep fires on a `build.extensions` fragment named `serial`
<!-- /TASK -->

<!-- TASK -->
### T3 - Register a new extension as a map entry
- TDD: required
- Covers: #6
- Uses: C1, C2, C4
- Depends-on: T1
- Files: viber/skills/extension/scripts/extension.sh, tests/viber/extension.test.ts, viber/skills/extension/SKILL.md
- Delivers: `extension.sh --add` writing the C4 entry into the map and answering `present` for a name with an entry, its report printing `LISTED=` as a plain comma list of the found names; its header contract describing both; `extension` skill's `STATUS=added` line telling the user the agent runs alone until its entry is set to `parallel: true`.
- Verification: `node --test tests/viber/extension.test.ts` -> every case passes; `grep -c "parallel: false" viber/skills/extension/SKILL.md viber/skills/extension/scripts/extension.sh` -> both counts above 0
- DoD: `--add x` on an empty map writes `    x:` and `      parallel: false` right below `  extensions:`; `--add y` after entries writes it below the last entry's last option line at the existing entry depth; a comment on the `extensions:` line and every other line stay byte-identical; a CRLF file gets the two new lines in CRLF; `--add` on a name already holding an entry prints `STATUS=present` and leaves the file untouched; a config with no `extensions:` key under `build:` prints `STATUS=stale` and `CONFIG=stale`; with entries `a` (`parallel: true`) and `b` (`parallel: true`) both found the report prints `LISTED=a, b`; `extension/SKILL.md`'s `STATUS=added` bullet names `parallel: false` and how to run the agent with its neighbours; `extension/SKILL.md`'s state paragraph and `STATUS=present` bullet speak of entries of `build.extensions`, not of a list
<!-- /TASK -->

<!-- TASK -->
### T4 - Ship the extension map in the setup template
- TDD: required
- Covers: #3, #4, #7
- Uses: C1
- Depends-on: T1
- Files: viber/skills/setup/templates/viber.yml, viber/skills/setup/scripts/bootstrap.sh, tests/viber/bootstrap.test.ts
- Delivers: the template's `build:` group ending on an empty `extensions:` key whose comment shows one entry with `parallel` and explains the run order and the steps, with no `extensions-parallel` key and `schema: 3`; `bootstrap.sh`'s merge treating the lines of the extension map as no `build:` child while still inserting a restored child after the map.
- Verification: `node --test tests/viber/bootstrap.test.ts` -> every case passes
- DoD: the template ships `schema: 3` and an empty `build.extensions` and carries no `extensions-parallel` line; the comment above `extensions` names `.claude/agents/` and `parallel: true`; the template's opening comment calls `build.extensions` no switch but a map of agent entries; the schema binding records no `build-extensions-parallel`; a `schema: 2` config gains `build.extensions` alone and the report names only `build.extensions`; a config whose map holds an entry named `qa` and whose `build:` lacks `qa:` gets `qa: false` restored after the map, the map's lines unchanged; a config already at the template with a filled map is left byte-identical
<!-- /TASK -->

<!-- TASK -->
### T5 - Describe the extension map in the help page and README
- TDD: none
- Covers: #8
- Uses: C1, C2
- Depends-on: T4
- Files: viber/skills/setup/assets/help.html, viber/README.md
- Delivers: the help page and README describing `build.extensions` as a map of entries with the `parallel` option and its steps, the `/viber:extension` text naming the `parallel: false` entry it writes, and every mention of `build.extensions-parallel` gone, in both languages of the help page.
- Verification: `node --test tests/viber/help.unit.test.ts` -> every case passes; `grep -c "extensions-parallel" viber/skills/setup/assets/help.html viber/README.md viber/skills/setup/templates/viber.yml` -> 0 on every file; `grep -c "parallel: true" viber/skills/setup/assets/help.html viber/README.md viber/skills/setup/templates/viber.yml` -> above 0 on every file; `grep -c "parallel" viber/scripts/config.sh` -> above 0
- DoD: `help.html` has no `key-build-extensions-parallel` entry and its `key-build-extensions` entry describes the entries, the `parallel` option and the steps in English and Polish; the help page's switch summary paragraphs and README's summary name no `build.extensions-parallel`; README's switch table has one `build.extensions` row describing the map and no `build.extensions-parallel` row; the `/viber:extension` texts of both files say the agent is registered with `parallel: false`; the help page test passes
<!-- /TASK -->

## Contracts

### C1 - The extension map in viber.yml

File: viber/scripts/config.sh

```
build:
  extensions:            # value after the colon: empty or a comment
    <name>:              # an entry
      parallel: true     # an option of that entry
```

- The map belongs to the first `extensions:` key line among the indented lines of `build:`. A value after its colon other than a comment -> the map holds no entry.
- Map lines: every line after that key line up to the first line that is neither blank nor a comment and is indented no deeper than that key line (a column-0 line included).
- Entry depth: the indentation of the first key line of the map. A key line at the entry depth is an entry; its name is the key, trimmed; any inline value of the entry line is ignored.
- Option: a key line deeper than the entry depth, belonging to the entry above it. `parallel` reading `true` in any letter case (cut at a blank or a `#`) -> the entry is parallel; any other value, an absent option or an unknown option key -> not parallel. The first `parallel` of an entry wins.
- A key line deeper than `extensions:` but shallower than the entry depth is ignored.
- A trailing CR is never part of a key or a value.
- A name counts once, at its first entry, with that entry's option.
- A name matching `^[a-z0-9][a-z0-9-]*$` whose `<repo root>/.claude/agents/<name>.md` exists is found; every other name is missing.
- No map line is a child of `build:` for any other key.

### C2 - The extension lines of the config block

File: viber/scripts/config.sh

```
build.extensions: <step>, <step> | none
build.extensions-missing: <name>, <name> | none
```

- Both lines sit where the extension lines sit today, right after `github.pr-title:`; no `build.extensions-parallel:` line exists.
- Missing names are removed before grouping, so a missing name never splits a run of parallel entries.
- `<step>`: a run of consecutive found parallel entries, joined by ` + ` in listed order, or one found entry that is not parallel, alone. A parallel entry with no parallel neighbour is a step of one name.
- Steps are joined by `, ` in listed order; `none` when no name is found.
- `build.extensions-missing:` lists the missing names in listed order joined by `, `, `none` when empty.
- Example: entries `a` (parallel), `b` (parallel), `c`, `d` (parallel), `ghost` (missing, parallel), `e` (parallel) -> `build.extensions: a + b, c, d + e` and `build.extensions-missing: ghost`.

### C3 - The switch-text value of build.extensions

File: viber/scripts/switch-text.sh

- `off` when `build.extensions:` and `build.extensions-missing:` both read `none`; `on` otherwise.
- `on` selects `<skill dir>/fragments/<name>.on.md`; `off` has no file.

### C4 - extension.sh registration and report

File: viber/skills/extension/scripts/extension.sh

```
STATUS=added | present | no-config | stale | invalid-name
LISTED=<name>, <name> | none
```

- `present`: the name is an entry of the C1 map, whatever its agent file or option.
- `added`: two lines inserted after the last map line that is neither blank nor a comment, or right after the `extensions:` line when the map holds none: `<entry indent><name>:` and `<entry indent>  parallel: false`. The entry indent is the map's entry depth, else the `extensions:` line's indentation plus two spaces. Both lines end in CR LF when the `extensions:` line does.
- Every other line of the file stays byte-identical, a comment on the `extensions:` line included.
- `LISTED=`: the `build.extensions:` steps of C2 with every ` + ` written as `, `, so a plain list of found names in run order.
- `CONFIG=`, `MISSING=`, `AGENT=` and the `no-config`, `stale`, `invalid-name` statuses keep their meaning.
