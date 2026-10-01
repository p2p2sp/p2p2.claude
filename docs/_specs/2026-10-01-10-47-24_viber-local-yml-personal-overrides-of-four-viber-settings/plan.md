---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-01-10-47-24_viber-local-yml-personal-overrides-of-four-viber-settings/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# viber.local.yml - personal overrides of four viber settings

## Goal

A team member cannot today change, for themselves only, the model range a build runs with, the
baseline test run or GitHub issue handling without editing the shared, committed
`.claude/viber.yml`. An optional, git-ignored `.claude/viber.local.yml` lets each person override
exactly those settings while the shared file stays the team's.

## Acceptance criteria

1. `config.sh` reads an optional `<repo root>/.claude/viber.local.yml` written in the same group
   layout as `viber.yml`; a valid `tiers.min`, `tiers.max`, `build.baseline-tests` or
   `github.issues` there replaces that single key of the shared file, every other key keeping the
   shared value.
2. An invalid value of one of those four keys in the local file is ignored and the shared value
   stands; the rule "min above max resets both" runs on the merged result.
3. Any other key in the local file is ignored. When the local file exists, the block carries one
   comment line naming the overridden and the ignored keys, and the `<key>: <value>` lines keep
   their current format and order.
4. Without the local file, `config.sh` prints exactly what it prints today; it always exits 0.
5. `templates/gitignore.txt` carries `.claude/viber.local.yml`, and `bootstrap.sh` appends that
   entry to an existing `.gitignore` when no rule ignores the file yet, reporting that append on a
   line of its own; a run that appends nothing prints no line about the local file.
6. The `viber.yml` template (comment only, `schema:` unchanged), `viber/README.md`, `help.html`
   and this repository's own `.gitignore` describe or carry the local file; `config.test.ts` and
   `bootstrap.test.ts` cover the new cases. The `CLAUDE.switches.md` part of this criterion is
   delivered by the build's memory close (`build.memory` on), never by a task.

## Scope

### File map

- modify - viber/scripts/config.sh - reads the local file, merges the four keys, prints the
  local comment line; its header contract describes both
- modify - tests/viber/config.test.ts - proves the overlay, the ignore rules and the unchanged
  output without a local file
- modify - viber/skills/setup/scripts/bootstrap.sh - the `.gitignore` entry for the local file
  and its report line; header contract
- modify - viber/skills/setup/templates/gitignore.txt - carries `.claude/viber.local.yml`
- modify - tests/viber/bootstrap.test.ts - proves the entry and its lines
- modify - viber/skills/setup/templates/viber.yml - a comment paragraph of its own, after the
  opening paragraph, naming the local file and its four keys
- modify - viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg
  - the setup line names the `.gitignore` rules in the plural
- modify - viber/README.md - "Optional switches" and "Where it writes" mention the local file
- modify - viber/skills/setup/assets/help.html - configuration reference paragraph, "What
  /viber:setup does" list and the setup card's "Writes" entry, in English and Polish
- modify - .gitignore - ignores `.claude/viber.local.yml` in this repository

### Out of scope

- `/viber:setup` never creates `.claude/viber.local.yml`; the file carries no `schema:` and
  `bootstrap.sh`'s merge never reads or writes it.
- The `SessionStart` hook (`session-start.sh`), `plan-path.sh`, `archive-run.sh` and
  `config.sh --branching` never read the local file: `directories.*`, `branching.*`,
  `planning.*` and the other `build.*` keys are not overridable.
- `switch-text.sh`, `plan-gate.sh`, `issue-templates.sh` and `pr-facts.sh` are not edited and
  their readers see no change.
- `CLAUDE.switches.md`, `viber/scripts/CLAUDE.md` and the `tests/` nodes are updated by the
  build's own close under `build.memory`, never by a task.
- The switch count sentences in README and `help.html` stay as they are: no switch is added.

## Tasks

<!-- TASK -->
### T1 - Overlay the four local keys in config.sh
- TDD: required
- Covers: #1, #2, #3, #4
- Uses: C1, C2
- Depends-on: none
- Files: viber/scripts/config.sh, tests/viber/config.test.ts
- Delivers: `config.sh` resolving the block from `viber.yml` with the four keys of C1 overridden from `.claude/viber.local.yml` at the repository root, the C2 comment line when that file exists, and its header contract describing the local file. Binding constraints: runs on bash 3.2 (macOS) and Git Bash (Windows); a shell value reaches awk only through `ENVIRON`, never `awk -v`; no apostrophe anywhere inside a single-quoted awk block; fail-open, exit always 0.
- Verification: bash -n viber/scripts/config.sh && node --test --test-reporter=dot tests/viber/config.test.ts tests/viber/switch-text.test.ts tests/portability.test.ts -> exit 0, every test passes
- DoD: a local file setting all four keys to valid values prints the local value on each of their four lines and the shared value on every other line; a local file setting only `tiers.max: fable` over a shared `min: sonnet` prints `tiers.min: sonnet` and `tiers.max: fable`; an invalid local value (`max: gpt`, `issues: maybe`, `baseline-tests: half`) leaves the shared value on that line and names the key under `ignored:`; a local `build.memory`, `planning.adr` or `directories.runs` leaves that line at the shared value and is named under `ignored:`; a key repeated in the local file is named once, and in a local `branching:` group `branching.work` is named while the entry lines nested under it are not; a merged range with min above max prints `tiers.min: haiku` and `tiers.max: opus`; with a local file present the second stdout line is the C2 comment line and the key lines follow in the existing order; without a local file stdout is unchanged, every existing `config.test.ts` case passing unmodified; a local file in the repository root is read from a session started in a subdirectory; an unreadable or malformed local file still exits 0; `--branching` output is identical with and without a local file carrying a `branching:` group
<!-- /TASK -->

<!-- TASK -->
### T2 - Ignore viber.local.yml in the project gitignore
- TDD: required
- Covers: #5
- Uses: C1, C3
- Depends-on: none
- Files: viber/skills/setup/scripts/bootstrap.sh, viber/skills/setup/templates/gitignore.txt, tests/viber/bootstrap.test.ts
- Delivers: `bootstrap.sh` making sure the project's `.gitignore` ignores `.claude/viber.local.yml`, reporting an append with the C3 lines, and the bundled template already carrying the entry; header contract updated. The existing `bootstrap.test.ts` cases that assert an existing `.gitignore`'s bytes after a run now expect the appended `.claude/viber.local.yml` line too: those expectations move with this change. Binding constraints: runs on bash 3.2 (macOS) and Git Bash (Windows); a shell value reaches awk only through `ENVIRON`, never `awk -v`; no apostrophe anywhere inside a single-quoted awk block; fail-open, exit always 0.
- Verification: bash -n viber/skills/setup/scripts/bootstrap.sh && node --test --test-reporter=dot tests/viber/bootstrap.test.ts tests/portability.test.ts -> exit 0, every test passes
- DoD: a fresh repository gets `.gitignore` from the template, which holds the line `.claude/viber.local.yml`, and stdout is unchanged from today, carrying no local-file line; an existing `.gitignore` with no rule for the file gets `.claude/viber.local.yml` on its own line, also when the file ends without a newline, and stdout carries `.gitignore: .claude/viber.local.yml appended` right after the `.temp/` line; an existing `.gitignore` whose rule already ignores the file (`*.local.yml`) is left byte-identical and stdout carries no local-file line; a second run leaves `.gitignore` byte-identical and its stdout carries no local-file line; a run from a subdirectory of a fresh repository leaves the seeded `.gitignore` byte-identical to the template and prints no local-file line; outside a git repository the entry is appended only when no line reads exactly `.claude/viber.local.yml`; the script exits 0 in every case
<!-- /TASK -->

<!-- TASK -->
### T3 - Document the local overrides file
- TDD: none
- Covers: #6
- Uses: C1
- Depends-on: T1, T2
- Files: viber/skills/setup/templates/viber.yml, viber/README.md, viber/skills/setup/assets/help.html, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg, .gitignore
- Delivers: the template comment, the README, the help page in both languages and this repository's `.gitignore` describing or carrying `.claude/viber.local.yml`: what it is, the four keys it can override, that it stays out of git and that setup adds it to `.gitignore`; both flow SVGs naming the setup's `.gitignore` rules in the plural.
- Verification: grep -c "viber.local.yml" viber/skills/setup/templates/viber.yml viber/README.md viber/skills/setup/assets/help.html viber/scripts/config.sh viber/skills/setup/templates/gitignore.txt && grep -c "gitignore rules\|reguły .gitignore" viber/skills/setup/assets/viber-flow-en.svg viber/skills/setup/assets/viber-flow-pl.svg && git check-ignore .claude/viber.local.yml && node --test --test-reporter=dot tests/viber/help.test.ts tests/viber/bootstrap.test.ts tests/viber/config.test.ts tests/orphan-tags.test.ts tests/portability.test.ts -> every grep count is 1 or more, check-ignore prints `.claude/viber.local.yml`, every test passes
- DoD: the template carries a comment paragraph of its own, separated by blank lines, after the opening paragraph and before the `schema:` comment block, naming `.claude/viber.local.yml` and the four keys, its opening paragraph and `schema:` line unchanged; both flow SVGs name the `.gitignore` rules in the plural; README names the file and its four keys in "Optional switches" and the gitignore entry in "Where it writes"; `help.html` names the file in the configuration reference and the setup entries in both `lang="en"` and `lang="pl"`; `git check-ignore .claude/viber.local.yml` in this repository prints the path; `help.test.ts`, `bootstrap.test.ts` and `config.test.ts` pass with the edited template
<!-- /TASK -->

## Contracts

### C1 - Local overrides file

File: none

Path: `<repo root>/.claude/viber.local.yml` (outside a repository: `.claude/viber.local.yml`
under the cwd). Same layout and key grammar as `viber.yml`: a group is `<group>:` at column 0,
its children indented below it, the first assignment of a child wins, a CR is never part of a
value.

Overridable keys and their valid values (letter case ignored):

| key | valid values |
| --- | --- |
| `tiers.min` | `haiku`, `sonnet`, `opus`, `fable` |
| `tiers.max` | `haiku`, `sonnet`, `opus`, `fable` |
| `build.baseline-tests` | `off`, `fast`, `full`, `true`, `false` (`true` -> `full`, `false` -> `off`) |
| `github.issues` | `true`, `false` |

Resolution per key: a valid local value wins; otherwise the shared value as resolved today.
`tiers`: when the merged min ranks above the merged max, both reset to `haiku` / `opus`.

Ignored: every other direct child of any group, every column-0 key carrying a value, and any of
the four keys with an empty or invalid value. A direct child is a key line at the indentation of
the first key line inside its group; a deeper line is neither read nor named. Each ignored key is
named once, at its first occurrence, however often the file repeats it.

### C2 - config.sh local line

File: viber/scripts/config.sh

Printed only when the local file exists, as the second stdout line, directly after
`# viber config (resolved)`:

```
# local: <overridden> | ignored: <ignored>
```

- `<overridden>`: the dotted keys of C1 that took a local value, in block order, joined by `, `;
  `none` when empty.
- `<ignored>`: the ignored keys of C1 in file order, a group child as `<group>.<key>`, a column-0
  key as `<key>`, joined by `, `; `none` when empty.

Example: `# local: github.issues, tiers.max | ignored: build.memory`

Every other line of the block, and its order, is unchanged. Exit always 0.

### C3 - bootstrap.sh local-file gitignore lines

File: viber/skills/setup/scripts/bootstrap.sh

Checked only when `<root>/.gitignore` exists after the `.temp/` step. When the file is already
ignored, nothing is written and no line is printed. Otherwise the entry is appended and exactly
one of these lines is printed, directly after the `.temp/` `.gitignore` line:

```
.gitignore: .claude/viber.local.yml appended
.gitignore: could not write <root>/.gitignore
```

Inside a repository "already ignored" means `git check-ignore`, run against the repository root
(`git -C "<root>"`, whatever the cwd), reports `.claude/viber.local.yml` ignored; outside one, a line reading exactly `.claude/viber.local.yml` (surrounding blanks
allowed). The appended entry is `.claude/viber.local.yml` on its own line.
