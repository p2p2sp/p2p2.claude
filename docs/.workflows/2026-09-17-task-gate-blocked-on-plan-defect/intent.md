# Intent: Bramka per-zadanie zwraca BLOCKED przy defekcie planu
Date: 2026-09-17

## Request
Recenzent zadania (`superdev/agents/superbuild-task-reviewer.md`) musi umieć zwrócić `VERDICT: BLOCKED`, kiedy wada siedzi w planie, a nie w kodzie. Dziś ma na to wyłącznie linię `NOTE: plan defect`, której nikt nie realizuje, bo poza licznikiem w raporcie statystyk nie czyta jej żaden konsument. Skoro do takiej sytuacji w ogóle doszło, zawiodło też planowanie i źle rozpisało zadania, więc zmiana obejmuje także warstwę zapobiegawczą po stronie recenzji planu.

## Decisions
### 1. Co ma wyzwalać `VERDICT: BLOCKED` na bramce per-zadanie?
Wyłącznie niespełnione kryterium z sekcji `### Covered criteria` tego zadania, kiedy winna jest treść planu, a nie brakujący kod. To ten sam warunek, który wiąże dziś trzech recenzentów build w `superdev/references/review-contract.md`.

### 2. Co orkiestrator robi z BLOCKED na bramce per-zadanie?
W `superdev/skills/superbuild/SKILL.md` powstaje gałąź: żaden implementor nie rusza, jedno pytanie na każdy punkt `### Needs decision`, trzy wyjścia - **przyjmij jak jest** (zapis przez `record-decision.sh`, wraca sam recenzent, to nie liczy się jako runda), **popraw plan** (użytkownik dyktuje regułę, `record-decision.sh` zapisuje ją jako tekst wiążący, rusza implementor z `decisions:` na wejściu, dopiero po nim recenzent) i **przerwij**.

### 3. Skąd recenzent zadania bierze słownictwo BLOCKED?
Zaczyna dostawać etykietę `refs:` i wiąże się z `superdev/references/review-contract.md`; jego okrojona kopia szkieletu raportu i schematu identyfikatorów znika. Kontrakt zyskuje akapit nazywający sekcje, które obowiązują bramkę per-zadanie, oraz sekcje raportu, których ta bramka nie pisze (`## Gates`, `## Prior findings`, `## Debt`).

### 4. Co zostaje z `NOTE: plan defect`?
Marker zostaje, zawężony do defektu planu, który nie dotyka kryterium tego zadania; przy kolizji pierwszeństwo ma BLOCKED. Trzej recenzenci build (`superbuild-reviewer-spec`, `superbuild-reviewer-change`, `simplebuild-reviewer`) dostają wprost polecenie czytania tych linii z `*-notes.md` i rozstrzygania ich własnym, całobudowlanym mandatem.

### 5. Warstwa zapobiegawcza - co zmieniamy w planowaniu?
`superdev/references/plan-review-checklist.md` zyskuje nową klasę blokującą: bramka nad wartością spoza procesu opisana jako lista zakazów jest blokująca, a plan musi definiować zbiór przyjmowany jako zamknięty. Checklist jest współdzielony, więc reguła działa jednocześnie na oba autorskie samosprawdzenia i obu recenzentów planu.

### 6. Kto poza naprawianym zadaniem widzi poprawkę planu zapisaną w `decisions.md`?
Etykieta `decisions:` idzie do każdego dyspozytu pętli zadaniowej, kiedy plik istnieje: do implementora przy każdym zadaniu, nie tylko naprawczym, i do recenzenta zadania.

### 7. Identyfikatory znalezisk na bramce per-zadanie
Recenzent zadania dostaje etykietę `prior:` ze ścieżką raportu poprzedniej rundy tego samego zadania i czyta ją wyłącznie dla ciągłości numeracji znalezisk oraz po to, by wciąż otwartego znaleziska nie wystawić pod nowym numerem. Raport nie zyskuje żadnej nowej sekcji.

### 8. Czy poprawić przy okazji brak `## Naming` na liście wiążących sekcji w `superbuild-reviewer-change`?
Tak. `superdev/skills/superbuild-reviewer-change/SKILL.md` pomija `## Naming` i w efekcie każe nazwać punkt `### Needs decision` samym identyfikatorem, choć orkiestrator czyta z tego punktu tytuł. Leży to wprost na przebudowywanej ścieżce i wchodzi w zakres.

## Constraints
- Plan jest zamrożony po werdykcie PASS recenzenta planu (bramka zatwierdzenia uzbraja się na każdy zapis po PASS), więc poprawka planu z decyzji 2 musi żyć w `implementation/decisions.md`, którego kontrakt już dziś każe traktować jak tekst planu.
- `scripts/record-decision.sh` jest jedynym pisarzem `decisions.md`; orkiestratory nie piszą żadnego pliku same, również przekierowaniem powłoki.
- Dziś `NOTE: plan defect` ma pięciu piszących i jednego konsumenta - licznik w `superdev/scripts/stats-report.sh`, czynny tylko przy przełączniku `stats: true`. Zawężenie markera musi ten licznik zostawić działającym.
- `superdev/references/review-contract.md` zapisuje dziś wprost, że recenzent zadania nigdy nie dostaje `refs:` i nosi ręcznie odbitą kopię; decyzja 3 ten niezmiennik zmienia, więc zmiana obejmuje też korzeniowy `CLAUDE.md` i `superdev/README.md`.
- Żaden agent ani skill nie powstaje i nie znika, więc `superdev/.claude-plugin/plugin.json` pozostaje bez zmian.
- Edycja markdown i JSON jest wydaniem - nie ma kroku budowania ani lintera na żadnym poziomie repo.
- Materiał dowodowy zmiany: bieg `docs/.workflows/2026-09-16-bloki-jako-pluginy/phases/03-tokeny-i-filtr-css` w projekcie seo-cms, gdzie trzy rundy bramki per-zadanie znalazły trzy różne przecieki tej samej konstrukcji planu, a notatka o `image-set` powtórzyła się w każdej z nich bez skutku.

## Out of scope
- `superdev/scripts/decompose.sh` - nie powstaje mechaniczny licznik pokrycia w kierunku kryterium → zadanie.
- Szablony planu - nie powstaje wymóg dowodu przy każdym wpisie `Covers:`.
- Pętla zadaniowa `simplebuild`, która bramki per-zadanie nie ma w ogóle; z tej zmiany dotyka jej wyłącznie polecenie czytania notatek z decyzji 4, kierowane do `simplebuild-reviewer`.
- Tabela znalezisk poprzedniej rundy z werdyktami ADDRESSED / NOT ADDRESSED / ACCEPTED na bramce per-zadanie.
- Naprawa samego projektu seo-cms i jego filtru CSS.
- Zapis ADR - to repo zapisu ADR nie prowadzi.

## History
- none
