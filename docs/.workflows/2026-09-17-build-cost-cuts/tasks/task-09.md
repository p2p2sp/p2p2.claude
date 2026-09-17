
## Task 9 - Rewrite simplebuild for no effort passing and direct script calls
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Effort nie jest przekazywany` (#9), `Jedna postać wywołania` (#12), `Wzorzec na skrypt` (#13)

### Dependencies
- `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8) - blocks: identyczne brzmienie bulletu w `## Mandatory rules` i zdań o effort
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania

### Files
- modify - superdev/skills/simplebuild/SKILL.md (frontmatter `allowed-tools`, `## Mandatory rules` linia 39, `### Stats` linie 53 i 57, `## Step 1` linie 70, 73, 75, `### Loop` linie 103, 107, `### Implementor stop` linie 120, 121, `### Fix loop` linie 131, 132, 134, 137, `## Step 3` linia 147, `## Step 4` linia 161, `## Step 5` linie 166, 167)

### Task Checks
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/simplebuild/SKILL.md
- grep -o 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/[a-z-]*\.sh:\*)' superdev/skills/simplebuild/SKILL.md | wc -l

### Approach
1. `allowed-tools`: te same siedem wzorców co w superbuild.
2. Każde `bash "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" …` -> `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" …`; bullet w `## Mandatory rules` skopiowany słowo w słowo z superbuild (`Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8)).
3. Effort: linie 39, 103, 121, 134 tracą `effort:`; linia 75 opisuje `<effort>` jako sygnał planisty, a `<review>` jako kolumnę ignorowaną na tym torze (bez zmian znaczenia); linie 53 i 57: pole effort w `stats-record.sh` zawsze `-`.

### Failure modes
- none - text

### Contracts
- none

### DoD
Simplebuild nie zawiera `bash "${CLAUDE_PLUGIN_ROOT}`, deklaruje osiem wzorców i nie przekazuje `effort:`; linie `### Task Checks` wypisują `0` i `8`.


### Covered criteria
9. Effort nie jest przekazywany - Żaden dispatch wykonywany przez superbuild ani simplebuild nie niesie parametru `effort`, a każde zdarzenie `stats` ma `-` w kolumnie effort.
12. Jedna postać wywołania - Każde runtime wywołanie bundlowanego skryptu zapisane w superbuild, simplebuild, `e2e`, `vibe` i trzech recenzentach budowy jest pojedynczym bezpośrednim wywołaniem ścieżki skryptu z argumentami (dla `run.sh` z heredokiem na stdin, jak dziś): bez prefiksu `bash`, bez przypisania zmiennej, bez `cd` i bez `;`.
13. Wzorzec na skrypt - Każdy z tych skilli deklaruje jeden wzorzec pre-approval na każdy skrypt, który uruchamia w runtime, a każdy tak uruchamiany skrypt jest wykonywalny w indeksie git i ma shebang bash.
