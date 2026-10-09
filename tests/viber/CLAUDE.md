# tests/viber - viber's script, hook and shipped-content suite

One test file per viber script, hook script or `.ts` module, named after it, plus the checks that bind shipped markdown, templates and `hooks.json` to what the scripts and `plugin.json` carry. The helpers it imports belong to `tests/harness/`; no other plugin is tested here.

## Relationships

- SUTs: `viber/scripts/`, `viber/skills/*/scripts/`, `viber/hooks/scripts/`, `viber/hooks/write/report-name.ts`, and the lens files of `viber/skills/code-auditor/references/lenses/` (their shape, and the signals rules of a single-quoted `<scope>` and no `\b`, by `lenses.unit.test.ts`, the map-signal commands of their `<lens>.signals.md` files by `lens-map-signals.test.ts`).
- `help.unit.test.ts` imports `contrastRatio` and `parseColor` from `superui/skills/pro-designer/scripts/check_contrast.ts`: changing those exports breaks a viber test.
- `viber/scripts/run-branch.sh` and `viber/hooks/register.tsx` have no test file.

## Contracts

- The shell follows the SUT's shebang: a `#!/bin/sh` script runs through `forEachShell("posix", ...)`, a `#!/usr/bin/env bash` one through `forEachShell("bash", ...)` or a plain `runScript`.
- Hook scripts run with `shell: "bash"`, the way `hooks.json` invokes them (`bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<name>.sh"`): the test proves the content, never the exec bit.
- Hook payloads and transcript fixtures are JS objects serialized with `JSON.stringify`, never hand-escaped: the scripts read raw text with grep/sed/awk and unescape it themselves, so a hand-escaped fixture proves the wrong thing.
- The report-name module exports pure functions, imported directly by its `*.unit.test.ts` file.
- `code-auditor.unit.test.ts` holds `code-auditor/SKILL.md` to the six lens files it names, every `viber:<name>` it dispatches to a file listed in `plugin.json` `agents[]`, and every tracked file outside `docs/` and the `CLAUDE.md` nodes to naming no retired script, agent or reference: retiring one adds its token to `FORBIDDEN`.
- `help.unit.test.ts` holds `viber/skills/setup/assets/help.html` to: a card per skill in `plugin.json`, the self-starting label on exactly the `user-invocable: false` skills, a line per agent, an entry per uncommented indent-0 or indent-2 key of the `viber.yml` template (plus `branching-issue-type-mappings`), every English piece paired with a Polish one, only `/viber:` commands a skill carries, no dash characters, no external load, 4.5:1 for every `--fg-*` on every `--bg-*` in both themes. Every rule is a pure function with a self-check.

## Change together

- `viber/hooks/hooks.json`: `kill-guard.test.ts` pins the `PreToolUse` entry (matcher `Bash`, run through `bash`), `plan-gate.test.ts` asserts the description names `planning.plain-plan-review`, `session-start.test.ts` asserts it names the schema note.
- `viber/skills/setup/templates/viber.yml`: `config.test.ts` asserts the template resolves to a fixed table of every default; `bootstrap.test.ts` binds the template's key list to its `schema:` number in `SCHEMA_KEYS`, so a key layout change needs a new schema number and its `SCHEMA_KEYS` entry; `help.html` needs an entry for each key.
- `viber/skills/setup/templates/gitignore.txt` and `settings.json`: `bootstrap.test.ts` and `merge-settings.test.ts` compare written files to them byte for byte, and `bootstrap.test.ts` requires the `.temp/` and `.claude/viber.local.yml` lines in `gitignore.txt`.
- `viber/skills/planner/templates/spec-lite.md` and `spec-full.md` both keep the four anchor lines `plan-index.sh` reads: `## Goal`, `## Acceptance criteria`, `### File map`, `### Out of scope`.
- A skill, agent or `viber.yml` key added or renamed in viber -> its card, line or entry in `help.html`, or `help.unit.test.ts` fails.

## Traps

- `lens-map-signals.test.ts` lifts every fenced `bash` block of a lens's `<lens>.signals.md` verbatim, replaces `<scope>` (the only placeholder a block may hold) by `.` and runs it in a throwaway repository: exit 0, or exit 1 with empty stderr, passes. Git accepts a malformed `--since` with exit 0 and an empty log, so only its fix-history window case (a 5-day-old fix listed, a 400-day-old one and a non-fix commit left out) proves the window real. Without a bash on `PATH` the cases skip and pass vacuously.
- The stale-reference sweep of `code-auditor.unit.test.ts` reads the git index and assembles its `FORBIDDEN` tokens from fragments so it passes over itself: an untracked file is not swept, and a token written whole in that test file would flag it.
- `session-start.test.ts` and `plan-hints.test.ts` compare the injected context to `viber/hooks/content/manifest.md` and `plan-hints.md` with trailing newlines trimmed: editing the content needs no test change, editing how it is emitted does.
