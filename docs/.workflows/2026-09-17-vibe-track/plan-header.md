Title: "Vibe track - fast direct changes with an advisory scope guard"
Spec: C:/Projects/p2p2.claude/docs/.workflows/2026-09-17-vibe-track/spec.md
Intent: docs/.workflows/2026-09-17-vibe-track/intent.md

## Out of scope
- Hook `PreToolUse` liczący edycje lub blokujący pliki poza zbiorem.
- Konfigurowalne progi strażnika w `.claude/superdev.yml`; progi są stałe.
- Wpis w changelogu, memory lub rules po zmianie vibe; żaden writer wiedzy nie jest uruchamiany.
- Recenzent (fork) po zmianie vibe.
- Zmiany w `simplebuild-task-implementor`, `superbuild-task-implementor` i `review-plan.sh`.
- Automatyczna diagnoza błędu w stylu `simpledebug` (śledzenie przepływu, test reprodukcyjny); `vibe` wykonuje to, o co użytkownik poprosił, a o wyborze toru dla poprawki błędu decyduje użytkownik.

## Constraints / assumptions
- Plugin pozostaje stack-agnostic: komendy sprawdzające i ścieżki wrażliwe pochodzą wyłącznie z pamięci hosta; tor nie zakłada żadnego ekosystemu ani narzędzia hosta.
- Tor jest dostępny zawsze, bez przełącznika w `.claude/superdev.yml`, i nie wymaga żadnej nowej konfiguracji hosta; brak deklaracji w pamięci hosta zawsze oznacza "słabszy strażnik", nigdy błąd.
- Progi rozmiaru (5 plików, 1 nowy plik, 200 linii) są stałe i takie same dla każdego hosta.
- Tor nigdy nie tworzy gałęzi git i commituje na bieżącej gałęzi.
- Tor rusza także na brudnym drzewie roboczym, bez migawki stanu sprzed przebiegu; `vibe` jest dla świadomych użytkowników, którzy wiedzą, że "cofnij" przywraca dotknięte pliki do HEAD.
- Strażnik działa na poziomie promptu i deterministycznego skryptu, nie hooka; superdev nadal ma jeden hook.
- Strażnik jest doradcą, nie bramą: jawna decyzja użytkownika ma pierwszeństwo przed każdym jego zatrzymaniem (wejściowym, rozmiarowym, po nieudanym sprawdzeniu); każde nadpisanie jest odnotowane w notatkach przebiegu.
- Nowy skill i agent podlegają zasadzie samodokumentacji repo: każda dodana pozycja jest wpisana do `plugin.json`, README i CLAUDE.md w tej samej zmianie.
- Repo nie prowadzi ADR; żaden dokument decyzji nie powstaje.

