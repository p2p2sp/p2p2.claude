# Przekazanie: optymalizacja tokenów w viber (SendMessage, warunkowe składanie skilli)

Data: 2026-09-26 | Gałąź: main

## Gdzie szukać
- `docs/notes.md` - dwa pomysły źródłowe: "SendMessage do subagentów zamiast ich uruchamiać od zera" i "script injection na podstawie ustawień".
- `CLAUDE.md` (root) - nagłówek - nowa zasada: tokeny to ograniczenie projektowe (limity 5h i tygodniowy Claude Code, dryf agenta przy nadmiarze instrukcji).
- `viber/skills/implementor/SKILL.md` - sekcja `## Answers` (`retry` po `DENIED`: ten sam model, ta sama runda), krok 4 (reviewer `FAIL` w rundzie 1 -> ponowny dispatch codera z `report:`), kroki 6 i 7 (treść zależna od `memory`, `rules`, `qa`, `cleanup`). Już używa `SendMessage` przy "stopped with background work" i braku `VERDICT:`.
- `viber/agents/task-coder.md` - sekcja `## Input` (linie `report`, `reason`), bo wznowiony coder zmienia to, co dostaje.
- `viber/scripts/config.sh` - źródło przełączników dla preloadów `!`.
- `viber/skills/intent/SKILL.md` - sekcja "Issues switch" i gałąź zapisu issue (`issues`).
- `viber/skills/planner/SKILL.md` - akapit branchingu (`branching.mode`), linia hand-offu o `/viber:e2e` (`qa`), odczyt `adr-tasks.md` (`adr`, już warunkowy).
- `viber/references/plan-rules.md` - reguła `Memory-owned` (`memory`), czytana przez planner i agenta `planner-review`.
- `viber/hooks/scripts/plan-gate.sh` - wykrywanie PASS tylko z tool_use `Agent` z `subagent_type`; dlatego SendMessage dla `planner-review` zepsułby bramkę (wariant odrzucony).
- `viber/skills/fixer/SKILL.md`, `viber/skills/triage/SKILL.md` - też preloadują `config.sh` i mają gałęzie `issues`.

## Co zrobione
- Przeanalizowano oba pomysły względem kodu viber; zmierzono rozmiary plików (implementor 18,7 KB, intent 11,2 KB, planner 8,9 KB, plan-rules 8,6 KB).
- Zweryfikowano harness (agent claude-code-guide): wznowienie ukończonego subagenta przez SendMessage z pełnym kontekstem jest udokumentowane; nieudokumentowane: zmiana modelu przy wznowieniu, TTL cache subagentów, przetrwanie ID agenta po `/resume` i kompakcji, SendMessage ze skilla forkowanego. Preload `!` działa przy ładowaniu skilla, natywnego warunkowego włączania treści nie ma.
- Dopisano zasadę tokenową do nagłówka root `CLAUDE.md`. Niezacommitowane, niezweryfikowane testami (to tylko markdown).

## Decyzje
- SendMessage tylko dla codera w implementorze: poprawka po `FAIL` reviewera (runda 1) oraz `retry` po `DENIED` - agent ma już cały kontekst zadania, dostaje tylko uwagi. Użytkownik zaobserwował w innej sesji, że tak poprawiony agent szybko naprawił błędy bez ponownego czytania.
  - odrzucone: SendMessage dla `task-reviewer`, bo czystość kontekstu reviewera to duża zaleta (brak zakotwiczenia na własnych uwagach).
  - odrzucone: SendMessage dla `planner-review`, z tego samego powodu; dodatkowo wymagałby zmiany `plan-gate.sh`.
  - odrzucone: SendMessage przy `retry` z podniesieniem tieru, bo model przy wznowieniu jest najpewniej stały, a zmiana modelu nie jest priorytetem (porażki wynikały ze spójności planowania, nie z doboru modelu).
  - odrzucone: `test-runner` i repair-coder, zysk pomijalny.
- Drugi pomysł to warunkowe składanie treści skilla według przełączników (potwierdzone przez użytkownika), także w fazie planowania. Główny zysk: mniej instrukcji i rozgałęzień, więc mniej dryfu; oszczędność rozmiaru umiarkowana (ok. 3 KB w planowaniu, do ok. 5,5 KB w implementorze przy wyłączonych przełącznikach).
  - odrzucone: pozostawienie gałęzi typu "`issues: false` -> pomiń każdy krok issues", bo model i tak czyta i pilnuje całej sekcji.
- Preload `!` działa tylko w skillach (główna sesja lub fork), nie w agentach: agentowi warunkową treść przekazuje wywołujący przez linie dispatchu (jak `memory:` do `planner-review`) albo przez wybór plików referencji.
  - nie rozważano alternatyw (ograniczenie harnessu).
- Oba pomysły testowane empirycznie i wdrażane osobno, dwoma osobnymi runami `viber:intent`.
  - odrzucone: jeden wspólny run, bo nie dałoby się rozdzielić efektu każdej zmiany.

## Co dalej
1. Uruchomić `/viber:intent` dla SendMessage do codera w implementorze (poprawka po review i `retry` po `DENIED`), z pomiarem przed i po: `subagent_tokens` z powiadomień agentów oraz liczba rund.
2. Ustalić w wywiadzie ścieżkę awaryjną, gdy SendMessage nie zadziała (np. build wznowiony w innej sesji, brak ID agenta): świeży dispatch jak dziś.
3. Po zamknięciu pierwszego runu uruchomić osobny `/viber:intent` dla warunkowego składania skilli: implementor, intent, planner, fixer, triage; prawdopodobnie jeden wspólny skrypt drukujący fragmenty włączonych przełączników, z wzorcem w `allowed-tools` każdego skilla.
4. W drugim runie rozstrzygnąć regułę `Memory-owned` w `plan-rules.md` (czytaną też przez agenta): dispatch czy podział pliku.
5. Zacommitować zmianę w root `CLAUDE.md` przez `/viber:commit`.

## Otwarte problemy
- TTL cache subagentów i to, czy wznowiony transkrypt (z logami do 5 rund weryfikacji) jest tańszy od świeżego dispatchu, są nieudokumentowane; rozstrzygnie pomiar w pierwszym runie.
- Nie wiadomo, czy ID agenta przetrwa `/resume` sesji lub kompakcję orkiestratora; rozstrzygnie test empiryczny.
- Nie potwierdzono, jak odczyty z cache wliczają się do limitów 5h i tygodniowego.
- Frontmatter (`argument-hint` w `intent` i `fixer` wspomina issues) nie da się uwarunkować preloadem; do decyzji, czy to przeszkadza.
