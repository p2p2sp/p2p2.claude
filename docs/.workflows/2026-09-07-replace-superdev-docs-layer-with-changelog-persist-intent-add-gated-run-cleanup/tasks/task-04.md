
## Task 4 - Add the superdev-changelog-writer fork skill
- Covers: criteria #4
- TDD: none

### Dependencies
- none

### Files
- add - superdev/skills/superdev-changelog-writer/SKILL.md
- add - superdev/skills/superdev-changelog-writer/references/entry-format.md
- modify - superdev/.claude-plugin/plugin.json (`skills[]` - add `./skills/superdev-changelog-writer/` after `./skills/superdev-rules-writer/`)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/portability.test.ts` -> `# fail 0` (sweeps the new SKILL.md's `!` preloads for unquoted globs and unquoted `${CLAUDE_PLUGIN_ROOT}`)

### Approach
1. Frontmatter mirroring `superdev-memory-writer/SKILL.md`: `name: superdev-changelog-writer`, `description: Invoked only by superbuild or simplebuild skill.`, `context: fork`, `background: false`, `model: opus`, `effort: high`, `user-invocable: false`, `allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh:*), Bash(date:*), Bash(git rev-parse:*)`.
2. `## Input`: preload `` !`"${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh" "$ARGUMENTS" capture '?intent' '?spec' '?adr' 2>&1` `` (labels quoted for zsh); three inline pipelines in the `superbuild-adr` style (with the same "no Bash pattern: pipeline" comment) for `Notes dir:`, `Workdir:` and `ADR path:` (the `adr:` label value); `Date:` via `` !`date +%F` ``. Describe each block: `## capture` = the plan (How), `## intent` = the interview synthesis (Why, alternatives), `## spec` = What & Why, `## adr` = the ADR written for this run (the `ADR:` bullet uses the `ADR path:` value).
3. `## Derive`: entry file = `docs/changelog/<basename of Workdir>.md`; run id = that basename; `base` = value of `base:` in `<workdir>/base.md`; `head` = `git rev-parse HEAD` (fall back to `none`); title = `Title:` of the capture (quotes stripped); areas = top-level dirs/modules from every `### Files` path in the capture, deduplicated; language = language of `## intent`, else `## spec`, else `## capture`. Missing `Workdir:` or `## capture` -> `VERDICT: FAIL` + `REASON:`.
4. `## Write`: per `references/entry-format.md`; What changed from the capture confirmed against the code (Read/Grep the named files - a change the code does not show is not recorded); Why from `## intent` (chosen approach + rejected alternatives + reasons; fall back to spec's Why, then the plan's Goal/Context); Decisions = the load-bearing choices, one line each, with `ADR: <adr path>` when given; Deviations from `<notes dir>/*-notes.md` (`no deviations` when every note says so or the dir is empty). Entry file already exists -> `VERDICT: FAIL`, `REASON: entry exists - changelog entries are append-only`. Index: create `docs/changelog/README.md` with `# Changelog` + blank line when absent; insert the index line directly after the heading block (newest first).
5. `## Validate`: entry < 2k tokens (`wc -c` bytes/4), every section present, no raw plan copy; `## Output format` exactly: line 1 `VERDICT: PASS|FAIL`; on PASS `CHANGELOG: <entry path> (created)` and `INDEX: docs/changelog/README.md (created|updated)`; on FAIL line 2 `REASON: <one line>`.
6. Write `references/entry-format.md` with the template, one worked good example and a "never write these" list (raw task narration, file-by-file listing, marketing tone, links to run files that will be cleaned up).
7. Register the skill in `plugin.json`.

### Edge cases
- `## adr` absent -> no `ADR:` bullet; `## intent` absent -> Why sourced from spec/plan and a bullet `Intent: not recorded`.
- `base.md` missing or `base: none` -> `Commits: none..<head>`.
- Not a git repo -> `head` = `none`; still writes the entry.

### Contracts
- Entry file (`references/entry-format.md`):
  ```
  # <Title>

  - Date: <YYYY-MM-DD>
  - Run: <workdir basename>
  - Commits: <base SHA>..<HEAD SHA>
  - ADR: <path>            (only when given)
  - Areas: <a>, <b>

  ## What changed
  ## Why
  ## Decisions
  ## Deviations from plan
  ```
- Index line: `- <YYYY-MM-DD> - [<Title>](<YYYY-MM-DD>-<slug>.md) - <areas>`.
- Args labels consumed: `capture` (required), `workdir` (required), `notes`, `intent`, `spec`, `adr` (optional).

### DoD
Skill and reference exist, plugin.json lists the skill, portability sweep green.


### Covered criteria
4. `superdev/skills/superdev-changelog-writer/SKILL.md` exists as a fork writer (`context: fork`, `model: opus`, `user-invocable: false`, description "Invoked only by superbuild or simplebuild skill.") with a `resolve-input.sh` preload for `capture '?intent' '?spec' '?adr'`, inline `notes:` and `workdir:` parsing, writes `docs/changelog/<workdir-basename>.md` in the format of its `references/entry-format.md`, prepends one index line to `docs/changelog/README.md` (creating it with a `# Changelog` heading when absent), never edits an existing entry, and returns only `VERDICT:` + `CHANGELOG: <path> (created)` + `INDEX: docs/changelog/README.md (created|updated)` or `REASON:`; `superdev/.claude-plugin/plugin.json` lists it.
