# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Replace superdev docs layer with changelog, persist intent, add gated run cleanup"
Plan: C:\Users\dariu\.claude\plans\quizzical-giggling-shore.md

---
<!-- HEADER -->

## Goal
superdev keeps four knowledge layers - memory, rules, adr, and a new `changelog` layer that replaces `docs` entirely. Every completed build (when `changelog: true`) writes one append-only entry `docs/changelog/<YYYY-MM-DD>-<slug>.md` plus one index line in `docs/changelog/README.md`, carrying the build's intent, decisions (with the ADR link), deviations and areas. The `intent` skill persists its confirmed synthesis to `docs/.workflows/<yyyyMMdd>-<slug>-intent.md`, lets the user stop there and resume later with `intent <path>`, and reads prior changelog entries + ADRs through an explicit history Explore agent. The `Intent:` path travels spec -> plan -> `decompose.sh` -> build close-out. A new `cleanup` switch makes both build orchestrators call `scripts/cleanup-run.sh` after close-out, which removes the run's working files (workdir, spec, intent) once every task is done and commits the removal.

## Context
Today the interview synthesis is never written to disk, `docs/.workflows/` is written once and never read back, and the `docs` layer (`superdev-docs` + `superdev-docs-writer`, `docs/product/`) is the only layer planning reads - as user intent, a role the user no longer wants. The confirmed design (interview): full replacement of docs by changelog (writer fork only, no interactive front, no backfill), ADR kept and linked from the changelog entry, two close-out waves so the changelog writer receives the ADR path, a `cleanup` switch driving a deterministic script that the orchestrator trusts, and the intent file with a resume mode. Repo conventions: skills are markdown, scripts are bash with an English/Polish header I/O contract, regression suites live in `tests/` and run with `node --test "tests/**/*.test.ts"` (portability sweep enforces shebang + no CRLF + exec bit only for bare invocations; every SKILL.md invokes `scripts/*.sh` as `bash "${CLAUDE_PLUGIN_ROOT}/scripts/x.sh"`, so mode 100644 is fine for the new script).

## Acceptance criteria
1. `superdev/scripts/read-config.sh` prints the header and exactly `adr`, `rules`, `memory`, `changelog`, `cleanup` in that order (no `docs` line), all `false` when `.claude/superdev.yml` is missing; `superdev/skills/setup/assets/config.yml` seeds the same five keys; `bootstrap.sh` reports them; `tests/superdev/read-config.test.ts` and `tests/superdev/bootstrap.test.ts` pass.
2. `superdev/scripts/cleanup-run.sh <workdir> [commit-prefix]` on a completed run (status.md task number equals the highest `tasks/task-NN.md`) removes the workdir, the spec named by `Spec:` in `plan-header.md` and the intent named by `Intent:` (each only when present), commits `chore(<prefix>): clean up run <slug>` and prints `CLEANUP: <workdir> (removed)`; on an incomplete run it removes nothing, exits 0 and prints `CLEANUP: <workdir> (skipped - <reason>)`; outside a git repository it removes the files, skips the commit and prints `CLEANUP: <workdir> (removed - no git repository)`; a workdir outside `docs/.workflows/` (including an absolute path) is skipped with exit 0 and `CLEANUP: <workdir> (skipped - not a superdev run dir)`; `tests/superdev/cleanup-run.test.ts` passes.
3. `decompose.sh` copies a plan's `Intent:` preamble line (trailing HTML comment stripped) into `plan-header.md` and prints `intent: <path>` in the stdout index; a plan with no `Intent:` line produces neither and still exits 0; an `Intent:` path whose file is missing produces a stderr warning and no `intent:` line; `tests/superdev/decompose.test.ts` passes.
4. `superdev/skills/superdev-changelog-writer/SKILL.md` exists as a fork writer (`context: fork`, `model: opus`, `user-invocable: false`, description "Invoked only by superbuild or simplebuild skill.") with a `resolve-input.sh` preload for `capture '?intent' '?spec' '?adr'`, inline `notes:` and `workdir:` parsing, writes `docs/changelog/<workdir-basename>.md` in the format of its `references/entry-format.md`, prepends one index line to `docs/changelog/README.md` (creating it with a `# Changelog` heading when absent), never edits an existing entry, and returns only `VERDICT:` + `CHANGELOG: <path> (created)` + `INDEX: docs/changelog/README.md (created|updated)` or `REASON:`; `superdev/.claude-plugin/plugin.json` lists it.
5. `superbuild/SKILL.md` and `simplebuild/SKILL.md`: Config paragraph names the five switches; Step 4 runs wave 1 (`adr`, `memory`, `rules`, parallel) then wave 2 (`changelog: true` -> `superdev-changelog-writer` with `capture:`, `workdir:`, `notes:`, optional `intent:` from the decompose index, optional `spec:` on superbuild, optional `adr:` from wave 1's `ADR: <path>` line), relays `CHANGELOG:` / `INDEX:` lines, commits `chore(<track>): close out adr, memory, rules and changelog`; Step 5 runs `bash "${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-run.sh" <workdir> <track>` when `cleanup: true` and relays its `CLEANUP:` line verbatim; the word `docs` no longer appears as a switch, a delegation or a GAP mapping in either file.
6. `superdev/skills/superdev-docs/` and `superdev/skills/superdev-docs-writer/` are deleted; `grep -rn "docs/product\|superdev-docs" superdev/skills/ superdev/.claude-plugin/ superdev/scripts/` returns nothing; `intent`, `superplan` and `simpleplan` no longer carry the `docs/product` contradiction gate (the `superdev/README.md` mentions are removed in criterion #9).
7. `intent/SKILL.md`: after the user confirms the synthesis it writes `docs/.workflows/<yyyyMMdd>-<slug>-intent.md` in the format fixed in Task 7 Contracts, then the handoff `AskUserQuestion` offers Simple / Spec / Stop here (telling the user to resume with `intent <path>`); when `$ARGUMENTS` is a path to an existing `*-intent.md` it skips exploration and interview, presents that file's synthesis, lets the user reopen one named decision (interview only that branch, overwrite the file in place) and goes to the gate; the Explore batch contains one explicit history agent (changelog index -> matched entries -> linked ADRs, plus an independent `Grep docs/adr/`) whose findings enter the interview as decision context, never as requirements, and skips silently when neither `docs/changelog/` nor `docs/adr/` exists.
8. The `Intent:` path propagates: `superspec/templates/spec.md` and `superplan/templates/plan.md` and `simpleplan/templates/plan.md` carry an `Intent:` preamble line; `superspec` writes it from the handoff, `superplan` copies it from the spec, `simpleplan` takes it from the handoff; `superspec-refine` keeps it; `intent`'s handoff passes the intent path to `superspec` / `simpleplan`; a plan without the line still decomposes (criterion 3).
9. `superdev/README.md`, `README.md`, `CLAUDE.md`, `superui/CLAUDE.md` and `docs/assets/superdev-flow.svg` describe the changelog layer, the `changelog` and `cleanup` switches, the intent file and `docs/.workflows/` as per-run working files removed after a completed build when `cleanup: true`; `grep -rn "docs/product\|superdev-docs" --include=*.md --include=*.svg --include=*.json --include=*.yml --include=*.sh --include=*.ts .` (excluding `docs/.workflows/`) returns nothing; `.claude/superdev.yml` in this repo carries the five keys, all `false`.
10. `node --test "tests/**/*.test.ts"` passes from the repo root.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - Rename the docs switch to changelog and add the cleanup switch
- Covers: criteria #1
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/scripts/read-config.sh (key loop `for key in adr rules memory docs`, header comment key list)
- modify - superdev/skills/setup/assets/config.yml (`docs:` line)
- modify - superdev/skills/setup/scripts/bootstrap.sh (grep pattern on line 60, seeded-defaults message on line 63, header comment lines 27-31)
- modify - tests/superdev/read-config.test.ts (`expectedBody`, every fixture/assertion naming `docs`, the fixed-order test)
- modify - tests/superdev/bootstrap.test.ts (seeded-defaults line, the idempotence expected stdout block)
- modify - .claude/superdev.yml (this repo's own config)

### Test Commands
#### Build
- none - the repo has no build step (markdown + bash ship as-is)

#### Tests
- `node --test tests/superdev/read-config.test.ts` -> `# fail 0`
- `node --test tests/superdev/bootstrap.test.ts` -> `# fail 0`

### Approach
1. In `read-config.sh` change the loop to `for key in adr rules memory changelog cleanup` and update the header comment's key list.
2. In `config.yml` replace the `docs:` line with `changelog: false   # Changelog -> docs/changelog/` and add `cleanup:   false   # Remove run files (docs/.workflows/<run>, spec, intent) after a completed build`; keep the column alignment style of the existing lines.
3. In `bootstrap.sh` change the grep alternation to `(adr|rules|memory|changelog|cleanup)` and the seeded message to `... defaults: adr=false, rules=false, memory=false, changelog=false, cleanup=false`; update the header comment.
4. Update `read-config.test.ts`: `expectedBody(adr, rules, memory, changelog, cleanup)` with five lines, every fixture that wrote `docs: true` now writes `changelog: true`, add one fixture proving `cleanup: true` resolves and that a leftover `docs: true` key is ignored; the fixed-order test names the five keys.
5. Update `bootstrap.test.ts` to the new seeded-defaults line and the two new asset lines in the idempotence block (must equal `config.yml` byte for byte).
6. Rewrite `.claude/superdev.yml` to the five keys, all `false`.

### Edge cases
- A host config still carrying `docs: true` resolves to nothing - the key is simply not in the loop (covered by the new test).

### Contracts
- `read-config.sh` stdout: `# superdev config (resolved)` then `adr: <bool>`, `rules: <bool>`, `memory: <bool>`, `changelog: <bool>`, `cleanup: <bool>`.

### DoD
Both test files pass; `bash superdev/scripts/read-config.sh` in this repo prints five `false` lines.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Add cleanup-run.sh with its regression suite
- Covers: criteria #2
- TDD: none

### Dependencies
- none

### Files
- add - superdev/scripts/cleanup-run.sh
- add - tests/superdev/cleanup-run.test.ts

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/superdev/cleanup-run.test.ts` -> `# fail 0`
- `node --test tests/portability.test.ts` -> `# fail 0`

### Approach
1. Write `cleanup-run.sh` (`#!/usr/bin/env bash`, `set -euo pipefail`, header I/O contract in the style of `decompose.sh`): args `<workdir> [commit-prefix]` (prefix default `simplebuild`); missing arg or missing dir -> usage on stderr, exit 1.
2. Safety guard: the normalized workdir path (leading `./` and trailing `/` stripped) must start with `docs/.workflows/` (so an absolute path is refused too - the orchestrator always passes decompose's relative `workdir:`; state this in the header contract) and contain `status.md`; otherwise print `CLEANUP: <workdir> (skipped - not a superdev run dir)` and exit 0.
3. Completion check: `last` = number from `status.md` `task: NN`; `highest` = max NN over `tasks/task-*.md` (no task files -> `00`); `10#$last -ne 10#$highest` or `highest` is `00` -> print `CLEANUP: <workdir> (skipped - build not complete: task <last> of <highest>)`, exit 0, nothing removed.
4. Resolve extra files from `plan-header.md`: `spec` = value of the first `Spec:` line, `intent` = value of the first `Intent:` line (trim spaces, drop a trailing `<!-- ... -->`); keep each only when non-empty and the file exists.
5. Removal: `slug` = workdir basename with the leading `YYYY-MM-DD-` stripped. Outside a git repo (`git rev-parse --git-dir` fails) -> `rm -rf` the workdir and `rm -f` the resolved files, print `CLEANUP: <workdir> (removed - no git repository)`, exit 0. Inside git -> for each target: `git rm -r -q --ignore-unmatch -- <target> >&2` (removes tracked files from index and working tree) then `rm -rf <target>` (clears untracked leftovers); if `git diff --cached --quiet` -> print `CLEANUP: <workdir> (removed - nothing to commit)`; else `git commit -q -m "chore(<prefix>): clean up run <slug>" >&2` and print `CLEANUP: <workdir> (removed)`.
6. Write `cleanup-run.test.ts` with `withGitRepo` / `withTempDir` from `tests/harness/tmp.ts`, `runScript(SUT, args, { cwd, env, shell: "bash" })` as in `commit-task.test.ts`, and `slash()` for printed paths. Fixture builder creates `docs/.workflows/2026-01-02-demo/{status.md,plan-header.md,tasks/task-01.md,tasks/task-02.md,implementation/}` plus optional `docs/.workflows/20260102-demo.md` (spec) and `docs/.workflows/20260102-demo-intent.md`, committed first. Cases: complete run with spec + intent -> all three gone, commit subject `chore(simplebuild): clean up run demo`, stdout `CLEANUP: ... (removed)`; prefix arg -> `chore(superbuild): ...`; incomplete (`task: 01` of 02) -> nothing removed, `skipped - build not complete`, exit 0; no `Spec:`/`Intent:` lines -> only the workdir removed; `Intent:` naming a missing file -> ignored; workdir outside `docs/.workflows/` -> `skipped - not a superdev run dir`, dir untouched; no git repo -> files removed, `removed - no git repository`; missing arg -> exit 1.

### Edge cases
- `status.md` unparsable -> treated as `00` -> skipped as incomplete.
- Workdir passed with a trailing slash or `./` prefix -> normalized before the guard and before printing.
- Spec/intent path already deleted (second run) -> silently skipped; a workdir already gone -> exit 1 (missing dir).

### Contracts
- stdout: exactly one line `CLEANUP: <workdir> (removed|removed - no git repository|removed - nothing to commit|skipped - <reason>)`; all git output on stderr; exit 0 for every documented outcome except missing/invalid args (exit 1).

### DoD
`cleanup-run.test.ts` green on Git-Bash and POSIX; portability sweep green (shebang, no CRLF).

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Propagate the Intent line through decompose.sh
- Covers: criteria #3
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/scripts/decompose.sh (preamble block after `spec_line`, header write block, stdout index after `spec:`, header comment)
- modify - tests/superdev/decompose.test.ts (`simplePlan` / `superPlan` fixture builders gain an optional `intentPath`, new assertions)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/superdev/decompose.test.ts` -> `# fail 0`

### Approach
1. After the `spec_line` handling add `intent_line="$(grep -m1 '^Intent:' "$plan" || true)"`, strip a trailing HTML comment the same way, derive `intent_path` (trimmed value); when non-empty and the file is missing: `echo "warning: intent file not found: $intent_path (from plan's 'Intent:' line) - omitted" >&2` and set `intent_path=""` (keep `intent_line` out of the header too).
2. In the header write block print `$intent_line` after `$spec_line` when `intent_path` is non-empty.
3. In the stdout index print `intent: $intent_path` right after the optional `spec:` line, only when non-empty.
4. Update the header comment (index listing) to document `intent: <path>   (only when the plan has an Intent: line naming an existing file)`.
5. Tests: fixture with `Intent: <existing file>` on both tracks -> `plan-header.md` contains the line and stdout has `^intent: <path>$` (compare via `slash()`); fixture without the line -> neither; fixture naming a missing file -> stderr warning, no `intent:` line, exit 0.

### Edge cases
- `Intent:` line present on the simpleplan track (no `Spec:`) -> header holds `Title:` then `Intent:`.
- Resume run (workdir pre-exists) -> header is rewritten every run as today, so the line is always current.

### Contracts
- decompose stdout index gains the optional line `intent: <path>` between `spec:` (optional) and the task rows.

### DoD
`decompose.test.ts` green; the existing index assertions unchanged.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Rewire both build orchestrators: two close-out waves and the cleanup step
- Covers: criteria #5
- TDD: none

### Dependencies
- Task 1 - blocks: Config paragraph names the five switches
- Task 2 - blocks: Step 5 calls cleanup-run.sh
- Task 3 - blocks: Step 4 reads `intent:` from the decompose index
- Task 4 - blocks: Step 4 invokes superdev-changelog-writer

### Files
- modify - superdev/skills/superbuild/SKILL.md (Config paragraph line 24, Step 1 index description line 42, Step 4 lines 84-94, Step 5 lines 96-100)
- modify - superdev/skills/simplebuild/SKILL.md (Config paragraph line 24, Step 1 index description line 42, Step 4 lines 80-90, Step 5 lines 92-96)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/portability.test.ts` -> `# fail 0`
- `grep -n "docs" superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` -> only `docs/adr` and `docs/.workflows` hits, no `docs:` switch, no `superdev-docs`

### Approach
1. Config paragraph: `These gate the Close-Out delegations (Step 4: adr, rules, memory, changelog) and the run cleanup (Step 5: cleanup).`
2. Step 1 index description: add `intent:` intent path (optional) after `spec:` (superbuild) / after `plan:` (simplebuild).
3. Step 4 item 2 becomes "Wave 1 - gated by Config; run only the enabled ones, in parallel (single message, await all)": the existing `adr` / `memory` / `rules` bullets unchanged; delete the `docs` bullet. New item 3 "Wave 2 - `changelog: true` -> after wave 1 completes, invoke `superdev-changelog-writer` (Skill) with a labeled-line args block - `capture: <plan-copy path>`, `workdir: <workdir>`, `notes: <workdir>/implementation/`, plus `intent: <intent path>` only when the decompose index printed an `intent:` line, `spec: <spec path>` (superbuild only), and `adr: <path>` only when wave 1 returned `ADR: <path>` other than `none`." Nothing enabled in either wave -> skip to the commit.
4. Tagged-line list becomes `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` / `GAP:`; commit message `chore(<track>): close out adr, memory, rules and changelog`.
5. Step 5: new first item - `cleanup: true` -> run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-run.sh" <workdir> superbuild` (resp. `simplebuild`) and keep its `CLEANUP:` line; the script verifies completion itself - never re-check, never retry. Then the summary: relayed lines now `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` / `CLEANUP:`; GAP mapping keeps only `-> run superdev-memory` and `-> run superdev-rules`.

### Edge cases
- Wave 1 disabled entirely but `changelog: true` -> wave 2 still runs, without `adr:`.
- `cleanup: true` on an aborted build never reaches Step 5 (the orchestrator only gets there after Close Out), so nothing is removed mid-build.

### Contracts
- Consumes `cleanup-run.sh` stdout `CLEANUP: ...` (Task 2), decompose `intent:` line (Task 3), writer output `CHANGELOG:` / `INDEX:` (Task 4).

### DoD
Both orchestrators describe the two waves and the cleanup step; grep check passes; portability sweep green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - Remove the docs layer and its planning-side gate
- Covers: criteria #6
- TDD: none

### Dependencies
- Task 5 - blocks: the orchestrators must stop invoking superdev-docs-writer before its directory is deleted

### Files
- delete - superdev/skills/superdev-docs/SKILL.md
- delete - superdev/skills/superdev-docs-writer/SKILL.md
- delete - superdev/skills/superdev-docs-writer/references/doc-format.md
- modify - superdev/.claude-plugin/plugin.json (`skills[]` - remove `./skills/superdev-docs/` and `./skills/superdev-docs-writer/`)
- modify - superdev/skills/intent/SKILL.md (remove line 15, the `docs/product` Explore bullet)
- modify - superdev/skills/superplan/SKILL.md (remove line 64, the `docs/product` self-review bullet)
- modify - superdev/skills/simpleplan/SKILL.md (remove line 64, the `docs/product` self-review bullet)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `grep -rn "docs/product\|superdev-docs" superdev/skills/ superdev/.claude-plugin/ superdev/scripts/` -> no output, exit 1
- `node --test tests/portability.test.ts` -> `# fail 0`

### Approach
1. `git rm -r superdev/skills/superdev-docs superdev/skills/superdev-docs-writer`.
2. Remove the two entries from `plugin.json`, keeping valid JSON (no trailing comma).
3. Delete the three `docs/product` bullets in `intent`, `superplan`, `simpleplan`; nothing replaces them.

### Edge cases
- none

### Contracts
- none

### DoD
grep returns nothing under `superdev/skills/`, `superdev/.claude-plugin/`, `superdev/scripts/` (README mentions are Task 9's); `plugin.json` parses (`node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"` exits 0).

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - Persist the intent file, add resume mode and the history Explore agent
- Covers: criteria #7
- TDD: none

### Dependencies
- Task 6 - blocks: edits the same `intent/SKILL.md` after the docs bullet is gone

### Files
- modify - superdev/skills/intent/SKILL.md (frontmatter `allowed-tools`, new `argument-hint`, `## Explore first`, new `## Resume from a file`, `## Synthesis`, `## Handoff`)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/portability.test.ts` -> `# fail 0` (the new `date` preload must be quoted-safe)

### Approach
1. Frontmatter: add `Write` and `Bash(date:*)` to `allowed-tools`; add `argument-hint: [path-to-intent.md]`. Add a `Date:` preload line `` !`date +%Y%m%d` `` under a short `## Run` heading (same pattern as `superspec` Publish).
2. `## Explore first`: add the bullet "History agent - always one of the parallel `Explore` agents when `docs/changelog/` or `docs/adr/` exists: grep `docs/changelog/README.md` for the request's areas, open the matched entries, follow their `ADR:` links, and independently `Grep docs/adr/` for the same areas. Report each hit as decision context (what was chosen, why, whether a rejected alternative is the one now proposed) - the interview asks whether to uphold it; history is never a requirement. Neither dir present -> skip without comment."
3. New `## Resume from a file` (placed before `## Explore first`): when `$ARGUMENTS` is a path to an existing file ending in `-intent.md`: Read it, skip Explore and the interview, present its `## Decisions` as the synthesis and ask whether to reopen one decision by number; a reopened decision runs the interview for that branch only, then the file is overwritten in place; then go to Handoff. Any other argument or none -> the normal flow.
4. `## Synthesis`: after the user confirms, write `docs/.workflows/<Date>-<slug>-intent.md` (`<slug>` = short title as slug, same rule as `superspec`) in the interview language, format per Contracts; on resume overwrite the same path.
5. `## Handoff`: the `AskUserQuestion` offers three options - Simple path, Spec path, Stop here. Stop here -> reply with the intent path and `intent <path>` as the way back, then STOP. Simple / Spec -> invoke `simpleplan` / `superspec` passing `intent: <path>` as the argument line (the receiving skill writes it into its `Intent:` preamble).

### Edge cases
- Slug collision on the same day -> overwrite is the intended behavior only on resume; on a fresh run append `-2` when the file exists.
- Resume on a path that does not exist -> say so and fall through to the normal flow using the argument as the request text.

### Contracts
- Intent file:
  ```
  # Intent: <title>
  Date: <YYYY-MM-DD>

  ## Request
  <the ask in one short paragraph, the user's own framing>

  ## Decisions
  ### <n>. <decision name>
  - Chosen: <approach>
  - Alternatives: <a> - <why rejected>; <b> - <why rejected>
  - Why: <reason>

  ## Constraints
  - <...>

  ## Out of scope
  - <...>

  ## History
  - <changelog entry or ADR consulted - upheld | changed, why> (or `none`)
  ```
- Handoff argument line to `simpleplan` / `superspec`: `intent: docs/.workflows/<yyyyMMdd>-<slug>-intent.md`.

### DoD
`intent/SKILL.md` carries the resume section, the file write, the three-option gate and the history agent bullet; portability sweep green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - Carry the Intent path through spec and plan templates
- Covers: criteria #8
- TDD: none

### Dependencies
- Task 7 - blocks: the handoff line `intent: <path>` these skills consume is defined there

### Files
- modify - superdev/skills/superspec/templates/spec.md (new `Intent:` line under the title)
- modify - superdev/skills/superspec/SKILL.md (`## Inputs`, `## Publish`)
- modify - superdev/skills/superspec-refine/SKILL.md (preserve `Intent:`)
- modify - superdev/skills/superplan/templates/plan.md (`Intent:` preamble line between `Spec:` and `Plan:`)
- modify - superdev/skills/superplan/SKILL.md (input bullets, `### Rules`)
- modify - superdev/skills/simpleplan/templates/plan.md (`Intent:` preamble line between `Title:` and `Plan:`)
- modify - superdev/skills/simpleplan/SKILL.md (input bullet, `### Rules`)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/superdev/decompose.test.ts` -> `# fail 0` (a plan rendered from the updated templates still decomposes)
- `node --test tests/superdev/review-plan.test.ts` -> `# fail 0` (the `Plan:` line lookup is unaffected by the extra preamble line)

### Approach
1. `spec.md` template: add `Intent: <path to the intent file, from the handoff; omit the line when none>` as line 2. `superspec/SKILL.md` Inputs: the handoff carries `intent: <path>` - write it into the spec's `Intent:` line; Publish: a refined spec keeps its existing `Intent:` line.
2. `superspec-refine/SKILL.md`: add "keep the spec's `Intent:` line - the rewritten spec must carry it unchanged".
3. `superplan/templates/plan.md`: add `Intent: <path copied from the spec's Intent: line; omit when the spec has none>` after `Spec:`; `superplan/SKILL.md` Rules: copy the spec's `Intent:` value into the plan preamble while drafting.
4. `simpleplan/templates/plan.md`: add `Intent: <path from the handoff's intent: line; omit when none>` after `Title:`; `simpleplan/SKILL.md` Rules: write the handoff's `intent:` path into the `Intent:` line while drafting, before the reviewer runs (same timing rule as `Plan:`).

### Edge cases
- `simpledebug` -> `simpleplan` handoff carries no `intent:` -> the line is omitted, decompose prints no `intent:` (criterion 3).
- The `Intent:` line must be written before the reviewer's PASS - a post-verdict edit re-arms the approval gate (stated in both plan skills).

### Contracts
- Preamble line `Intent: <repo-relative path>` in specs and plans; consumed by `decompose.sh` (Task 3) and `cleanup-run.sh` (Task 2).

### DoD
All seven files updated; both test files green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - Sync documentation and the flow diagram
- Covers: criteria #9, #10
- TDD: none

### Dependencies
- Task 6 - blocks: the docs layer must be gone before the docs stop mentioning it
- Task 8 - blocks: describes the final intent/spec/plan chain

### Files
- modify - superdev/README.md (Quick start steps 2-6, `## Config switches` table, `### Knowledge layers` table, `### Entry and environment` intent row)
- modify - README.md (superdev row, line 38: `product docs` -> `a build changelog`)
- modify - CLAUDE.md (superdev bullet lines 49-53; `docs/.workflows/` layout entry lines 149-150; `docs/` invariant lines 199-208; `.temp` capture dirs line 214)
- modify - superui/CLAUDE.md (line 72: `docs/product/` -> `docs/changelog/`)
- modify - docs/assets/superdev-flow.svg (line 425 text -> `changelog: true → superdev-changelog-writer (after adr)`; line 426 -> `wave 1 in parallel, changelog after it · a failed delegation does not block`; line 432 switches text -> `adr · rules · memory · changelog · cleanup`)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `grep -rn "docs/product\|superdev-docs" --include=*.md --include=*.svg --include=*.json --include=*.yml --include=*.sh --include=*.ts . | grep -v "^./docs/.workflows"` -> no output
- `node --test "tests/**/*.test.ts"` -> `# fail 0`

### Approach
1. `superdev/README.md`: Quick start step 3 gains "or stop here - the confirmed synthesis is saved to `docs/.workflows/<date>-<slug>-intent.md` and `intent <path>` resumes it"; step 6 describes the two close-out waves and the optional cleanup; switch table rows `changelog` (writes `docs/changelog/<run>.md` + index line) and `cleanup` (removes the run's working files after a completed build) replace `docs`; knowledge-layers table drops `superdev-docs`, the writer row becomes `superdev-memory-writer` / `superdev-rules-writer` / `superdev-changelog-writer`.
2. Root `README.md` superdev row wording.
3. `CLAUDE.md`: superdev bullet describes the changelog layer (writer fork only, `changelog` switch, `docs/changelog/`), the intent file and the `cleanup` switch; layout entry for `docs/.workflows/` becomes "per-run working files of superdev builds (intent, spec, plan copy, tasks, implementation reports) - removed by `cleanup-run.sh` after a completed build when `cleanup: true`; the changelog is the history"; the `docs/` invariant lists `docs/changelog/` (gated by `changelog`) instead of `docs/product/` and adds the intent file to the `docs/.workflows/` description; `.temp` capture dirs become `{memory,rules}`.
4. `superui/CLAUDE.md` line 72 and the SVG texts.
5. Run the full suite once.

### Edge cases
- The SVG text must stay inside the existing node box widths - keep the strings no longer than the current longest line in that box.

### Contracts
- none

### DoD
Repo-wide grep clean; full `node --test` run green.

<!-- /TASK -->

---
