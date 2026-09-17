
## Task 10 - Move the build reviewers and e2e to direct script calls with patterns
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Jedna postać wywołania` (#12), `Wzorzec na skrypt` (#13)

### Dependencies
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania
- `Give the three runtime-invoked scripts the exec bit` (Task 1) - blocks: `commit-task.sh` w `e2e` wołany bezpośrednio

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (frontmatter `allowed-tools` linia 8)
- modify - superdev/skills/superbuild-reviewer-change/SKILL.md (frontmatter `allowed-tools` linia 8)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (frontmatter `allowed-tools` linia 8)
- modify - superdev/skills/e2e/SKILL.md (frontmatter `allowed-tools` linia 7, blok komendy linie 149-151)

### Task Checks
- grep -c 'Bash(\${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh:\*)' superdev/skills/superbuild-reviewer-spec/SKILL.md superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/e2e/SKILL.md
- grep -c 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:\*)' superdev/skills/e2e/SKILL.md

### Approach
1. Trzy recenzenty: do `allowed-tools` dodaj `Bash(${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh:*)`; treść (linie 38-40, wywołanie `run.sh` z heredokiem według `review-contract.md` `## Gates`) już ma postać bezpośrednią i zostaje.
2. `e2e`: blok komendy linii 150 -> `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "test(e2e): <run id>" --path …`; do `allowed-tools` dodaj `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)`.

### Failure modes
- none - text

### Contracts
- none

### DoD
Trzy recenzenty deklarują wzorzec `run.sh`, `e2e` woła `commit-task.sh` bezpośrednio i deklaruje jego wzorzec; pierwszy grep z `### Task Checks` wypisuje `:1` dla każdego z trzech plików, drugi `0`, trzeci `1`.


### Covered criteria
12. Jedna postać wywołania - Każde runtime wywołanie bundlowanego skryptu zapisane w superbuild, simplebuild, `e2e`, `vibe` i trzech recenzentach budowy jest pojedynczym bezpośrednim wywołaniem ścieżki skryptu z argumentami (dla `run.sh` z heredokiem na stdin, jak dziś): bez prefiksu `bash`, bez przypisania zmiennej, bez `cd` i bez `;`.
13. Wzorzec na skrypt - Każdy z tych skilli deklaruje jeden wzorzec pre-approval na każdy skrypt, który uruchamia w runtime, a każdy tak uruchamiany skrypt jest wykonywalny w indeksie git i ma shebang bash.
