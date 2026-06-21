# Claude Code Artifacts w superdev — analiza i propozycje

> Data: 2026-06-21. Status: propozycje do decyzji (przed interview → plan).

## Czym faktycznie jest Artifacts (fakty wiążące)

Claude Code Artifacts to realna, aktualna funkcja (beta, ~18.06.2026) — **inna niż Artifacts w claude.ai**.

- Claude zapisuje **jeden samodzielny plik `.html` / `.htm` / `.md`** do projektu, a następnie
  **publikuje go jako żywą stronę** pod prywatnym URL na claude.ai. Strona aktualizuje się „w miejscu",
  jest **wersjonowana**, współdzielona **tylko wewnątrz organizacji**.
- Bez backendu, bez zewnętrznych żądań (twarda CSP), max 16 MiB, jedna strona.
- **Twarde bramki dostępności:** plan Team/Enterprise, logowanie przez `/login` (nie API key /
  nie Bedrock/Vertex/Foundry), **domyślnie wyłączone w Agent SDK / GitHub Action / kontekstach MCP**.
  Gdy warunki niespełnione → Claude po prostu zapisuje lokalny plik HTML albo mówi, że nie może opublikować.
- Publikacja jest **interaktywna**: pyta o zgodę (pierwszy raz dla danego artefaktu), otwiera przeglądarkę.
  **Republikacja istniejącego artefaktu nie pyta ponownie.**
- Wyłączniki: `disableArtifact`, `CLAUDE_CODE_DISABLE_ARTIFACT=1`, `permissions.deny: Artifact`.
  Auto-otwieranie przeglądarki: `CLAUDE_CODE_ARTIFACT_AUTO_OPEN=0`. Reopen ostatniego: `Ctrl+]`.
- **Wbudowany „design skill" sam szuka systemu designu w projekcie** (tokeny w CLAUDE.md / theme),
  zanim wybierze własny styl. Docs wprost zachęcają: „zamień powtarzalny prompt artefaktu w **skill**".

## Wniosek strategiczny dla superdev

Trzy rzeczy ustawiają każdą integrację:

1. **superdev jest dystrybuowany do dowolnych użytkowników** — wielu nie ma Team/Enterprise ani `/login`.
   Artefakty **muszą być opcjonalne i degradować się łagodnie** (lokalny plik = fallback). To dokładnie
   filozofia „fail-open" hooków w tym repo.
2. **Publikacja jest main-session / interaktywna** — nie pasuje do skilli forkowanych ani do 3-liniowego
   kontraktu `STATUS / Report / Summary`. Logika publikacji musi siedzieć w sesji głównej (jak `gh-commit`
   router czy `dev-plan-review`), nie w forkach.
3. **Republish-in-place** rozwiązuje spam zgód w pętli orchestratora: publikujesz **jeden** artefakt
   na starcie, aktualizujesz go po każdym tasku.

Darmowa synergia: **`ui-extract` produkuje system designu na dysku — który wbudowany design-skill Artifacts
automatycznie honoruje.** superdev już dziś sprawia, że każdy artefakt jest on-brand.

## Propozycje (uszeregowane wg dopasowania)

### A — Publikacja podglądu webowego jako żywy artefakt (REKOMENDACJA)
`ui-web-preview` już renderuje zero-build statyczny HTML z systemu designu (L1/L2). Ten output **jest**
plikiem źródłowym artefaktu. Rozszerzyć skill o opcjonalny krok „opublikuj jako artefakt" → współdzielony
URL dla designera/PM bez uruchamiania czegokolwiek. Fallback = obecne zachowanie (lokalny plik).
Praktycznie zerowa zmiana koncepcyjna, plus synergia z `ui-extract`.

- **Wartość:** lokalne podglądy stają się współdzielonymi powierzchniami review.
- **Ryzyko:** bramki dostępności — degraduje do lokalnego pliku (= dzisiejsze zachowanie, idealny fallback).

### B — Dashboard go/no-go z `dev-final-review`
Bramka finalna syntetyzuje `dev-plan-audit` + pełny `dev-run` + `dev-smoke` w jeden werdykt (dziś 3 linie
STATUS). Podręcznikowy „dashboard z danych sesji": macierz pass/fail per task, pokrycie Deliverable, wynik
build/test/lint, wynik smoke, powód blokady — jako współdzielona strona gotowości do release'u.

- **Wartość:** werdykt go/no-go staje się przeglądalny dla nie-terminalowych interesariuszy; trwały zapis decyzji.
- **Ryzyko:** koszt tokenów na każdym zakończeniu pipeline'u → opt-in. Dane produkują forki, publikuje sesja główna.

### C — Żywy checklist postępu w `dev-orchestrate`
Docs wprost: „checklist artifact, odhaczaj w trakcie". Jeden artefakt publikowany na starcie pipeline'u,
**republish in-place po każdym tasku**: lista tasków + status, bieżący task, commity, werdykty review.

- **Wartość:** długie pipeline'y stają się „oglądalne" przez link.
- **Ryzyko:** najgorętsza ścieżka tokenowo → twardo opt-in, sterowane z sesji głównej.

### D — PR-walkthrough sparowany z `gh-pr`
Sztandarowy przykład Anthropic („oprowadź recenzenta po PR z anotowanym diffem"). Towarzyszący artefakt:
anotowany diff + intencja planu + mapowanie per-task + werdykt final-review, linkowany w treści PR.

- **Wartość:** bogatsze review niż goły PR; spina narrację planu → tasków → review w jedną stronę.
- **Ryzyko:** org-scoped — recenzent zewnętrzny nie zobaczy; PR pozostaje kanonem. Ulepszenie wewnątrzzespołowe.

### E — Plan / spec jako artefakt (`dev-extraplan` / `dev-spec`)
Render planu: intent, model, pliki, opcje obok siebie, ryzyka, out-of-scope + anotacja werdyktu
`dev-plan-review`. Wzorzec „compare alternatives" pasuje do opcji w planie.

- **Wartość:** sign-off interesariuszy bez czytania surowego markdownu; opcje wyłożone wizualnie.
- **Ryzyko:** artefakt to widok równoległy, nie źródło prawdy — nie może mylić bramki w `.claude/plans/`.

## Ograniczenia przekrojowe (dziedziczy każda ścieżka)

1. Opcjonalność + łagodna degradacja (bramki dostępności).
2. Tylko sesja główna (publikacja jest interaktywna: zgoda + przeglądarka); poza forkami i poza kontraktem STATUS.
3. Publish-once / update-in-place — unikanie spamu zgód w pętlach.
4. Opt-in (koszt tokenów) — nigdy auto-publikacja na każdym przebiegu.
5. Inwariant self-doc: nowy/zmieniony skill → aktualizacja `plugin.json` + `hooks/content/manifest.md` + `CLAUDE.md`.

## Rekomendacja

Zacząć od **A** (najniższe ryzyko, najlepsze dopasowanie, reużycie istniejącego output, idealny fallback,
synergia z systemem designu). **B** to drugi najlepszy ruch (duża wartość dla pipeline'u dev, bardziej inwazyjny
i wrażliwy tokenowo).

## Źródła

- [Share session output as artifacts — Claude Code Docs](https://code.claude.com/docs/en/artifacts)
- [Claude Code now supports artifacts — claude.com](https://claude.com/blog/artifacts-in-claude-code)
- [Anthropic launches live Artifacts for Claude Code — TestingCatalog](https://www.testingcatalog.com/anthropic-launches-live-artifacts-for-claude-code/)
