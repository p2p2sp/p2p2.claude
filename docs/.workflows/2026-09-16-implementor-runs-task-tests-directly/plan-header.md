Title: "Implementors run task tests directly; executor only in build reviews"
Spec: C:\Projects\p2p2.claude\docs\.workflows\2026-09-16-implementor-runs-task-tests-directly\spec.md
Intent: docs/.workflows/2026-09-16-implementor-runs-task-tests-directly/intent.md

## Out of scope
- Zmiana treści skilla `tdd` (pozostaje inline, nie nazywa transportu uruchomień).
- Zmiana `decompose.sh` i jego testów; marker `TDD:` nadal nie trafia do indeksu zadań.
- Blok komend gate'u na poziomie planu (`## Gate commands`) zamiast per-task `### Test Commands`.
- Ograniczanie outputu bezpośrednich wywołań Bash (`tail`, limity linii, owijanie komend).
- Zmiany w reviewerach-forkach poza tym, co wynika z `review-contract.md`.
- Zmiana zawartości `run.sh` i `executor/SKILL.md`.
- Nowe uruchomienia u per-task reviewera (nadal nic nie uruchamia).

## Constraints / assumptions
- Plugin jest stack-agnostic: żadna konkretna komenda runnera ani format jego outputu nie trafia do treści agentów, skilli ani szablonów; komendy pochodzą z planu i biegną verbatim.
- `review-contract.md` `## Gates` jest jedynym właścicielem tego, które komendy biegną na którym etapie; trzej reviewerzy-forki wskazują tam i nie niosą własnego streszczenia.
- `### Task Tests` nigdy nie jest gate'em review; klasyfikacja konkretnego testu jako integracyjnego / e2e opiera się na pamięci hosta (`CLAUDE.md`, `.claude/rules/`) i treści planu, a reguła planisty niesie tylko definicję i przykłady; `### Test Commands` zostaje gate'em reviewerów bez zmian w zbieraniu i deduplikacji.
- Skill `tdd` pozostaje inline w kontekście implementatora; mechanikę RED/GREEN (bezpośredni Bash, oczekiwany wynik) opisuje implementator.
- Wszystkie pliki źródłowe pluginu po angielsku; bez myślników em/en w treści.
- Bez ADR (repo wyłącza capture ADR).

