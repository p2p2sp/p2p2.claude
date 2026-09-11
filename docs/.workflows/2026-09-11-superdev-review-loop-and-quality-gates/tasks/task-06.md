
## Task 6 - feat(superplan): plan template Failure modes and Contracts, checklist B9-B14, plan skills and reviewers
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #1, #2, #3

### Dependencies
- none - blocks: 7, 8, 9, 10, 12

### Files
- modify - superdev/skills/superplan/templates/plan.md (`### Edge cases` -> `### Failure modes`, `### Contracts`, `### Approach` instruction lines)
- modify - superdev/skills/simpleplan/templates/plan.md (same three sections)
- modify - superdev/references/plan-review-checklist.md (`## Blocking classes` B9-B14, stack-agnostic preamble section list, `B1-B8` -> `B1-B14`, `## Author self-check`)
- modify - superdev/skills/superplan/SKILL.md (`**File Structure**` rules for Failure modes / Contracts / Approach, `### Self-Review` `B1-B8` -> `B1-B14`)
- modify - superdev/skills/simpleplan/SKILL.md (same two places)
- modify - superdev/skills/superplan-reviewer/SKILL.md (`## Buckets` `B1-B8` -> `B1-B14`)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (`## Buckets` `B1-B8` -> `B1-B14`)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass

#### Tests
- `grep -rn 'Edge cases' superdev/skills/superplan superdev/skills/simpleplan superdev/skills/superplan-reviewer superdev/skills/simpleplan-reviewer` - expected: no output
- `grep -c 'Edge cases' superdev/references/plan-review-checklist.md` - expected: `1` (the B9 compatibility sentence only)
- `grep -c '^- B1[0-4] \|^- B9 ' superdev/references/plan-review-checklist.md` - expected: `6`
- `grep -rn 'B1-B8' superdev` - expected: no output
- `grep -n '### Failure modes' superdev/skills/superplan/templates/plan.md superdev/skills/simpleplan/templates/plan.md` - expected: one hit per file
- `node --test "tests/superdev/decompose.test.ts"` - expected: all tests pass (the decomposer does not parse these sections)

### Approach
1. Through `supercc:skill-designer`, replace `### Edge cases` in both templates with `### Failure modes` whose placeholder reads: one bullet per failure of the fixed shape `when <X fails | input is invalid | two <X> run concurrently> -> response <Y>, log <Z>, test <T>`; `none` allowed only as `none - <one-word reason>`. Extend `### Contracts` placeholder: data shapes / signatures; for a change of the response mechanism a method-and-status matrix; for an extended closed set the list of its consumers (found by Grep); every contract another task consumes names that task (`consumed by Task <N>`). Tighten `### Approach` placeholder: symbol + signature + algorithm, never line-by-line code, never a failure decision (those live under Failure modes).
2. In `superdev/references/plan-review-checklist.md` add B9-B14 to `## Blocking classes`, each with its Read/Grep/Glob evidence rule: B9 a `### Failure modes` entry (or the section as `none` without a reason) that lacks the response, the log or the test, or a `### Approach` step that decides a failure behaviour (`catch`, fallback, default on error) not listed under Failure modes; B10 a closed set extended (a new enum member, variant, status, kind named in Approach or Contracts) with no consumer list under Contracts (Grep the repo for the type name to list them); B11 a change of the response mechanism (redirect vs rewrite, proxy vs direct, status code family) without a method-and-status matrix under Contracts; B12 an external value (header, path segment, query, form field, environment) entering a path, query, command or routing decision with no validation rule under Contracts or Failure modes; B13 a planned test whose assertion holds without the change (fixture equal to the expected value, assertion on a constant, a throttle test with no throttled call); B14 a contract or shared value with no consuming task named (`consumed by Task <N>` absent while another task's Approach references it, or a value described as produced but never consumed). Update the preamble's section list (`### Failure modes` instead of `### Edge cases`), every `B1-B8` mention to `B1-B14`, and `## Author self-check` with one line per new class.
3. In both plan SKILL.md files, under `**File Structure**`, add the authoring rules that mirror B9-B14 (every failure branch decided under Failure modes in the fixed shape; every extended closed set lists its consumers; every transport change carries its matrix; every external value carries its validation; every shared contract names its consuming task; Approach never carries failure decisions or line-by-line code) and change `B1-B8` to `B1-B14` in `### Self-Review`; in both plan reviewers change `B1-B8` to `B1-B14` under `## Buckets`.

### Covered criteria
1. Oba szablony planu (`skills/superplan/templates/plan.md`, `skills/simpleplan/templates/plan.md`) mają w zadaniu sekcję `### Failure modes` zamiast `### Edge cases`, z instrukcją stałego kształtu punktu „gdy X zawiedzie / wejście jest złe / dwa X biegną równolegle → odpowiedź Y, log Z, test T” i zasadą, że „none” wymaga jednosłownego uzasadnienia.
2. W obu szablonach `### Contracts` wymaga macierzy metod i kodów dla zmiany transportu, listy konsumentów dla rozszerzonego zamkniętego zbioru i nazwy zadania-konsumenta przy każdym kontrakcie używanym przez inne zadanie, a instrukcja `### Approach` zakazuje kodu linia po linii i decyzji awaryjnych.
3. `references/plan-review-checklist.md` ma klasy Blocking B9-B14 (gałąź awaryjna bez odpowiedzi i logu; rozszerzony zamknięty zbiór bez wyliczenia konsumentów; zmiana mechanizmu odpowiedzi bez macierzy metod/kodów; wartość z zewnątrz w ścieżce, zapytaniu lub poleceniu bez walidacji; test, który nie może paść; kontrakt lub wartość bez zadania-konsumenta), każda z dowodem rozstrzygalnym przez Read/Grep/Glob; `superplan-reviewer` i `simpleplan-reviewer` wymieniają zakres B1-B14, a plan z `### Failure modes` równym „none” bez uzasadnienia albo z kontraktem bez zadania-konsumenta dostaje `VERDICT: FAIL` z klasą B9 lub B14.
