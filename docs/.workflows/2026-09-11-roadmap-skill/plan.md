# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Skill roadmap - podział przedsięwzięcia na fazy spec-plan-build"
Intent: docs/.workflows/2026-09-11-roadmap-skill/intent.md
Plan: C:\Users\dario\.claude-p2p2\plans\shiny-painting-minsky.md

---
<!-- HEADER -->

## Goal
Po potwierdzonym wywiadzie intentu użytkownik może wybrać w bramce handoffu czwartą opcję **Roadmap**. Nowy skill `roadmap` proponuje podział na fazy, dopracowuje go w rozmowie, bramkuje na `VERDICT: PASS` forka `roadmap-reviewer`, zapisuje `docs/.workflows/<run>/roadmap.md` i po jednym pełnym `intent.md` na fazę w `docs/.workflows/<run>/phases/NN-<slug>/`. Każda faza startuje jako `intent <intent.md fazy>` i przechodzi własny tor Simple albo Spec bez żadnej zmiany w superspec, superplan, simpleplan, superbuild i simplebuild. `decompose.sh` adoptuje katalog fazy jako workdir, `cleanup-run.sh` sprząta fazę (i korzeń po ostatniej fazie), `changelog-writer` nadaje fazie unikalny identyfikator, a `roadmap <roadmap.md>` wznawia przedsięwzięcie na podstawie statusu wyliczonego przez nowy `roadmap-status.sh`. Zadania bez faz działają dokładnie jak dziś.

## Context
Dziś jeden run to jeden `intent.md`, co najwyżej jeden `spec.md` i jeden plan w płaskim katalogu `docs/.workflows/<data>-<slug>/`. Trzy miejsca tworzą ten katalog (intent, superspec, decompose.sh), a `cleanup-run.sh` i `changelog-writer` parsują jego nazwę. Wszystko poniżej `decompose.sh` jedzie na linii `workdir:`, więc zagnieżdżenie fazy jako zwykłego workdiru wymaga zmian tylko w adopcji katalogu, sprzątaniu i identyfikatorze changelogu. Breaking change bez migracji starych runów. Reviewer roadmapu jest read-only, więc `roadmap.md` jest zapisywany jako szkic przed przeglądem, a pliki `intent.md` faz dopiero po `VERDICT: PASS`.

## Out of scope
- Diagram `docs/assets/superdev-flow.svg`.
- Zmiana nazwy katalogu `docs/.workflows/` i rule `.gitattributes`.
- Skille `simpledebug`, `superspec-refine`, `superspec`, `superplan`, `simpleplan`, `superbuild`, `simplebuild`.
- Migracja istniejących katalogów pod `docs/.workflows/`.
- Manifest `superdev/hooks/content/manifest.md`.

## Acceptance criteria
1. `superdev/scripts/roadmap-status.sh <roadmap.md>` drukuje na stdout po jednej linii `<dir><TAB><status>` na każdą linię `- Dir:` z sekcji `## Phases` (w kolejności pliku, `<dir>` = katalog roadmapu + `/` + wartość `Dir:`), a na końcu `next: <dir>` (pierwsza faza o statusie innym niż `done`) albo `next: none`; status: katalog nieobecny -> `done`; `status.md` obecny i `task: NN` równe najwyższemu `tasks/task-NN.md` (i różne od 00) -> `done`; `status.md` obecny w innym przypadku -> `building`; brak `status.md`, obecny `spec.md` lub `plan.md` -> `planned`; w przeciwnym razie -> `pending`. Brak argumentu lub pliku -> usage na stderr, exit 1; brak linii `- Dir:` -> błąd na stderr, exit 3.
2. `decompose.sh` adoptuje jako workdir pełny `dirname` ścieżki z linii `Intent:` (albo `Spec:`) leżącej pod `docs/.workflows/` - dla `docs/.workflows/<run>/phases/01-x/intent.md` workdir to `docs/.workflows/<run>/phases/01-x`, katalog `<run>` pozostaje nietknięty; płaski run i fallback do `docs/.workflows/<data>-<slug>` zachowują dzisiejsze zachowanie.
3. `cleanup-run.sh` wywołany na ukończonym katalogu fazy (`.../phases/NN-<slug>`) usuwa tylko ten katalog; gdy po usunięciu w `phases/` nie ma już żadnego podkatalogu, usuwa w tym samym commicie także `phases/` i korzeń runu (`intent.md`, `roadmap.md`) i drukuje `CLEANUP: <dir> (removed - last phase, run root removed)`; slug commita fazy to `<slug runu bez daty>-<basename fazy>`; płaski run zachowuje dzisiejsze komunikaty i zachowanie.
4. `superdev/agents/changelog-writer.md` wyprowadza identyfikator runu jako `<basename dziadka>-<basename workdiru>`, gdy rodzic workdiru nazywa się `phases`; w przeciwnym razie basename workdiru jak dziś.
5. Skill `superdev/skills/roadmap/SKILL.md` przyjmuje `intent: <ścieżka>` z handoffu, gołą ścieżkę do `intent.md` albo do `roadmap.md`; dla `intent.md` czyta go, proponuje fazy w prozie (tytuł, cel, pokryte decyzje, sprawdzalny efekt, zależności), prowadzi rozmowę do potwierdzenia, zapisuje `roadmap.md` obok intentu wg `references/roadmap-template.md`, bramkuje na `VERDICT: PASS` skilla `roadmap-reviewer` (maks. 3 rundy), po PASS zapisuje `phases/NN-<slug>/intent.md` wg `intent-template.md` i kończy bramką `AskUserQuestion` (start pierwszej fazy przez `intent <ścieżka>` albo stop); dla `roadmap.md` uruchamia `roadmap-status.sh`, pokazuje status faz i proponuje pierwszą fazę nie-`done`; ścieżka intentu pod `phases/` -> odmowa zagnieżdżania i stop.
6. Skill `superdev/skills/roadmap-reviewer/SKILL.md` jest forkiem read-only (`allowed-tools: Read, Grep, Glob`, `disallowed-tools` od `Bash`), przyjmuje blok `roadmap:` / `intent:` / `checklist:` / `round:` / `prior-blocking:` i zwraca `VERDICT:` / `FINDINGS:` / `BLOCKED:` / `NOTES:` wg `superdev/skills/roadmap/references/checklist.md` (każda decyzja intentu w dokładnie jednej fazie, zależności tylko od faz wcześniejszych, faza 01 bez zależności, każda faza z niepustym `Delivers:`, `Dir:` zgodny z numerem fazy, brak placeholderów).
7. Bramka handoffu w `superdev/skills/intent/SKILL.md` ma cztery opcje (Simple / Spec / Roadmap / Stop); opcja Roadmap uruchamia `roadmap` z `intent: <ścieżka>` i jest pomijana, gdy ścieżka pliku intentu zawiera segment `phases/`.
8. `superdev/.claude-plugin/plugin.json` wymienia `./skills/roadmap/` i `./skills/roadmap-reviewer/`; `superdev/README.md`, root `CLAUDE.md` i komentarz `cleanup` w `superdev/skills/setup/assets/config.yml` opisują fazy; `node --test "tests/**/*.test.ts"` jest zielony (w tym `tests/portability.test.ts` dla nowego skryptu).

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superdev): add roadmap-status.sh phase status script with tests
- Covers: criteria #1, #8
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none - blocks: Task 5

### Files
- add - superdev/scripts/roadmap-status.sh (`roadmap-status.sh`)
- add - tests/superdev/roadmap-status.test.ts

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/superdev/roadmap-status.test.ts"` - expected: all tests pass
- `node --test "tests/portability.test.ts"` - expected: pass (shebang, no CRLF, exec bit 100755 because the roadmap skill invokes the script directly)

### Approach
1. Write `superdev/scripts/roadmap-status.sh` with `#!/usr/bin/env bash`, `set -euo pipefail`, a header comment carrying the full I/O contract from criterion #1 (arguments, output lines, status rules, exit codes), in the style of `superdev/scripts/status-update.sh`.
2. Parse: `roadmap="${1:-}"`; missing -> `error: missing required parameter 'roadmap-file'` + `usage: roadmap-status.sh <roadmap-file>` on stderr, exit 1; not a file -> `error: roadmap file not found: <path>`, exit 1. `base="$(dirname -- "$roadmap")"` with `\` normalised to `/`.
3. Collect `Dir:` values with `sed -n 's/^-[[:space:]]*Dir:[[:space:]]*//p'` (trim trailing spaces); none -> `error: no '- Dir:' lines found in <path>` on stderr, exit 3.
4. For each value compute `dir="$base/$value"` (strip a leading `./` from `base` so a roadmap passed as `./docs/...` prints `docs/...`) and the status: `[[ ! -d "$dir" ]]` -> `done`; `[[ -f "$dir/status.md" ]]` -> parse `last` from `task: NN` (unparsable -> 00) and `highest` from `tasks/task-*.md` exactly as `superdev/scripts/cleanup-run.sh` does (10# arithmetic), `highest != 00 && last == highest` -> `done` else `building`; else `[[ -f "$dir/spec.md" || -f "$dir/plan.md" ]]` -> `planned`; else `pending`. Print `printf '%s\t%s\n' "$dir" "$status"`.
5. After the loop print `next: <first dir whose status != done>` or `next: none`. Stage the script and set its index mode: `git add superdev/scripts/roadmap-status.sh && git update-index --chmod=+x superdev/scripts/roadmap-status.sh`; verify `git ls-files -s superdev/scripts/roadmap-status.sh` starts with `100755`.
6. Write `tests/superdev/roadmap-status.test.ts` following `tests/superdev/status-update.test.ts` (`runScript` with `shell: "bash"`, `withTempDir`, `slash()` for printed paths): one test per status value, mixed roadmap with `next:` pointing at the first non-done phase, all-done -> `next: none`, missing argument -> exit 1, nonexistent file -> exit 1, an existing roadmap with no `- Dir:` lines -> exit 3, a roadmap path with `./` prefix prints without it.

### Edge cases
- `status.md` present but no `tasks/` dir -> `building` (highest 00).
- `Dir:` value with trailing whitespace -> trimmed.
- Windows path with backslashes in the argument -> normalised to `/` before joining.

### Contracts
- stdout: `<dir>\t<done|building|planned|pending>` per phase, then `next: <dir>|none`. stderr: errors only. Exit 0 / 1 / 3 as in criterion #1. Consumed by the `roadmap` skill (Task 5).

### DoD
Script committed at mode 100755, both test commands green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superdev): decompose.sh adopts the full dirname of the Intent or Spec path
- Covers: criteria #2, #8
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- none - blocks: Task 3

### Files
- modify - superdev/scripts/decompose.sh (`run_dir_of`)
- modify - tests/superdev/decompose.test.ts

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/superdev/decompose.test.ts"` - expected: all tests pass, including the new phase-adoption test

### Approach
1. In `run_dir_of` replace the first-level truncation (`first="${tail%%/*}"`) with the full tail: after the `case` check, `tail="${d##*docs/.workflows/}"` and `printf '%s\n' "docs/.workflows/${tail}"`. Keep the `\` -> `/` normalisation and the empty-result contract.
2. Update the header comment block (lines describing "ścieżka zagnieżdżona głębiej niż jeden poziom adoptuje sam katalog biegu") to state that the FULL directory of the Intent:/Spec: file is adopted, so a phase directory `docs/.workflows/<run>/phases/NN-<slug>/` becomes the workdir, and the run root is never touched (superspec already saves `spec.md` next to the handed-off intent, so a phase's spec lands there without any change).
3. Add a test "adoption: an Intent: file under docs/.workflows/<run>/phases/01-<slug>/ adopts the phase directory, not the run root" modelled on the existing "adoption: an Intent: file already under docs/.workflows/<run>/" test: create `<run>/intent.md`, `<run>/roadmap.md` and `<run>/phases/01-layout/intent.md`, run with a simplePlan whose `intentPath` is the phase intent, assert `workdir: <run>/phases/01-layout`, `plan-header.md` and `tasks/task-01.md` inside the phase dir, and `readdirSync(<run>)` still equals `["intent.md", "phases", "roadmap.md"]`.
4. Run the whole decompose suite; existing adoption and fallback tests must stay green unchanged.

### Edge cases
- Absolute Windows path to a phase intent (`C:\...\docs\.workflows\<run>\phases\01-x\intent.md`) -> `docs/.workflows/<run>/phases/01-x`.
- Intent path outside `docs/.workflows/` -> unchanged fallback to the derived `<date>-<slug>` name.

### Contracts
- `workdir:` line = the directory holding the Intent:/Spec: file whenever that directory is under `docs/.workflows/`; consumed unchanged by simplebuild/superbuild and by `cleanup-run.sh` (Task 3).

### DoD
Decompose suite green with the new phase-adoption test.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superdev): cleanup-run.sh removes a completed phase and the run root after the last phase
- Covers: criteria #3, #8
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- Task 2 - blocks: none

### Files
- modify - superdev/scripts/cleanup-run.sh (slug derivation, removal section)
- modify - tests/superdev/cleanup-run.test.ts

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/superdev/cleanup-run.test.ts"` - expected: all existing tests pass unchanged plus the new phase tests

### Approach
1. After the completeness check and before the removal section, detect a phase workdir: `parent="$(dirname -- "$dir")"`; `is_phase=0`; when `"$(basename -- "$parent")" == phases` set `is_phase=1`, `root="$(dirname -- "$parent")"`, and derive `slug="$(basename -- "$root" | sed -e 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')-$(basename -- "$dir")"`; otherwise keep today's slug line.
2. After the existing target removal (both the no-git branch and the git branch), when `is_phase=1` check whether `phases/` still holds a subdirectory (`for p in "$parent"/*/; do [[ -d "$p" ]] && remaining=1; done`); when none remains, remove `root` the same way as the other targets (`git rm -r -f -q --ignore-unmatch -- "$root" >&2; rm -rf "$root"` in the git branch, `rm -rf "$root"` in the no-git branch) and set `root_removed=1`.
3. stdout lines: unchanged for a flat run; for a phase, `CLEANUP: <dir> (removed)` / `(removed - nothing to commit)` / `(removed - no git repository)` as today when other phases remain, and `CLEANUP: <dir> (removed - last phase, run root removed)` when the root was removed in a git repo with a commit (`(removed - last phase, run root removed - nothing to commit)` and `(removed - last phase, run root removed - no git repository)` for the other two branches). Commit message stays `chore(<prefix>): clean up run <slug>` with the phase slug from step 1.
4. Update the header contract comment with the phase behaviour (detection rule, slug, root removal, new stdout variants).
5. Extend `tests/superdev/cleanup-run.test.ts` with a second fixture builder `buildPhaseFiles(root, phaseName, opts)` writing `docs/.workflows/2026-01-02-demo/{intent.md,roadmap.md}` plus `phases/<phaseName>/{status.md,plan-header.md,tasks/,implementation/,intent.md}` where `plan-header.md`'s `Intent:` names the phase's own `intent.md`; tests: (a) two phases, first complete -> only `phases/01-a` removed, `phases/02-b`, `intent.md`, `roadmap.md` remain, stdout `CLEANUP: <dir> (removed)`, commit subject `chore(simplebuild): clean up run demo-01-a`; (b) single remaining phase complete -> phase and run root removed, stdout `(removed - last phase, run root removed)`, `docs/.workflows/2026-01-02-demo` gone; (c) incomplete phase -> skipped message, nothing removed; (d) no-git variant of (b).

### Edge cases
- The phase's `Intent:` file lives inside the removed phase dir -> `git rm --ignore-unmatch` + `rm -f` must not fail on the already-removed path.
- `phases/` holding stray files but no subdirectories -> counts as empty, root is removed.
- A phase dir passed with trailing `/` or leading `./` -> normalised before detection.

### Contracts
- `cleanup-run.sh <phase-dir> [prefix]` removes only that phase unless it was the last one; the run root is removed in the same commit. Consumed by simplebuild/superbuild Step 5 unchanged.

### DoD
Cleanup suite green: all existing tests untouched and the four phase tests passing.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superdev): changelog-writer derives a phase-aware run id
- Covers: criteria #4
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- none - blocks: none

### Files
- modify - superdev/agents/changelog-writer.md (`## Derive`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -n "phases" superdev/agents/changelog-writer.md` - expected: the run-id rule line

### Approach
1. Replace the `## Derive` bullet "Entry file: `docs/changelog/<basename of Workdir>.md`. Run id: that same basename ..." with: run id = basename of Workdir; when the parent directory of Workdir is named `phases` (the same detection rule `cleanup-run.sh` uses in Task 3), run id = `<basename of the grandparent directory>-<basename of Workdir>` (e.g. `2026-09-11-roadmap-skill-01-layout`); entry file `docs/changelog/<run id>.md`.
2. Leave every other rule untouched.

### Edge cases
- Workdir given with a trailing slash -> strip before taking basenames.

### Contracts
- `Run:` header value of a changelog entry for a phase = `<run basename>-<phase basename>`.

### DoD
The agent file states the phase rule and the grep finds it.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superdev): add roadmap skill, roadmap-reviewer fork, template and checklist
- Covers: criteria #5, #6
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- Task 1 - blocks: Task 6, Task 7

### Files
- add - superdev/skills/roadmap/SKILL.md
- add - superdev/skills/roadmap/references/roadmap-template.md
- add - superdev/skills/roadmap/references/checklist.md
- add - superdev/skills/roadmap-reviewer/SKILL.md

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/portability.test.ts"` - expected: pass (the skill's direct script invocation is double-quoted and the script has its exec bit)
- `grep -c "" superdev/skills/roadmap/SKILL.md superdev/skills/roadmap-reviewer/SKILL.md superdev/skills/roadmap/references/roadmap-template.md superdev/skills/roadmap/references/checklist.md` - expected: four non-zero line counts

### Approach
1. `roadmap-template.md`: content rules (interview language, repo-relative paths, no rejected alternatives) plus the template: `# Roadmap: <title>`, `Date: <YYYY-MM-DD>`, `Intent: <repo-relative path to the master intent.md>`, `## Goal`, `## Phases` with one block per phase `### <NN>. <title>` followed by `- Dir: phases/<NN>-<slug>`, `- Goal:`, `- Covers: decisions #<n>[, #<m>]`, `- Delivers:`, `- Depends on: none | phase <NN>[, <NN>]`, then `## Out of scope`. `Dir:` is relative to the roadmap's own directory (the contract `roadmap-status.sh` reads).
2. `checklist.md` in the style of `superdev/skills/superspec/references/checklist.md`'s severity structure: `### Evidence rule` (Read/Grep/Glob only), `### Severity classes` R1 every `### <n>.` heading in the intent's `## Decisions` appears in exactly one phase's `Covers:`, and no `Covers:` names a decision absent from the intent; R2 `Depends on:` names only lower-numbered phases, phase 01 has `none`; R3 every phase has non-empty `Goal:`, `Delivers:`; R4 `Dir:` equals `phases/<NN>-<slug>` with the phase's own number, all unique; R5 leftover placeholder / TBD / empty mandatory section; `### Never flag` (phase count, naming, granularity preferences, alternatives to a fixed split).
3. `roadmap-reviewer/SKILL.md` cloned from `superdev/skills/superspec-reviewer/SKILL.md`: same frontmatter shape (`context: fork`, `background: false`, `model: inherit`, `allowed-tools: Read, Grep, Glob`, `disallowed-tools: Bash, Edit, Write, NotebookEdit, Task, Agent, ExitPlanMode, AskUserQuestion, WebFetch, WebSearch`, `user-invocable: false`, `description: Invoked only by roadmap skill.`); labeled input `roadmap:`, `intent:`, `checklist:` (all required, missing or nonexistent -> `VERDICT: FAIL`), `round:`, `prior-blocking:`; same round scoping and the four-section output (`VERDICT:` first line).
4. `roadmap/SKILL.md` frontmatter: `name: roadmap`; `description:` "Splits one confirmed intent into ordered phases, each built later as its own spec-plan-build or simpleplan-build run. Invoked from the intent skill's handoff gate (Roadmap option) or by the user command `roadmap <path>` on an existing intent.md or roadmap.md - never spontaneously, never before an intent interview."; `argument-hint: <path-to-intent.md | path-to-roadmap.md>`; `user-invocable: true`; `allowed-tools: Read, Grep, Glob, Agent, AskUserQuestion, Skill, ExitPlanMode, Write, Edit, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/roadmap-status.sh:*), Bash(date:*), Bash(printf:*)` (the `printf` entry pre-approves the checklist-path preload in step 7, as `superdev/skills/superspec/SKILL.md` does). Body starts with `CRITICAL: Run ExitPlanMode first, if plan mode is active.` and `## Run` / `Date: !`date +%F`` like `superdev/skills/intent/SKILL.md`.
5. `## Input` section: `$ARGUMENTS` is either a line `intent: <path>` or a bare path; basename `roadmap.md` -> `## Resume`; basename `intent.md` whose path contains a `phases/` segment -> tell the user a phase cannot be split into a nested roadmap and STOP; other `intent.md` -> `## Fresh`; anything else or a missing file -> report not found and STOP.
6. `## Fresh`: Read the intent; when the split depends on the host code's structure launch `Explore` agents; propose the phases in plain prose as a numbered list (title, goal, `Covers` decisions by their intent numbers, what is checkable at the end, depends on) with a one-line rationale for the cut; run the conversation one round per turn (merge, split, reorder, rename) until the user confirms - prose, never `AskUserQuestion`; then Read `references/roadmap-template.md` and `Write` `<intent dir>/roadmap.md`.
7. `## Review gate` cloned from `superdev/skills/superspec/SKILL.md`'s gate: checklist path `!`printf '%s' "${CLAUDE_SKILL_DIR}/references/checklist.md"``, invoke `roadmap-reviewer` with the labeled block (`roadmap:`, `intent:`, `checklist:`, `round:`, `prior-blocking:` from round 2), FAIL -> apply fixes to `roadmap.md` with Edit and loop, cap at 3 rounds, never continue without PASS.
8. `## Phase intents` (after PASS only): Read `${CLAUDE_PLUGIN_ROOT}/skills/intent/references/intent-template.md`; for every phase `Write` `<intent dir>/phases/<NN>-<slug>/intent.md`: `## Request` = the phase goal in the master's framing; `## Decisions` = the master's decision blocks named in `Covers:` copied verbatim, keeping their master numbers; `## Constraints` = the master constraints that apply plus one bullet `Phase <NN> of roadmap <repo-relative roadmap path>` and one bullet per earlier phase it depends on naming that phase's `Delivers:`; `## Out of scope` = the other phases' goals as non-goals; `## History` = the master's. The `Write` creates the directory - never `mkdir`.
9. `## Handoff [GATE]` with `AskUserQuestion`: **Start phase 01** -> run the `intent` Skill with the phase's `intent.md` path as the sole argument; **Stop here** -> reply with the roadmap path and say `roadmap <path>` resumes it.
10. `## Resume`: run `"${CLAUDE_PLUGIN_ROOT}/scripts/roadmap-status.sh" <roadmap path>` via Bash and relay its lines as a short table; every phase `done` -> say the roadmap is complete and STOP; otherwise `AskUserQuestion`: **Start phase <NN>** (the `next:` dir's `intent.md`, via the `intent` Skill) or **Stop here**. Never re-plan phases on resume; a changed scope is the user's call, done by editing `roadmap.md` and the phase intents by hand or via `intent <phase intent>`.

### Edge cases
- Intent with a single decision or a split the user rejects entirely -> the user is told the work fits one run and pointed back to `intent <path>`; no files written.
- `Write` of `roadmap.md` when one already exists next to the intent -> ask the user before overwriting (an existing roadmap means a resume, not a fresh split).
- `roadmap-status.sh` exit != 0 on resume -> relay stderr and STOP.

### Contracts
- `roadmap.md` shape per step 1 (`- Dir:` lines are the machine-read contract). Phase `intent.md` = full `intent-template.md` file. Handoff argument to `intent` = the phase intent path (bare), matching intent's existing resume contract.

### DoD
All four files exist with the described sections, portability sweep green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - feat(superdev): intent handoff offers the Roadmap track
- Covers: criteria #7
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- Task 5 - blocks: none

### Files
- modify - superdev/skills/intent/SKILL.md (`## Handoff - the user picks the track [GATE]`, `argument-hint`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -n "Roadmap path" superdev/skills/intent/SKILL.md` - expected: one bullet in the handoff section

### Approach
1. Change the handoff intro from "present three options" to "present the options below" and add a bullet **Roadmap path** between Spec path and Stop here: run `roadmap`, passing `intent: <path to the intent file>` as the argument line; fits work too large for one spec - it is split into phases, each built later as its own Simple or Spec run. Add the rule: offer this option only when the intent file's path has no `phases/` segment (a phase intent is already one slice of a roadmap).
2. Change `argument-hint` to `[path-to-intent.md]` (a phase intent lives under `phases/`, so "run-dir" no longer describes it).
3. Leave `## Resume from a file`, `## Synthesis` and every other section untouched.

### Edge cases
- Resume on a phase intent -> the gate shows Simple / Spec / Stop only.

### Contracts
- Handoff to `roadmap`: one argument line `intent: <path>`, same shape as the existing Simple/Spec handoffs.

### DoD
The handoff section lists four options with the phases guard; grep finds the bullet.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - docs(superdev): register roadmap skills and document phases
- Covers: criteria #8
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- Task 5 - blocks: none

### Files
- modify - superdev/.claude-plugin/plugin.json (`skills`)
- modify - superdev/README.md (Quick start step 3, Config switches `cleanup` row, Entry and environment table, Knowledge layers `superdev:changelog-writer` row)
- modify - CLAUDE.md (superdev bullet in `## What this repo is`, `docs/.workflows/` row in `## Repository layout`, `docs/.workflows/` clause in `## Cross-plugin architecture invariants`)
- modify - superdev/skills/setup/assets/config.yml (`cleanup` comment)
- modify - tests/superdev/bootstrap.test.ts (the asserted `cleanup` comment string)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/**/*.test.ts"` - expected: whole suite green

### Approach
1. `plugin.json`: insert `"./skills/roadmap/"` and `"./skills/roadmap-reviewer/"` after `"./skills/intent/"`.
2. `README.md`: in Quick start step 3 add a **Roadmap** bullet (work too large for one spec; `roadmap.md` plus `phases/NN-<slug>/intent.md`; each phase starts with `intent <phase intent>`; `roadmap <roadmap.md>` resumes); in the `cleanup` switch row add "a phase's directory, and the run root after its last phase"; in the Entry and environment table add rows `roadmap` and `roadmap-reviewer` (fork); in the changelog-writer row mention the phase entry id `<run>-<phase>`.
3. `CLAUDE.md`: extend the superdev bullet with one sentence on `roadmap` / `roadmap-reviewer` / `roadmap-status.sh`; extend the `docs/.workflows/` layout row and the invariant clause with `roadmap.md` and `phases/NN-<slug>/` as nested workdirs.
4. `config.yml`: change the `cleanup` comment to `# Remove the run's (or phase's) working dir after a completed build`; update the identical string asserted in `tests/superdev/bootstrap.test.ts`.
5. No em dash or en dash anywhere in the touched text.

### Edge cases
- none

### Contracts
- none

### DoD
Catalog and docs mention both new skills and the phase layout; full suite green.

<!-- /TASK -->
