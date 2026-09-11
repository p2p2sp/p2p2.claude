Title: "superdev review loop and quality gates"
Spec: C:/Projects/p2p2.claude/docs/.workflows/2026-09-11-superdev-review-loop-and-quality-gates/spec.md
Intent: docs/.workflows/2026-09-11-superdev-review-loop-and-quality-gates/intent.md

## Out of scope
- Izolacja builda w git worktree.
- Skill `roadmap` oraz pluginy superui, supergh, superfix, superbiz, supercc.
- Naprawa błędów w projektach, których raporty posłużyły jako dowody.
- Zmiana budżetu rund bramki per-task (max 3) i eskalacja implementora na mocniejszy model.
- Trwała księga długu w repo hosta i zmiany formatu wpisu changelogu (`changelog-writer`, `references/changelog-entry-format.md`).
- Zmiana `Model:`/`Effort:` w planach i modeli/effortu orkiestratorów.
- Zmiana skilli planowania poza szablonem zadania, checklistą i instrukcją pisania `### Approach`/`### Contracts`.

## Constraints / assumptions
- Oba tory dostają wszystkie zmiany, o ile dana warstwa istnieje na torze (simplebuild nie ma bramki per-task ani recenzenta spec; jego `simplebuild-reviewer` pełni rolę recenzenta kodu i przyjmuje werdykt `BLOCKED` dla kryteriów z nagłówka planu).
- Zwrot recenzentów do orkiestratora zostaje w postaci linii `VERDICT: PASS|FAIL|BLOCKED` (+ `REVIEW:`); format raportu na dysku może się zmieniać dowolnie, bo jedynym konsumentem jest implementor poprawek.
- Etykiety wejścia forków są zawsze ścieżkami lub krótkimi wartościami (SHA, nazwa etapu), nigdy treścią (treść psuje preload); każda nowa etykieta z wartością-ścieżką jest obsługiwana przez `resolve-input.sh` albo przez ten sam wzorzec `printf | tr | sed` co `report:`.
- Kształt sygnału limitu (fakt dla planu, nie wymaganie): wynik narzędzia Agent ma status `failed` i tekst „Agent terminated early due to an API error: You've hit your monthly spend limit …” lub „You've hit your session limit …” (error type rate_limit, HTTP 429); po resecie harness sam wstrzykuje komunikat „Your claude.ai usage limit has reset. Continue the task…”. Dokładne brzmienie może się zmieniać między wersjami Claude Code, więc plan traktuje je jako przykład sygnału (status `failed` plus błąd API o limicie), nie jako kontrakt dopasowania co do znaku.
- W żadnym skrypcie pluginu nie ma bare `git add -A` ani `git add .`; orkiestrator nie używa `cd` w Bash (ścieżki absolutne, `-C`/`--prefix`); `resolve-input.sh` ustala korzeń przez `git rev-parse --show-toplevel`.
- Zadania planu tej pracy nakazują implementorowi użycie `supercc:skill-designer` do tworzenia i zmiany plików SKILL.md i agentów.
- Konwencje repo: CLAUDE.md i skrypty po angielsku; skille stack-agnostic (żadnych założeń o konkretnym stacku ani heurystyk rozpoznawania plików testowych); żadnych em/en dashów; testy skryptów w `tests/superdev/` pod `node --test`, zielone pod bash i Git-Bash; `allowed-tools` nie ogranicza puli narzędzi, do zakazu służy `disallowed-tools`; skrypty preloadowane z exec bitem i shebangiem, wywoływane bezpośrednio; skill preloadujący skrypt nie może zakazywać `Bash`.
- Zmiana skilla lub agenta aktualizuje `superdev/.claude-plugin/plugin.json` i właściwe `CLAUDE.md`; manifest tylko przy zmianie grupy lub udokumentowanego łańcucha (tu: łańcuch buildu się zmienia).
- Edycja źródeł nie zmienia zainstalowanej wersji pluginu; weryfikacja treści skilli odbywa się przez czytanie i testy skryptów, nie przez uruchomienie zmienionego skilla w tej sesji.
- Bez ADR w tym repo.
- Stała „co 5 zadań” jest zapisana w treści obu orkiestratorów; nie ma przełącznika konfiguracji.

