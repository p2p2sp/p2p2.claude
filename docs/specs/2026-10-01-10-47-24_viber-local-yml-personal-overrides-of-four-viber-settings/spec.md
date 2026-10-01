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
