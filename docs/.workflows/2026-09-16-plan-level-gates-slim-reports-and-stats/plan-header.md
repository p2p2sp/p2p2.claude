Title: "Plan-level gates, planner judgment, slim reports and a stats switch"
Spec: /Users/dario/Projects/p2p2.claude/docs/.workflows/2026-09-16-plan-level-gates-slim-reports-and-stats/spec.md
Intent: docs/.workflows/2026-09-16-plan-level-gates-slim-reports-and-stats/intent.md

## Out of scope
- Treść skilla `tdd`.
- `run.sh` i skill `executor` (nadal transport gate'u trzech reviewerów-forków).
- Kadencja checkpointu (co 5 zadań) i budżet rund (jeden fix plus jedno re-review na rundę).
- Nowe hooki; stats nie idzie przez `SubagentStop` ani `PostToolUse`.
- Zapis stats przy przerwanym buildzie (eskalacja bez powrotu, abort, limit sesji).
- Zbieranie stats w fazie planowania (`intent`, `superspec`, `superplan`, `simpleplan`).
- Podział tokenów na input / output (harness go nie udostępnia).
- Zmiana fixture'ów testowych, które nazywają stare sekcje planu, ale nie testują ich parsowania (np. `tests/superdev/commit-task.test.ts` z `### Test Commands` w fixture zadania).

## Constraints / assumptions
- Plugin jest stack-agnostic: żadna konkretna komenda runnera ani format jego outputu nie trafia do treści agentów, skilli ani szablonów; przykłady w rubrykach są opisowe, a klasyfikację konkretnego suite hosta rozstrzyga pamięć hosta.
- `review-contract.md` jest jedynym właścicielem etapów gate'u, kształtu raportu, formatów linii notes i nazewnictwa; forki, per-task reviewer i implementatory wskazują tam.
- Orkiestratory nie piszą plików; stats idzie wyłącznie przez `stats-record.sh` i `stats-report.sh`, po jednym wywołaniu Bash, z argumentami przepisanymi z powiadomienia, bez obliczeń orkiestratora.
- Harness: powiadomienie `Agent` niesie `subagent_tokens` (łącznie), `tool_uses`, `duration_ms`; wynik forka `Skill` nie niesie danych o zużyciu.
- `.temp/superdev/stats/` to machine state pod `.temp/<plugin>/`; `commit-task.sh` wyklucza `.temp/`, więc nic z tego nie trafia do commitów; raport czyta człowiek.
- Nowe skrypty: `#!/usr/bin/env bash`, `set -euo pipefail`, nagłówek z kontraktem I/O, jedna linia maszynowa na stdout, testy w konwencji repo (harness, `slash()`, Git-Bash, bez `chmod`).
- `## Gate commands` siedzi w nagłówku planu, który `decompose.sh` już kopiuje do `plan-header.md`; zmiana `decompose.sh` ogranicza się do kolumny `Review:`.
- Wszystkie pliki źródłowe pluginu po angielsku; bez myślników em / en w treści.
- Bez ADR (repo wyłącza capture ADR).

