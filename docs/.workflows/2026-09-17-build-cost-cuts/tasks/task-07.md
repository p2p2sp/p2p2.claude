
## Task 7 - Extend the pre-approval invariant to runtime script calls
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Niezmiennik obejmuje runtime` (#14)

### Dependencies
- `Give the three runtime-invoked scripts the exec bit` (Task 1) - blocks: niezmiennik wymaga `100755`, które to zadanie ustawia

### Files
- modify - CLAUDE.md (bullet `**Pre-approved `!` preload commands.**` linie 83-86)
- modify - superdev/skills/CLAUDE.md (bullet o preloadzie i `allowed-tools` w `## Contracts & invariants`)

### Task Checks
- grep -c 'preload and runtime' CLAUDE.md
- grep -c 'preload and runtime' superdev/skills/CLAUDE.md

### Approach
1. Root `CLAUDE.md`: przemianuj bullet na "Pre-approved bundled-script calls (preload and runtime)" (fraza literalnie, w obu plikach) i dopisz regułę runtime: każde wywołanie bundlowanego skryptu, które skill każe modelowi wykonać narzędziem Bash, jest jedną literalną linią `"${CLAUDE_PLUGIN_ROOT}/…/x.sh" <args>` (dla `run.sh` z heredokiem na stdin), bez prefiksu `bash`, bez przypisania zmiennej, bez `cd`, bez `;`; skill deklaruje po jednym wzorcu `Bash(${CLAUDE_PLUGIN_ROOT}/…/x.sh:*)` na każdy taki skrypt; skrypt ma `100755` i shebang bash. Powód w jednym zdaniu: klasyfikator uprawnień auto mode dopasowuje prefiks, a każda inna postać tej samej komendy to nowa klasyfikacja.
2. `superdev/skills/CLAUDE.md`: ten sam bullet w wersji skillowej (te same dwa wymagania, preload i runtime razem).

### Failure modes
- none - text

### Contracts
- Reguła postaci wywołania runtime (jedna literalna linia, wzorzec na skrypt, `100755`) jest zapisana raz w root `CLAUDE.md` i cytowana - consumed by `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8), `Rewrite simplebuild for no effort passing and direct script calls` (Task 9), `Move the build reviewers and e2e to direct script calls with patterns` (Task 10), `Add the setup permissions step` (Task 13), `Move vibe to direct script calls with patterns` (Task 15)

### DoD
Oba pliki opisują regułę runtime obok reguły preloadu; grepy z `### Task Checks` zwracają co najmniej `1`.


### Covered criteria
14. Niezmiennik obejmuje runtime - Niezmiennik pre-approval w root `CLAUDE.md` obejmuje wywołania runtime tak samo jak preloady.
