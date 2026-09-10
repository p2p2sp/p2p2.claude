# Intent: superbuild-task-reviewer jako agent dispatchowany przy sile zadania
Date: 2026-09-10

## Request
Implementorzy zadań w `superdev` są już dispatchowani przez `Agent` z per-taskowym `model:` / `effort:` z kolumn indeksu `decompose.sh`, ale `superbuild-task-reviewer` pozostał forkiem skilla ze statycznym `model: sonnet` / `effort: medium`. Zadanie zaimplementowane na `opus` / `xhigh` jest więc reviewowane przez sonnet na medium. Narzędzie `Skill` nie przyjmuje `model` ani `effort`, dlatego reviewer per-task ma przejść tę samą drogę co implementorzy w commicie `01e8a14`: z `superdev/skills/` do `superdev/agents/`, dispatchowany przez `superbuild` narzędziem `Agent` przy tej samej sile, którą dostał implementor tego zadania.

## Decisions
### 1. Jaką siłę dostaje reviewer względem zadania?
Jeden do jednego: reviewer dostaje dokładnie kolumny `<model>` / `<effort>` zadania z indeksu `decompose.sh`, te same, które poszły do implementora, przy pierwszym review i przy każdym re-review po `FAIL`; parametr o kolumnie `-` jest pomijany.

### 2. Jaki fallback we frontmatterze agenta, gdy kolumna w indeksie to `-`?
`model: opus`, `effort: high`, identycznie jak fallback `superbuild-task-implementor`, żeby para implementor–reviewer była spójna także dla planu bez znaczników.

### 3. Co reviewer zwraca, gdy brakuje wymaganego wejścia?
Lustro implementorów: ten sam akapit `## Input` (czytanie plików z etykiet `label: value` w prompcie), a wymagana etykieta nieobecna lub plik nieczytelny to `VERDICT: FAIL` plus `REASON: missing input <label>`, bez raportu i bez zmian na dysku. W `superbuild` dochodzi jedno zdanie: `FAIL` z `REASON:` zamiast `REVIEW:` trafia od razu do eskalacji `AskUserQuestion`, nie do re-dispatchu implementora.

## Constraints
- Wzorzec przeniesienia to commit `01e8a14` (`refactor(task-implementors): move from skills to agents with per-task model/effort dispatch`): pełny opis w `description:`, `tools:` zamiast `allowed-tools`, bez `context: fork`, bez preloadów `!`; wejścia jako etykiety w prompcie, `## <label>` jako nazwa bloku w treści.
- Preloady obecnego skilla (`git status --short`, `resolve-input.sh`, pipeline sed dla `report:` / `notes:`) przechodzą do treści agenta jako instrukcje: agent sam czyta pliki z etykiet `plan-header:` / `task:` / `notes:` / `report:` i sam uruchamia `git status --short` narzędziem `Bash`.
- Zakres review (tylko niezacommitowana praca względem HEAD plus pliki untracked, oceniana wobec `## task`), format raportu (płaska lista, Critical przed Important, raport tylko przy `FAIL`) i protokół `VERDICT: PASS` / `VERDICT: FAIL` + `REVIEW: <path>` zostają bez zmian.
- `tools:` agenta: `Read, Write, Grep, Glob, Bash`.
- Miejsca dispatchu w `superdev/skills/superbuild/SKILL.md`: krok 3 pętli zadań (pierwsze review) oraz re-review po `FAIL` implementora; oba z `subagent_type: superdev:superbuild-task-reviewer` i `model:` / `effort:` jak w kroku 2 dla tego zadania; `args` staje się `prompt` z tymi samymi etykietami (`plan-header`, `task`, `notes`, `report`).
- Samodokumentacja: `superdev/.claude-plugin/plugin.json` (wpis ze `skills[]` do `agents[]`, obok implementorów), `superdev/README.md` (wiersz tabeli Super track na `superdev:superbuild-task-reviewer` jako `Agent - ...` z dispatchem przy `Model:` / `Effort:`; `description:` skilla `superbuild` i krok 5 przepływu wspominają reviewera), root `CLAUDE.md` (mapa katalogów: `agents/` dla dwóch implementorów, task reviewera i czterech closeout writerów; wyliczenie `agents[]` w inwariancie Self-documentation).
- Worker nie może występować jednocześnie w `skills[]` i `agents[]`; katalog `superdev/skills/superbuild-task-reviewer/` znika.
- Repo nie zbiera ADR; manifest `superdev/hooks/content/manifest.md` bez zmian (nie wylicza pojedynczych skilli).

## Out of scope
- `simplebuild-reviewer`, `superbuild-reviewer-spec`, `superbuild-reviewer-change` zostają forkami skilli ze statycznym modelem.
- `decompose.sh` i suity w `tests/superdev/` bez zmian: indeks już drukuje kolumny `<model>` / `<effort>`, a żaden test nie odwołuje się do reviewerów budowy.
- Dispatch implementora w pętli końcowego review (bez `model:` / `effort:`) bez zmian.

## History
- none
