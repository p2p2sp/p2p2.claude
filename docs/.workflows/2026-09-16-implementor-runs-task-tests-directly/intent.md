# Intent: implementator uruchamia testy zadania bezpośrednio, executor tylko u reviewerów
Date: 2026-09-16

## Request
Implementatorzy zadań w superdev często kończą z czerwonym testem i za każdym razem dispatchują fork `executor` (haiku) w trybie analizy logu, co wydłuża implementację. Testy zadania są wybiórcze (jeden plik, zwłaszcza przy `TDD: required`), więc ich output jest mały i przydatny implementatorowi do osądu, co jest nie tak. Zmiana: implementator uruchamia testy zadania bezpośrednio przez Bash i sam czyta wynik, bez `run.sh` i bez executora; executor pozostaje wyłącznie u reviewerów, tam gdzie biegnie cały suite; planiści dzielą pracę na mniejsze zadania, w szczególności przy `TDD: required`.

## Decisions
### 1. Co implementator uruchamia na koniec zadania i jak?
Tylko zakres zadania, bezpośrednio przez Bash, bez `run.sh` i bez executora: blok `#### Build` z `### Test Commands` oraz każdą linię `### Task Tests` (przy `TDD: required` te same linie napędzają cykl RED/GREEN). Czyta output sam i naprawia w pętli max 5 rund jak dziś. Całego suite nie uruchamia nigdy. W trybie fix po raporcie reviewera to samo, z testami zawężonymi do plików, które poprawka dotyka.

### 2. Czy per-task reviewer (tor Super) uruchamia cokolwiek?
Nie, zostaje jak dziś: ocenia diff zadania czytając, nie uruchamia build ani testów.

### 3. Gdzie biegnie cały suite z executorem?
Bez zmian: checkpoint co 5 zadań, final review i re-review uruchamiają pełny gate przez `run.sh` i dispatchują executora w trybie analizy tylko na `RESULT: DEVIATION`.

### 4. Jak plan wyraża "testy zadania" obok gate'u reviewerów?
Sekcja `### TDD Commands` zmienia nazwę na `### Task Tests` i staje się obowiązkowa na każdym zadaniu niezależnie od markera `TDD:`: jedna linia per plik testowy, jaki zadanie pisze lub zmienia, z komendą uruchamiającą tylko ten plik (lub najwęższy zakres, jaki runner hosta ma). `### Test Commands` zostaje gate'em reviewerów bez zmian; `review-contract.md` zbiera je jak dziś, a `Task Tests` nigdy nie jest gate'em.

### 5. Jaka konkretnie ma być reguła rozmiaru zadania i kto ją egzekwuje?
Zadanie `TDD: required` pisze dokładnie jeden plik testowy i tylko kod produkcyjny, który ten plik napędza; druga linia w jego `### Task Tests` to nowa klasa blokująca w `plan-review-checklist.md`. Zadanie `TDD: none` celuje w "jedno zachowanie, kilka plików", egzekwowane doradczo. Klasa B6 rozszerzona o brak `### Task Tests` na dowolnym zadaniu.

### 6. Czy implementator zostawia ślad uruchomionych testów?
Tak: sekcja `## Runs` w pliku `notes:` zadania, jedna linia na każde końcowe uruchomienie (`#### Build` i każda linia `Task Tests`): komenda verbatim plus linia podsumowania narzędzia. Per-task reviewer sprawdza, że sekcja istnieje i pokrywa wszystkie linie `Task Tests`; brak to finding. Runda poprawkowa widzi to samo.

### 7. Na których etapach biegnie komenda e2e / integracyjna hosta?
Tylko na final i na każdym re-review po nim. Checkpoint uruchamia build i `### Test Commands`, bez e2e. Reguła o ponownym biegu e2e na re-review zostaje.

### 8. Które testy napędzają TDD i `Task Tests`, a które biegną tylko w final?
TDD tylko gdy testy biegną szybko, w pamięci. Test, w którym bierze udział zewnętrzna zależność aplikacji (proces lub usługa, z którą aplikacja się łączy: baza danych, sieć, przeglądarka itp.; o klasyfikacji konkretnego suite rozstrzyga pamięć hosta), jest testem integracyjnym lub e2e: nie trafia do `### Task Tests` ani do `#### Tests` w `### Test Commands`, implementator go nie uruchamia, a biegnie zawsze i wyłącznie w final review (i na re-review) przez komendę integracyjną / e2e hosta.

## Constraints
- Etykieta `runner:` znika z dispatchu obu implementatorów (zwykłego i fix), a oba orkiestratory (`superbuild`, `simplebuild`) przestają wyliczać `<runner>`; dispatch reviewerów-forków bez zmian.
- `run.sh` i skill `executor` zostają bez zmian w treści; tracą implementatorów jako callerów, konsumentami pozostają trzej reviewerzy-forki (`superbuild-reviewer-spec`, `superbuild-reviewer-change`, `simplebuild-reviewer`).
- Komendy z planu biegną verbatim, bez owijania w `tail` ani inne ograniczanie outputu; planista dba, by komenda `Task Tests` była zawężona.
- `review-contract.md` `## Gates` jest jedynym właścicielem tego, które komendy biegną na którym etapie; trzej reviewerzy-forki wskazują tam, nie niosą własnego streszczenia.
- Pliki do zmiany: `superdev/agents/superbuild-task-implementor.md`, `superdev/agents/simplebuild-task-implementor.md`, `superdev/agents/superbuild-task-reviewer.md`, `superdev/skills/superbuild/SKILL.md`, `superdev/skills/simplebuild/SKILL.md`, `superdev/skills/superplan/SKILL.md` i `templates/plan.md`, `superdev/skills/simpleplan/SKILL.md` i `templates/plan.md`, `superdev/references/plan-review-checklist.md`, `superdev/references/adr-task.md` (sekcja `### Task Tests` z linią `none`), `superdev/references/review-contract.md` (linia o `TDD Commands`, zbiór komend gate'u per etap), `superdev/README.md`, root `CLAUDE.md` (inwariant "run.sh first / executor on DEVIATION" opisuje odtąd trzech reviewerów, nie implementatorów).
- Skill `tdd` pozostaje inline w kontekście implementatora i nadal nie nazywa transportu; mechanikę RED/GREEN (bezpośredni Bash, oczekiwany wynik) opisuje implementator.
- Plugin jest stack-agnostic: żadna komenda ani format outputu konkretnego runnera nie trafia do treści skilli.

## Out of scope
- Zmiana treści skilla `tdd`.
- Zmiana `decompose.sh` i jego testów (marker `TDD:` nadal nie trafia do indeksu).
- Blok gate'u na poziomie planu (`## Gate commands`).
- Ograniczanie outputu bezpośrednich wywołań Bash (`tail`, limity linii).
- Zmiany w reviewerach-forkach poza tym, co wynika z kontraktu (`review-contract.md`).
- Zmiana zawartości `run.sh` i `executor/SKILL.md`.

## History
- none
