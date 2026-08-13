
## Task 2 - refactor(superdev): cut learned-knowledge prose from tdd, simpledebug and the review skills
- Covers: criteria #11
- TDD: none

### Dependencies
- Task 1 - blocks: sekcje `tdd/SKILL.md` edytowane w obu taskach, kolejność zapobiega konfliktowi

### Files
- modify - superdev/skills/tdd/SKILL.md (Common rationalizations, Red flags, When stuck)
- modify - superdev/skills/simpledebug/SKILL.md (Red flags - stop and trace)
- modify - superdev/skills/simplebuild-implementor/SKILL.md (## 2. Review)
- modify - superdev/skills/superbuild-task-coder/SKILL.md (## 1. Implement - wyłącznie reguła o dopasowaniu do stylu otoczenia)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (Code quality, Architecture, Testing, Production readiness)
- modify - superdev/skills/superbuild-reviewer-code/SKILL.md (Code quality, Architecture, Testing, Production readiness)
- modify - superdev/skills/superspec/references/checklist.md (Content Quality, Requirement Completeness, Feature Readiness)
- modify - superdev/skills/superdev-docs-writer/references/doc-format.md (Tone rules)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `grep -c "" superdev/skills/tdd/SKILL.md` - oczekiwane: wartość nie większa niż 110 (z 153; trzy usuwane sekcje to 45 linii plus jedno zdanie z VERIFY GREEN)
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. W `tdd/SKILL.md` usuń sekcje `## Common rationalizations`, `## Red flags - STOP and start over` i `## When stuck`; zachowaj bez zmian `## Iron Law` (z regułą delete-then-restart), oba checkpointy VERIFY, `## Per-cycle stop-condition checklist`, `## Anti-patterns (forbidden)` i `## Bypass authorization`.
2. W `simpledebug/SKILL.md` usuń sekcję `## Red flags - stop and trace`, przenosząc do `## The Iron Law` wyłącznie te pozycje, których nie ma już w trzech prawach.
3. Zredukuj `## 2. Review` w `simplebuild-implementor` do samej reguły "przeczytaj własny diff świeżym okiem przed weryfikacją, napraw co znajdziesz" plus wymóg trafienia w `DoD` i `Covered criteria`; usuń wyliczankę SRP/DRY/type safety/primitive obsession/error paths/back-compat/migracji. W `superbuild-task-coder` NIE dodawaj kroku przeglądu - ten pipeline ma osobny `superbuild-task-reviewer` i brak własnego przeglądu jest tam celowy; usuń z jego `## 1. Implement` wyłącznie zdanie "Keep the change minimal and idiomatic: match surrounding naming, patterns, and comment density", zostawiając nietkniętą regułę o zakazie refaktorów i wyjścia poza pliki taska. To samo zdanie stoi w `## 1. Implement` w `simplebuild-implementor` - usuń je tam symetrycznie, żeby oba implementory zostały z tą samą regułą.
4. W `simplebuild-reviewer` i `superbuild-reviewer-code` zredukuj cztery bloki pytań do jednego zdania na wymiar. Zachowaj nietknięte: w `simplebuild-reviewer` bramkę `Plan alignment` ze STOP, w `superbuild-reviewer-code` sekcję `## Scope` z jednowymiarowym zakresem, a w obu sekcję `## Calibration`, strukturę raportu i kontrakt `VERDICT`.
5. W `superspec/references/checklist.md` usuń trzy sekcje wyliczankowe, zachowując `### Severity classes`, `### Never flag` i `### Evidence rule`. Ponieważ obie zachowane sekcje odwołują się dziś do usuwanych wyliczanek ("any checklist item above objectively violated", "must cite the violated checklist item"), przepisz te odwołania tak, by rubryka była samodzielna - klasy Blocking mają wymieniać własne przesłanki wprost, bez odsyłania do nieistniejącej listy. W `doc-format.md` usuń `## Tone rules`, zachowując szablon oraz sekcje Good i Bad.
6. Usuń zdanie "Actually run the test - never simulate it mentally" z sekcji VERIFY GREEN w `tdd/SKILL.md`, zostawiając jedno wystąpienie w VERIFY RED. Wariant "Actually run it - never simulate it mentally" w `simpledebug/SKILL.md` ZOSTAJE - to osobny skill, ładowany bez treści `tdd`, więc nie jest to duplikat w tym samym kontekście.

### Edge cases
Reguła "no unrequested refactors, no scope creep, no files outside the task" w obu implementorach nie jest wiedzą wyuczoną - jest ograniczeniem zakresu i musi przetrwać cięcie.

### Contracts
Kontrakty wyjściowe wszystkich sześciu skilli (`VERDICT:` w pierwszej linii, `REASON:`, `REVIEW:`, struktura raportu) pozostają bez zmian.

### DoD
Wymienione sekcje nie istnieją, reguły wskazane jako zachowane nadal istnieją dosłownie, suite testowy zielony.


### Covered criteria
11. Suma linii plików `.md` pod `superdev/` spada o co najmniej 400 względem stanu wyjściowego.
