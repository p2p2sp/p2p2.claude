
## Task 9 - Add the stats config switch
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Przełącznik stats` (#17)

### Dependencies
- none

### Files
- modify - superdev/scripts/read-config.sh (header contract, the key loop)
- modify - superdev/skills/setup/assets/config.yml
- modify - superdev/skills/setup/scripts/bootstrap.sh (header contract, the grep, the seeded-defaults line)
- modify - tests/superdev/read-config.test.ts
- modify - tests/superdev/bootstrap.test.ts

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c 'stats' superdev/scripts/read-config.sh - prints at least `1`
- grep -c '^stats:' superdev/skills/setup/assets/config.yml - prints `1`
- bash -n superdev/scripts/read-config.sh - exits 0
- bash -n superdev/skills/setup/scripts/bootstrap.sh - exits 0

### Task Tests
- tests/superdev/read-config.test.ts - node --test tests/superdev/read-config.test.ts
- tests/superdev/bootstrap.test.ts - node --test tests/superdev/bootstrap.test.ts

### Approach
1. In `read-config.sh`, append `stats` to the `for key in ...` loop after `cleanup` and to the `klucze:` list in the header contract, so the resolved block prints six lines in a fixed order.
2. In `superdev/skills/setup/assets/config.yml`, add `stats:     false   # Workflow execution stats -> .temp/superdev/stats/` as the last line, matching the column alignment of the lines above it.
3. In `bootstrap.sh`, add `stats` to the switch-reporting `grep -E` alternation, to the seeded-defaults line (`... cleanup=false, stats=false`) and to the two header-contract sentences that enumerate the documented keys.
4. In `read-config.test.ts`, widen `expectedBody` to a sixth `stats` parameter, update every call site and the fixed-order assertion, and add one case flipping `stats: true` alone.
5. In `bootstrap.test.ts`, update the seeded-defaults string and the idempotence run's expected switch lines with the new `stats:` line.

### Failure modes
- none - configuration wiring

### Contracts
- `stats: <true|false>` as the sixth line of `read-config.sh`'s resolved block, after `cleanup`; consumed by `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
`read-config.sh` prints six switch lines ending in `stats`, the seeded config carries it, `bootstrap.sh` reports it in both branches, both test files assert the new shape, and the whole suite is green.


### Covered criteria
17. Przełącznik stats - `read-config.sh` wypisuje `stats: <true|false>` jako szóstą linię po `cleanup`, `setup` seeduje `stats: false` w `config.yml` i raportuje go w `bootstrap.sh`, oba orkiestratory czytają go w `## Config`, a testy `read-config.test.ts` i `bootstrap.test.ts` przechodzą z nową linią.
