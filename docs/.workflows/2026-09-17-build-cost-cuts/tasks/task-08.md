
## Task 8 - Rewrite superbuild for Review: none, no effort passing and direct script calls
- TDD: none
- Model: opus
- Effort: high
- Covers: `Review none pomija recenzenta` (#1), `Effort nie jest przekazywany` (#9), `Jedna postać wywołania` (#12), `Wzorzec na skrypt` (#13)

### Dependencies
- `Rewrite the dispatch strength rules in the review contract` (Task 2) - blocks: brzmienie trzech stanów `Review:`
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania
- `Give the three runtime-invoked scripts the exec bit` (Task 1) - blocks: postać bezpośrednia wymaga `100755`

### Files
- modify - superdev/skills/superbuild/SKILL.md (frontmatter `allowed-tools`, `## Mandatory rules` linia 39, `### Stats` linie 53 i 57, `## Step 1` linie 70, 73, 75, `### Loop` linie 103, 107, 109, 111, `### Implementor stop` linie 124, 125, `### Fix loop` linie 135, 136, 138, 141, `## Step 3` linia 157, `## Step 4` linia 171, `## Step 5` linie 176, 177)

### Task Checks
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/superbuild/SKILL.md
- grep -o 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/[a-z-]*\.sh:\*)' superdev/skills/superbuild/SKILL.md | wc -l
- grep -c -e 'Review: none' -e 'column is' superdev/skills/superbuild/SKILL.md

### Approach
1. `allowed-tools`: obok istniejącego `read-config.sh` dodaj po jednym wzorcu `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh:*)` dla `decompose.sh`, `commit-task.sh`, `stats-record.sh`, `stats-report.sh`, `checkpoint-update.sh`, `record-decision.sh`, `cleanup-run.sh`.
2. Każde wywołanie `bash "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" …` w treści zamień na `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" …` (pierwszy grep z `### Task Checks` ma zwrócić `0`); w `## Mandatory rules` dodaj bullet: każde wywołanie skryptu to jedna literalna linia w tej postaci, bez przypisań zmiennych, bez `cd`, bez `;`, z każdym argumentem w cudzysłowie - według reguły z root `CLAUDE.md` (`Extend the pre-approval invariant to runtime script calls` (Task 7)).
3. Effort: linia 39 mówi tylko o `model:`; linie 103, 109, 125, 138 tracą `effort:` (dispatch niesie wyłącznie `model:` z kolumny `<model>`, lub nic, gdy kolumna to `-`); linia 75 opisuje kolumnę `<effort>` jako sygnał planisty nieużywany przy dispatchu; linia 57 i 53: w `stats-record.sh` pole effort zawsze `-`.
4. `### Loop` krok 3: kolumna `<review>` równa `none` -> recenzent nie jest dispatchowany, żadnego zdarzenia `task-reviewer`, przejście prosto do kroku 4 (commit); kolumna `-` -> dispatch bez `model`; inna -> `model:` = pierwszy token, drugi token ignorowany. Krok 6 (checkpoint) bez zmian.
5. Linia 75 opisuje trzy stany kolumny `<review>` zgodnie z kontraktem (`Rewrite the dispatch strength rules in the review contract` (Task 2)).

### Failure modes
- when the `<review>` column carries a token outside `-`, `none` and `<model> <effort>` -> response eskalacja `AskUserQuestion` nazywająca zadanie `` `<title>` (Task NN) `` (skip reviewer / abort), log zdarzenie `escalation` w stats, test none - prose

### Contracts
- Stan kolumny `<review>` = `none` oznacza brak dispatchu recenzenta i brak zdarzenia `task-reviewer` w stats; `stats-report.sh` renderuje wtedy `-` w kolumnie Review (istniejący fallback, linia 208) - consumed by `Render model-only strength in the stats report` (Task 11)

### DoD
Superbuild nie zawiera `bash "${CLAUDE_PLUGIN_ROOT}`, deklaruje osiem wzorców (`read-config.sh` plus siedem), nie przekazuje `effort:` w żadnym dispatchu, pomija recenzenta przy `none`; linie `### Task Checks` wypisują `0`, `8` i co najmniej `1`.


### Covered criteria
1. Review none pomija recenzenta - Zadanie toru Super z markerem `Review: none` jest committowane bezpośrednio po `VERDICT: PASS` implementora, bez dispatchu recenzenta per zadanie i bez zdarzenia `task-reviewer` w `stats` dla tego zadania.
9. Effort nie jest przekazywany - Żaden dispatch wykonywany przez superbuild ani simplebuild nie niesie parametru `effort`, a każde zdarzenie `stats` ma `-` w kolumnie effort.
12. Jedna postać wywołania - Każde runtime wywołanie bundlowanego skryptu zapisane w superbuild, simplebuild, `e2e`, `vibe` i trzech recenzentach budowy jest pojedynczym bezpośrednim wywołaniem ścieżki skryptu z argumentami (dla `run.sh` z heredokiem na stdin, jak dziś): bez prefiksu `bash`, bez przypisania zmiennej, bez `cd` i bez `;`.
13. Wzorzec na skrypt - Każdy z tych skilli deklaruje jeden wzorzec pre-approval na każdy skrypt, który uruchamia w runtime, a każdy tak uruchamiany skrypt jest wykonywalny w indeksie git i ma shebang bash.
