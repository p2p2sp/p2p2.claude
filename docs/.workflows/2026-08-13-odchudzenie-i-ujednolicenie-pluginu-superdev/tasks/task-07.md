
## Task 7 - refactor(superbuild): move the ADR delegation into Close-Out
- Covers: criteria #6
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/skills/superbuild/SKILL.md (## Config, ## Step 2 - Record ADR, numeracja kroków 3-6)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `grep -n "^## Step" superdev/skills/superbuild/SKILL.md` - oczekiwane: pięć kroków, żaden nieopisany jako Record ADR
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Usuń sekcję `## Step 2 - Record ADR` w całości.
2. Przenumeruj pozostałe kroki na 1-5 i popraw wszystkie odwołania w treści, w tym zdanie w sekcji `## Config` wskazujące, które kroki są bramkowane którym przełącznikiem.
3. W kroku Close-Out dopisz delegację `adr: true` obok `memory`, `rules` i `docs`, przekazując labeled block z `plan: <plan-copy path>`, `spec: <spec path>` i `adr: docs/adr`, wzorując się na analogicznej delegacji w `simplebuild/SKILL.md`.
4. W kroku Done zachowaj wymóg zrelacjonowania linii `ADR:` dosłownie w podsumowaniu.

### Edge cases
`superbuild-adr` przyjmuje `spec` jako etykietę opcjonalną (`'?spec'` w preloadzie `resolve-input.sh`), więc przekazanie `spec:` z Close-Outu jest poprawne i zachowuje dotychczasowe wejście skilla.

### Contracts
`superbuild-adr` czyta wyłącznie plan i spec, nigdy kodu - przesunięcie za pętlę implementacji nie zmienia jego wejścia ani wyjścia (`ADR: <path>` albo `ADR: none`).

### DoD
`superbuild/SKILL.md` ma pięć kroków, ADR jest jedną z równoległych delegacji Close-Outu bramkowanych configiem, oba pipeline'y wołają `superbuild-adr` w tym samym miejscu.


### Covered criteria
6. `superbuild/SKILL.md` nie ma osobnego kroku ADR przed pętlą implementacji; `superbuild-adr` jest wołany w Close-Oucie równolegle z delegacjami `memory`, `rules`, `docs`.
