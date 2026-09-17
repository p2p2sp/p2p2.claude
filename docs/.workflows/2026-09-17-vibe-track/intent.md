# Intent: Tor `vibe` - szybkie, bezpośrednie zmiany ze strażnikiem zakresu
Date: 2026-09-17

## Request
superdev dostaje trzeci, lżejszy tor poniżej Simple: skill `vibe`, w którym agent w zoptymalizowany sposób (jeden subagent) wprowadza proste, opisywalne jednym zdaniem zmiany bezpośrednio, bez wywiadu, planu i łańcucha recenzji. Tor jednocześnie pilnuje, czy użytkownik nie wprowadza niechcący znaczącej zmiany: lekki strażnik ocenia zakres przed wykonaniem i mierzy go po wykonaniu, a przekroczenie oddaje decyzję użytkownikowi zamiast commitować.

## Decisions
### 1. Jak użytkownik wchodzi na tor `vibe`?
Komenda `/superdev:vibe <opis>` oraz routing modelu przez `description:` na jawne sygnały szybkości ("vibe", "szybko", "teraz", "od ręki", "quick", "just do it"). Manifest dostaje trzeci tor i zdanie, że zasada "No code before an approved plan" nie obejmuje `vibe`.

### 2. Kto wykonuje zmianę?
Nowy agent `superdev:vibe-implementor` (plik w `superdev/agents/`, wpis w `agents[]`), jeden dispatch przez `Agent` tool na zmianę. Główny kontekst robi tylko rekonesans (Grep/Glob, pamięć hosta) i strażnika, pisze brief i odpala agenta; agent edytuje, uruchamia sprawdzenia i zapisuje notatki z liniami `touched:` w formacie, który czyta `commit-task.sh`. Wejście agenta to ścieżki pod etykietami `brief:`, `refs:`, `notes:`; wyjście `VERDICT: PASS|FAIL|BLOCKED` plus `REASON:` przy FAIL/BLOCKED.

### 3. Kiedy strażnik sprawdza, czy zmiana jest "znacząca"?
W dwóch punktach: przed dispatchem główny kontekst ocenia brief (da się opisać jednym zdaniem, znane pliki, brak nowych modułów i kontraktów, brak ścieżek wrażliwych) i przy wątpliwości nie odpala agenta; po dispatchu skrypt liczy fakty z `git diff` i przy przekroczeniu progu zmiana nie jest commitowana.

### 4. Co mierzy strażnik po zmianie i skąd bierze progi?
Skrypt `vibe-guard.sh` liczy z `git diff` pliki dotknięte (próg: więcej niż 5), pliki nowe (próg: więcej niż 1) i zmienione linie (próg: więcej niż 200) i wypisuje `RESULT: OK` albo `RESULT: OVER` z powodem. Ścieżki wrażliwe skrypt dostaje jako argument z listą globów, którą model wyciąga z `CLAUDE.md` i `.claude/rules/` hosta przy rekonesansie; brak deklaracji w hoście oznacza tylko progi liczbowe.

### 5. Co się dzieje, gdy strażnik mówi "za dużo"?
Strażnik jest doradcą, nie bramą: każde jego zatrzymanie to rekomendacja, którą użytkownik może odrzucić, bo zakłada się, że wie, co robi. Przed dispatchem: skill wyjaśnia jednym zdaniem, dlaczego zmiana nie jest na `vibe`, i proponuje `intent` z tym samym opisem; użytkownik może powiedzieć "mimo to vibe" i tor idzie dalej z odnotowanym override w notatkach. Po dispatchu przy `RESULT: OVER`: brak automatycznego commitu i `AskUserQuestion` z trzema opcjami: zatwierdź i commituj mimo to; cofnij dotknięte pliki (`git checkout --` na liście `touched:`, nowe pliki usunięte); zostaw diff i przejdź do `intent`, który dostaje brief i listę dotkniętych plików jako kontekst. Ta sama zasada obowiązuje przy nieudanym sprawdzeniu (decyzja 6): użytkownik może zatwierdzić commit mimo to.

### 6. Jak zmiana jest sprawdzana i czy tor commituje?
Główny kontekst wyciąga z pamięci hosta komendy sprawdzające pasujące do dotkniętego obszaru i wpisuje je do briefu jako `checks:` (`none - <powód>`, gdy host nic nie deklaruje; wtedy agent poprzestaje na przeglądzie własnego diffu). Agent uruchamia każdą komendę bezpośrednio przez `Bash` (nigdy pełna suita, nigdy `executor`), ma maksymalnie 3 rundy poprawek, po nich `VERDICT: FAIL` bez automatycznego commitu (użytkownik wybiera: zatwierdź i commituj mimo to / cofnij / zostaw diff), i zapisuje `## Runs` w notatkach. Po `RESULT: OK` strażnika główny kontekst commituje przez istniejący `commit-task.sh` z `--notes` i ścieżkami z `touched:`; tytuł commitu to zdanie briefu.

### 7. Czy tor `vibe` zapisuje warstwy wiedzy przy zamknięciu?
Nie. Żaden writer nie jest dispatchowany; commit jest jedynym zapisem. Brief i notatki agenta lądują w `.temp/superdev/vibe/<timestamp>-<slug>/` (`brief.md`, `notes.md`) jako stan maszynowy, nie w `docs/.workflows/`.

### 8. Co skill robi na wejściu z plan mode?
Jak `intent`: sprawdza, czy plan mode jest aktywny, i wychodzi z niego przez `ExitPlanMode` przed czymkolwiek innym.

## Constraints
- Nazwa toru i skilla: `vibe` (`superdev/skills/vibe/`). Osobny skill, bez przełącznika w `.claude/superdev.yml`, dostępny zawsze.
- Tor obejmuje też drobne poprawki zgłoszonych błędów; o wyborze toru decyduje użytkownik, bez zawężenia w skillu.
- Dziś żądanie "szybko / teraz" nie trafia nigdzie: `intent` odrzuca je w `description:`, `simpleplan` nie startuje spontanicznie, `simplebuild` nie jest user-invocable, a manifest zabrania kodu bez planu. `vibe` domyka tę lukę, więc `superdev/hooks/content/manifest.md` musi nazwać trzeci tor i wyjątek.
- Opisy `intent`, `simpledebug` i `tdd` odrzucają dziś argument "to trywialne"; każdy dostaje zdanie graniczne, żeby nie przechwytywał jawnej prośby o `vibe`.
- Hook `review-plan.sh` gate'uje tylko `ExitPlanMode` po zapisie pliku planu; tor bez planu jest dla niego niewidoczny, więc strażnik działa na poziomie promptu i skryptu, nie hooka.
- Zasada skrypt-nie-fork: liczenie z `git diff` jest deterministyczne, więc `vibe-guard.sh` jest skryptem bash z kontraktem w nagłówku, trusted przez wywołującego; kontrola wejściowa (osąd, czy zmiana jest jednozdaniowa) zostaje w głównym kontekście.
- Dispatch jest plikowy: agent dostaje wyłącznie ścieżki pod etykietami, nigdy wklejoną treść.
- `commit-task.sh` już obsługuje tryb bez pliku zadania (`--notes` + ścieżki); niezadeklarowana zmiana daje `exit 2` i pytanie do użytkownika, jak w Simple/Super.
- Plugin zostaje stack-agnostic: komendy sprawdzające i ścieżki wrażliwe pochodzą wyłącznie z pamięci hosta, skill nie zakłada żadnego ekosystemu.
- Samodokumentacja: `superdev/.claude-plugin/plugin.json` (`skills[]` i `agents[]`), `superdev/README.md`, root `CLAUDE.md` i manifest aktualizowane w tej samej zmianie.
- Skrypty w tym repo mają suity regresyjne pod `tests/` (`node --test`), uruchamiane też pod Git-Bash; `vibe-guard.sh` dostaje własną suitę w tym samym stylu.

## Out of scope
- Hook `PreToolUse` liczący edycje.
- Konfigurowalne progi strażnika w `.claude/superdev.yml`.
- Wpis changelogu, memory lub rules per vibe.
- Zmiany w `simplebuild-task-implementor`, `superbuild-task-implementor` i `review-plan.sh`.
- Recenzent (fork) po zmianie vibe.

## History
- none - repo nie ma `docs/changelog/` ani `docs/adr/`; kontekst decyzyjny pochodzi z `docs/competitive-analysis-2026-09-17.md` (P2.10 "tor Direct", P2.11 tripwire zakresu, sekcja "Czego nie robić") i `docs/misc/intent-handoff-context-reset.md` (zakaz furtki w pliku planu).
