
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


### Covered criteria
5. Skill `superdev/skills/roadmap/SKILL.md` przyjmuje `intent: <ścieżka>` z handoffu, gołą ścieżkę do `intent.md` albo do `roadmap.md`; dla `intent.md` czyta go, proponuje fazy w prozie (tytuł, cel, pokryte decyzje, sprawdzalny efekt, zależności), prowadzi rozmowę do potwierdzenia, zapisuje `roadmap.md` obok intentu wg `references/roadmap-template.md`, bramkuje na `VERDICT: PASS` skilla `roadmap-reviewer` (maks. 3 rundy), po PASS zapisuje `phases/NN-<slug>/intent.md` wg `intent-template.md` i kończy bramką `AskUserQuestion` (start pierwszej fazy przez `intent <ścieżka>` albo stop); dla `roadmap.md` uruchamia `roadmap-status.sh`, pokazuje status faz i proponuje pierwszą fazę nie-`done`; ścieżka intentu pod `phases/` -> odmowa zagnieżdżania i stop.
6. Skill `superdev/skills/roadmap-reviewer/SKILL.md` jest forkiem read-only (`allowed-tools: Read, Grep, Glob`, `disallowed-tools` od `Bash`), przyjmuje blok `roadmap:` / `intent:` / `checklist:` / `round:` / `prior-blocking:` i zwraca `VERDICT:` / `FINDINGS:` / `BLOCKED:` / `NOTES:` wg `superdev/skills/roadmap/references/checklist.md` (każda decyzja intentu w dokładnie jednej fazie, zależności tylko od faz wcześniejszych, faza 01 bez zależności, każda faza z niepustym `Delivers:`, `Dir:` zgodny z numerem fazy, brak placeholderów).
