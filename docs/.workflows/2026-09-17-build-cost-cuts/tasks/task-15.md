
## Task 15 - Move vibe to direct script calls with patterns
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Jedna postać wywołania` (#12), `Wzorzec na skrypt` (#13)

### Dependencies
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania
- `Give the three runtime-invoked scripts the exec bit` (Task 1) - blocks: `commit-task.sh` wołany bezpośrednio

### Files
- modify - superdev/skills/vibe/SKILL.md (frontmatter `allowed-tools` linia 6, `## Guard` linia 158, `## Commit` linia 210)

### Task Checks
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/vibe/SKILL.md
- grep -o -e 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh:\*)' -e 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:\*)' superdev/skills/vibe/SKILL.md | wc -l

### Approach
1. `allowed-tools`: dodaj `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh:*)` i `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)`.
2. Linia 158: `"${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh" <run dir>/notes.md …`; linia 210: `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<goal sentence>" --notes …`; reszta zdań bez zmian.

### Failure modes
- none - text

### Contracts
- none

### DoD
Vibe nie zawiera `bash "${CLAUDE_PLUGIN_ROOT}` i deklaruje oba wzorce; linie `### Task Checks` wypisują `0` i `2`.


### Covered criteria
12. Jedna postać wywołania - Każde runtime wywołanie bundlowanego skryptu zapisane w superbuild, simplebuild, `e2e`, `vibe` i trzech recenzentach budowy jest pojedynczym bezpośrednim wywołaniem ścieżki skryptu z argumentami (dla `run.sh` z heredokiem na stdin, jak dziś): bez prefiksu `bash`, bez przypisania zmiennej, bez `cd` i bez `;`.
13. Wzorzec na skrypt - Każdy z tych skilli deklaruje jeden wzorzec pre-approval na każdy skrypt, który uruchamia w runtime, a każdy tak uruchamiany skrypt jest wykonywalny w indeksie git i ma shebang bash.
