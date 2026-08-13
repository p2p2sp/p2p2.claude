Title: "Odchudzenie i ujednolicenie pluginu superdev"


## Goal
Plugin `superdev/` przestaje wozić treść, którą model ma wyuczoną, a jego wewnętrzne kontrakty (marker `TDD:`, format `VERDICT:`, pozycja ADR, ścieżka pliku planu) są jednakowe we wszystkich skillach i w hooku. Bramka `ExitPlanMode` działa również w projektach z własnym `plansDirectory`.

## Context
Plugin powstawał na starszych modelach i niesie trzy warstwy balastu: pliki referencyjne będące czystym podręcznikiem (mockowanie, deep modules, kompresja opisu modułu), bloki presji antylenistwowej w manifeście oraz checklisty code review powtarzające domyślne zachowanie recenzenta. Do tego siedem wewnętrznych niespójności, z których najgroźniejsza jest cicha: `review-plan.sh` wykrywa plan po zaszytym `\.claude[\\/]+plans[\\/]+`, więc w projekcie z własnym `plansDirectory` robi `emit_allow` i bramka review planu przestaje istnieć bez żadnego sygnału. Zakres obejmuje wyłącznie `superdev/` i `tests/superdev/`; pozostałe trzy pluginy, wspólne skrypty i bump wersji są poza nim.

## Acceptance criteria
1. Siedem plików referencyjnych (`tdd/references/*.md` x5, `superdev-memory-writer/references/node-examples.md`, `superdev-memory/references/capture-protocol.md`) nie istnieje, a `grep -r` po `superdev/` nie znajduje odwołania do żadnego z nich.
2. `superdev/hooks/content/manifest.md` ma nie więcej niż 30 linii i nadal zawiera cztery nośne reguły: zakaz tworzenia branchy, wywiad prozą zamiast pickera, plan mode nie zastępuje wywiadu, brak kodu przed zatwierdzonym planem.
3. Kryterium `TDD: required` w `superplan/SKILL.md` jest identyczne co do treści z `simpleplan/SKILL.md`, a żaden z tych plików nie wymaga już, by marker pojawił się jako krok w `### Approach`.
4. Żaden plik w `superdev/` nie zawiera ciągu `**VERDICT:**`, a `review-plan.sh` nie zawiera ani `(\*\*)?`, ani klasy `[Vv][Ee][Rr][Dd][Ii][Cc][Tt]`.
5. `review-plan.sh` wykrywa plik planu również poza `.claude/plans/`, po nagłówku `^# SimplePlan` lub `^# SuperPlan` w treści ostatnio zapisanego pliku `.md`, i bramkuje taki przypadek tak samo jak dziś bramkuje plan w `.claude/plans/`.
6. `superbuild/SKILL.md` nie ma osobnego kroku ADR przed pętlą implementacji; `superbuild-adr` jest wołany w Close-Oucie równolegle z delegacjami `memory`, `rules`, `docs`.
7. `simpleplan/SKILL.md` i `superplan/SKILL.md` instruują zapis planu do pliku wskazanego w komunikacie plan mode i przekazanie tej samej ścieżki reviewerowi jako `plan:`, bez wymieniania jakiegokolwiek katalogu z nazwy.
8. Progi tokenowe (`<20k` / `20-64k` / `>64k`) i format tabeli pomiarowej znajdują się w `superdev-memory/SKILL.md`; `superdev-memory-writer/references/templates.md` ich nie zawiera.
9. W ośmiu skillach wymienionych w `### Files` Taska 8: każdy preload będący pojedynczym poleceniem (`date`, `printf`, `git status`) ma w `allowed-tools` wpis wzorcowy pokrywający to polecenie, a przy każdym preloadzie potokowym stoi w treści skilla, nie we frontmatterze, jednolinijkowy komentarz wyjaśniający, dlaczego wzorca tam nie ma. Skille spoza tej listy pozostają nietknięte. `simplebuild-reviewer` i `superbuild-task-reviewer` nie mają w `allowed-tools` narzędzia `Skill`.
10. `node --test "tests/**/*.test.ts"` uruchomione z katalogu głównego repo kończy się kodem 0.
11. Suma linii plików `.md` pod `superdev/` spada o co najmniej 400 względem stanu wyjściowego.

