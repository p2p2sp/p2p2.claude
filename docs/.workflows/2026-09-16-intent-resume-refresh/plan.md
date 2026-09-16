# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Odświeżenie kontekstu przy wznowieniu intentu"
Intent: docs/.workflows/2026-09-16-intent-resume-refresh/intent.md
Plan: C:\Users\dario\.claude-p2p2\plans\swift-petting-beaver.md

---
<!-- HEADER -->

## Goal
Każdy zapis `intent.md` przez skill `intent`, świeży i wznowiony, produkuje obok niego plik `refresh.md`: przy wznowieniu z deltą od jego `Date:` (changelog i ADR-y, weryfikacja `Delivers:` oraz `## Constraints`, ruch w gicie), przy świeżym runie z tego, co znalazło `## Explore first`. `superspec` i `simpleplan` odmawiają pracy nad intentem spod `docs/.workflows/`, przy którym takiego pliku nie ma, odsyłając do `intent` z tą samą ścieżką.

## Context
Gałąź `## Resume from a file` w `superdev/skills/intent/SKILL.md` pomija `## Explore first`, więc wznowiony intent nie widzi ani historii, ani stanu kodu. Dla fazy N+1 splitu oznacza to spec pisany bez wiedzy o tym, co zbudowała faza poprzednia. Żaden skill niżej tego nie nadrabia: `superspec`, `superplan` i `simpleplan` nie czytają `docs/changelog/` ani `docs/adr/`, a `superplan` i `simpleplan` mają `Agent` w `disallowed-tools`. Drugi defekt jest po stronie routingu: wejście free-formem prowadzi prosto w `superspec`, z pominięciem bramki, na której track wybiera użytkownik. Naprawa dokłada jeden krok w `intent` i po jednej bramce wejściowej w obu skillach planujących.

## Out of scope
- Zmiany w skillu `phases`.
- Pin ważności `refresh.md` na SHA HEAD albo na datę.
- Zmiany w tym, jak `superplan` bada kod.
- Absolutne ścieżki w sekcji `## History` przenoszonej z master intentu do intentów faz.
- Zmiany w `superdev/hooks/content/manifest.md` (nie przybywa ani nie ubywa grupa, zakres grupy ani udokumentowany łańcuch).

## Acceptance criteria
1. Każdy zapis `intent.md` przez skill `intent`, świeży i wznowiony, kończy się zapisanym obok plikiem `refresh.md`, także gdy nie ma czego porównać - wtedy plik jawnie stwierdza brak zmian od `Date:`. Żadna ścieżka wyjścia z `intent` nie prowadzi do handoffu bez tego pliku.
2. Niepusty `refresh.md` zapisany przy wznowieniu niesie deltę od `Date:` intentu z trzech źródeł: wpisów `docs/changelog/` wraz z ich ADR-ami, weryfikacji deklaracji `Delivers:` oraz `## Constraints` wobec repo, i listy tematów z `git log --since`.
3. `superspec` i `simpleplan`, dostając `intent:` wskazujący plik pod `docs/.workflows/` bez `refresh.md` obok, nie tworzą ani nie modyfikują żadnego pliku i uruchamiają `intent` z tą samą ścieżką.
4. Stan zastany w sekcji `## Problem / context (Why)` specu jest jawnie dopuszczony przez `superdev/skills/superspec/templates/spec.md` i `superdev/skills/superspec/references/checklist.md`, a reviewer nadal ma regułę na prawdziwy przeciek „How”.
5. `superdev/README.md` i root `CLAUDE.md` opisują krok odświeżenia oraz plik `refresh.md` jako zawartość katalogu runu.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superdev): refresh resumed intents with a delta since their date
- Covers: criteria #1, #2
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none - first task

### Files
- add - superdev/skills/intent/references/refresh-template.md
- modify - superdev/skills/intent/SKILL.md (## Resume from a file, ## Refresh on resume, ## Synthesis)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test tests/portability.test.ts` - expected: all tests pass (its `!` preload sweep reads every SKILL.md, so the edited `intent/SKILL.md` is in scope)

### Approach
1. Write `superdev/skills/intent/references/refresh-template.md` in the shape of the sibling `intent-template.md`: a `## Content rules` section plus a fenced `## Template`. Template preamble `# Refresh: <intent title>`, `Date:`, `Intent:` (repo-relative path of the refreshed file), `Baseline:` (that file's own `Date:` value). Body sections in this order: `## Since the baseline`, `## Delivered state`, `## Other movement`, `## Impact on decisions` - each `- <...>` bullets or the single bullet `none`. Content rules: write it in the interview's language; repo-relative paths only; never copy a changelog entry wholesale, one line per finding; `## Impact on decisions` names the intent's decision numbers and nothing else.
2. In `superdev/skills/intent/SKILL.md` add a new section `## Refresh on resume` between `## Resume from a file` and `## Explore first`, carrying the whole step: read the resumed file's `Date:` line, then decide whether there is anything to compare - anything present under `docs/changelog/` newer than that date, any sibling phase directory under the resumed file's `phases/` parent, or any commit since that date.
3. In that section, for the non-empty case dispatch two `Explore` agents in parallel in one batch. History agent: grep `docs/changelog/README.md` and the entry filenames for dates after `Baseline:`, open the matches, follow their `ADR:` links, and independently `Grep docs/adr/`; for a file under a `phases/` segment also open the entries of this run's earlier phases. Code agent: verify every `Delivers:` claim named in `## Constraints` and every other `## Constraints` bullet against the repo, and run `git log --since=<Baseline> --oneline` itself to find movement the changelog does not record.
4. In that section, for the empty case skip both agents and go straight to the write.
5. End the section by reading `references/refresh-template.md` and `Write`ing `<directory of the resumed file>/refresh.md` exactly as it prescribes, then rewire the first bullet of `## Resume from a file` so the presentation of `## Decisions` happens after this step and names the decisions that `## Impact on decisions` flags.
6. In `## Synthesis`, after the `Write` of `intent.md` on a fresh run, `Write` the same-shaped `refresh.md` next to it, filled from what `## Explore first` already found (`## Since the baseline` from the history agent, `## Delivered state` and `## Other movement` as `none - fresh run`, `## Impact on decisions` as `none - written with this intent`), so no exit from this skill reaches the handoff without the file Task 2's gate requires. A greenfield request that skipped exploration altogether writes every section as `none`, the same shape as the empty resume case.

### Failure modes
- when the resumed intent carries no line matching `^Date: \d{4}-\d{2}-\d{2}` -> response: treat the baseline as unknown, run both agents without `--since` and over the whole `docs/changelog/` index, log `Baseline: unknown` in `refresh.md`, test: resume an `intent.md` with its `Date:` line deleted and confirm `refresh.md` is written with `Baseline: unknown`
- when `docs/changelog/` and `docs/adr/` are both absent -> response: the history agent is not dispatched at all, log `## Since the baseline` as the single bullet `none`, test: resume an intent in a repo without either directory and confirm the section reads `none` and no history agent ran
- when the host is not a git repository or has no commits -> response: the code agent skips `git log` and verifies `Delivers:` and `## Constraints` by Read/Grep/Glob only, log `## Other movement` as the single bullet `none`, test: resume an intent in a directory that is not a git repository and confirm `refresh.md` is still written
- when an `Explore` agent returns nothing usable -> response: write the section it owned as the single bullet `none` and never block the write of `refresh.md`, log that section as `none`, test: resume an intent and confirm `refresh.md` exists with every mandatory section present even when a section is empty

### Contracts
- `refresh.md` file contract: path `<directory of the resumed intent file>/refresh.md`; preamble `# Refresh:`, `Date:`, `Intent:`, `Baseline:`; mandatory sections `## Since the baseline`, `## Delivered state`, `## Other movement`, `## Impact on decisions`; the empty case is the same file with every section reading `none` and `## Impact on decisions` reading `none - no change since <Baseline>`. Consumed by Task 2.
- `<Baseline>` is the `Date:` value read out of the resumed intent file and is the only value this task feeds into a shell command (`git log --since=<Baseline> --oneline`); validation rule: it is used only when it matches `^\d{4}-\d{2}-\d{2}$` exactly, otherwise the command runs without `--since`.
- `refresh.md` is written on every path that writes an `intent.md` - the resume branch and the fresh `## Synthesis` write alike - never conditionally. That invariant is the precondition Task 2's gate relies on, and it is what keeps a fresh interview from being bounced back into `intent` by its own gate.

### DoD
`superdev/skills/intent/references/refresh-template.md` exists; `superdev/skills/intent/SKILL.md` carries `## Refresh on resume` whose last step writes `refresh.md` in both the empty and non-empty case, and its `## Synthesis` writes `refresh.md` beside every freshly written `intent.md`; `node --test tests/portability.test.ts` green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superdev): gate superspec and simpleplan on a refreshed intent
- Covers: criterion #3
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- Task 1 - blocks: the gate reads the `refresh.md` contract Task 1 defines, and depends on that file being written on every resume

### Files
- modify - superdev/skills/superspec/SKILL.md (## Inputs)
- modify - superdev/skills/simpleplan/SKILL.md (### Initial Understanding)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test tests/portability.test.ts` - expected: all tests pass (its `!` preload sweep reads every SKILL.md, so both edited files are in scope)

### Approach
1. In `superdev/skills/superspec/SKILL.md`, under `## Inputs`, add the gate as its own bullet before the smell test: when the handoff carries `intent: <path>` and that path sits under `docs/.workflows/`, `Glob` `<that path's directory>/refresh.md` before anything else; no hit means write nothing at all, run the `intent` Skill with that same path as its sole argument, and STOP.
2. In the same bullet state why the loop cannot happen: the `intent` skill writes `refresh.md` on every path that writes an `intent.md`, fresh and resumed alike, and ends at its own handoff, so a bounced run comes back with the file present and the user re-picks the track there.
3. In the same bullet, own the unresolvable path: an `intent:` value that does not resolve to an existing file means the gate is not evaluated - report the path as not found and STOP. Note the contrast with `superdev/skills/intent/SKILL.md`, whose own not-found branch falls through and treats the argument as a request; neither skill here may fall through, because there is no interview to fall into.
4. In `superdev/skills/simpleplan/SKILL.md`, under `### Initial Understanding`, add the same gate in the same words, ending in the same STOP.
5. In both, state that the gate applies only to a path under `docs/.workflows/` - an `intent:` naming an existing file elsewhere, and a run with no `intent:` line at all, pass through untouched.

### Failure modes
- when `intent:` names a path that does not exist -> response: the gate is not evaluated and the skill reports that path as not found and STOPs, writing nothing, log the unresolved path in that stop message, test: invoke `superspec` with `intent:` pointing at a missing file and confirm no spec file is created and the path is named back
- when `refresh.md` exists next to the intent but is empty or unparsable -> response: the gate passes, because validity is the file's presence alone, log nothing, test: place a zero-byte `refresh.md` next to an intent and confirm `superspec` proceeds to write the spec
- when the handoff carries no `intent:` line -> response: the gate is skipped and the skill runs its existing no-intent branch, log nothing, test: invoke `superspec` with no `intent:` label and confirm it still creates its own run directory

### Contracts
- Consumes Task 1's `refresh.md` contract: only its existence at `<intent dir>/refresh.md` is read, never its content.
- The `intent:` value is an external value entering a `Glob` path and a routing decision; validation rule, owned by this task and written into both skills: the value must resolve to an existing file before anything else happens (it does not -> report it as not found and STOP), it is then used only to derive `<its own directory>/refresh.md` and is never joined with any other segment, and the gate itself fires only when the resolved path sits under `docs/.workflows/`.

### DoD
Both `superdev/skills/superspec/SKILL.md` and `superdev/skills/simpleplan/SKILL.md` carry the gate with the same STOP-and-run-`intent` wording, the same `docs/.workflows/` scoping, and the same not-found branch for an `intent:` path that does not resolve; `node --test tests/portability.test.ts` green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superdev): admit the starting state into a spec's Why section
- Covers: criterion #4
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- none - independent of Tasks 1 and 2

### Files
- modify - superdev/skills/superspec/templates/spec.md (## Problem / context (Why))
- modify - superdev/skills/superspec/references/checklist.md (### Severity classes)
- modify - superdev/skills/superspec-reviewer/SKILL.md (## Assessment)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- none (no suite covers a template or a reviewer rubric; the change is verified by the DoD below)

### Approach
1. In `superdev/skills/superspec/templates/spec.md`, widen the placeholder under `## Problem / context (Why)` from `<Problem being solved. No solution.>` to name the starting state as well: what already exists, what is missing, and what an earlier phase left behind, still ending in `No solution.`.
2. In `superdev/skills/superspec/references/checklist.md`, attach a narrow carve-out to the first Blocking criterion (`an implementation detail leaking into a requirement`): naming an existing artifact as part of the starting state inside `## Problem / context (Why)` is not a leak; the leak is prescribing how the change will be built, or naming an artifact inside a goal, a user scenario or an acceptance criterion.
3. Add one matching bullet to `### Never flag`: an existing artifact named in `## Problem / context (Why)` as the state the change starts from.
4. In `superdev/skills/superspec-reviewer/SKILL.md`, attach the same carve-out clause to the FINDINGS bullet's opening item (`an implementation detail leaking into a requirement`), so the reviewer carries it inline instead of reaching it only through the checklist's `### Never flag` list.

### Failure modes
- when the carve-out is read as permission to name artifacts anywhere in the spec -> response: the carve-out sentence names the one allowed section and lists goal, user scenario and acceptance criterion as still Blocking, log nothing, test: draft a spec naming an artifact in an acceptance criterion and confirm the criterion still reads as Blocking
- when a spec has no starting state to describe -> response: the widened placeholder stays optional prose and the section keeps its existing problem-only form, log nothing, test: draft a greenfield spec with a problem-only `## Problem / context (Why)` and confirm no criterion is violated

### Contracts
- `superdev/skills/superspec/references/checklist.md` is read by two consumers: `superdev/skills/superspec-reviewer/SKILL.md`, which restates the Blocking list inline and is therefore edited here too, and `superdev/skills/superspec/SKILL.md`, whose own hard rule is the broader "Spec = `What & Why` - no How" and needs no carve-out because it never names a section.

### DoD
`superdev/skills/superspec/templates/spec.md` names the starting state in its `## Problem / context (Why)` placeholder; `superdev/skills/superspec/references/checklist.md` carries both the carve-out on the first Blocking criterion and the matching `### Never flag` bullet; `superdev/skills/superspec-reviewer/SKILL.md` carries the same carve-out inline on its FINDINGS bullet.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - docs(superdev): document the resume refresh step and refresh.md
- Covers: criterion #5
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- Task 1 - blocks: the docs describe the file and the step Task 1 introduces
- Task 2 - blocks: the docs describe the gate Task 2 introduces

### Files
- modify - superdev/README.md (the `intent` row of the skills table)
- modify - CLAUDE.md (the superdev bullet, the docs/.workflows layout entry, the host-repo `docs/` invariant)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- none (no suite reads README.md or CLAUDE.md; the change is verified by the DoD below)

### Approach
1. In `superdev/README.md`, extend the `intent` row of the skills table, in English: a resume refreshes the context into `refresh.md` next to the intent (changelog entries and ADRs since the intent's date, the delivered state, movement in git) before presenting the decisions, and a fresh run writes the same file from what exploration found.
2. In `superdev/README.md`, extend the resume sentence in the numbered walkthrough so the refresh is visible where the reader meets `intent <path>`.
3. In root `CLAUDE.md`, extend the superdev bullet with the refresh step and the gate that `superspec` and `simpleplan` now carry.
4. In root `CLAUDE.md`, add `refresh.md` to the `docs/.workflows/` layout entry and to the host-repo `docs/` invariant's description of the run directory, in both places listing it beside `intent.md` as written on every resume.

### Failure modes
- none - documentation

### Contracts
- none

### DoD
`superdev/README.md` names the refresh in the `intent` row and in the resume sentence; root `CLAUDE.md` names the refresh step, the gate, and `refresh.md` in both places that enumerate a run directory's contents.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
