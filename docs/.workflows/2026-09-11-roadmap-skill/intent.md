# Intent: skill roadmap - podział dużego zadania na fazy spec-plan-build
Date: 2026-09-11

## Request
Nowy skill superdev `roadmap`, uruchamiany po zakończonym wywiadzie intentu, który rozbija większe przedsięwzięcie na fazy, gdzie każda faza przechodzi własny tor spec-plan-build albo simpleplan-build. Nie każde zadanie ma fazy - małe zadania idą jak dziś. Struktura katalogów `docs/.workflows/` zmienia się tak, by fazy były nadrzędne wobec pojedynczych workflowów.

## Decisions
### 1. Jak wygląda katalog jednego przedsięwzięcia po zmianie?
Zagnieżdżone fazy, płasko gdy faz nie ma. Zadanie bez faz wygląda jak dziś. Zadanie z fazami: `docs/.workflows/<data>-<slug>/` zawiera `intent.md` (główny), `roadmap.md` oraz `phases/NN-<slug-fazy>/` z własnym `intent.md`, `spec.md`, `plan.md`, `plan-header.md`, `status.md`, `base.md`, `tasks/`, `implementation/`. Jedna reguła dla całego łańcucha: workdir to katalog, w którym leży plik `intent.md` przekazany w handoffie. Katalog główny zostaje `docs/.workflows/`.

### 2. Gdzie w przepływie pojawia się roadmap i o co dopytuje intent?
Czwarta opcja w istniejącej bramce handoffu intentu: Simple / Spec / Roadmap / Stop. Wybór Roadmap uruchamia `roadmap` z linią `intent: <ścieżka>`. Wybór toru dla zadania z fazami wraca później, osobno dla każdej fazy.

### 3. Jak roadmap dochodzi do podziału na fazy i co jest bramką?
Propozycja w prozie (ponumerowane fazy, każda z celem, zakresem jako pokrytymi decyzjami intentu, sprawdzalnym efektem i zależnościami od faz wcześniejszych), wywiad do potwierdzenia przez użytkownika, potem forkowany `roadmap-reviewer` (tylko Read/Grep/Glob) sprawdzający: każda decyzja intentu należy do dokładnie jednej fazy, żadna faza nie zależy od późniejszej, każda faza kończy się czymś sprawdzalnym, faza 1 nie ma zależności. `VERDICT: PASS` (maks. 3 rundy) odblokowuje zapis `roadmap.md` i plików `phases/NN-<slug>/intent.md`.

### 4. Jak startuje faza, zwłaszcza kolejna faza w świeżej sesji?
Start fazy to wznowienie intentu na `intent.md` tej fazy (`intent phases/NN-<slug>/intent.md`): decyzje fazy, ewentualne otwarcie jednej, bramka Simple / Spec / Stop; opcja Roadmap jest ukryta, gdy intent leży w `phases/`. Handoff roadmapu po zapisie: "Zacznij fazę 1 teraz" albo "Stop". `roadmap <ścieżka do roadmap.md>` wznawia całość: pokazuje status faz i proponuje pierwszą nieukończoną. `intent.md` fazy jest pełnoprawnym plikiem wg `intent-template.md`, samowystarczalnym; jego `## Constraints` wskazuje, co dostarczyły fazy wcześniejsze.

### 5. Skąd roadmap wie, która faza jest skończona, i co sprząta cleanup?
Status wyprowadzany z dysku przez nowy deterministyczny skrypt `superdev/scripts/roadmap-status.sh <roadmap.md>`, jedna linia na fazę: brak katalogu fazy → `done`; `status.md` z ostatnim taskiem → `done`; `status.md` z wcześniejszym taskiem → `building`; `spec.md` lub `plan.md` bez `status.md` → `planned`; tylko `intent.md` → `pending`. `roadmap.md` jest niezmienny po zapisie. Sprzątanie per faza: `cleanup-run.sh` przyjmuje katalog fazy i usuwa tylko go; gdy `phases/` opustoszeje, usuwa też korzeń (`intent.md`, `roadmap.md`). Identyfikator wpisu changelogu dla fazy to `<basename run>-<basename fazy>`.

## Constraints
- Breaking change: istniejące katalogi pod `docs/.workflows/` nie muszą dać się wznowić ani dobudować; żadnej migracji.
- Skill `roadmap` jest wywoływalny także bezpośrednio przez użytkownika na istniejącym `intent.md` lub `roadmap.md`.
- Pojedyncza faza może pójść torem Simple (bez speca) albo Spec - decyzja użytkownika przy starcie fazy.
- Superspec, superplan, simpleplan, superbuild i simplebuild nie znają pojęcia fazy; jedyne zmiany poniżej intentu to skrypty: `decompose.sh` adoptuje `dirname` ścieżki `Intent:`/`Spec:` leżącej pod `docs/.workflows/` zamiast pierwszego poziomu; `cleanup-run.sh` jak w decyzji 5; `agents/changelog-writer.md` używa id fazy z decyzji 5.
- Nowy `references/roadmap-template.md` w skillu `roadmap`; `roadmap-reviewer` jako osobny skill-fork w `superdev/skills/`.
- Testy w `tests/superdev/` (`decompose.test.ts`, `cleanup-run.test.ts`) dostosowane do nowej adopcji i głębszej ścieżki; nowy `roadmap-status.test.ts`; uruchamiane `node --test "tests/**/*.test.ts"`.
- Samodokumentacja: `superdev/.claude-plugin/plugin.json` (`skills[]`), `superdev/README.md`, root `CLAUDE.md`, `superdev/skills/intent/SKILL.md` (bramka handoffu), `superdev/skills/setup/assets/config.yml` (komentarz przy `cleanup`).
- Bez em dash i en dash w żadnym pliku.

## Out of scope
- Diagram `docs/assets/superdev-flow.svg`.
- Zmiana nazwy katalogu głównego `docs/.workflows/`.
- Skill `simpledebug` i `superspec-refine`.
- Migracja starych runów.
- Manifest `superdev/hooks/content/manifest.md` (nie dokumentuje grup ani łańcuchów).

## History
- none
