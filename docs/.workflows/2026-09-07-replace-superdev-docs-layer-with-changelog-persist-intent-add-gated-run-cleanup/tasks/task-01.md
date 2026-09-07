
## Task 1 - Rename the docs switch to changelog and add the cleanup switch
- Covers: criteria #1
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/scripts/read-config.sh (key loop `for key in adr rules memory docs`, header comment key list)
- modify - superdev/skills/setup/assets/config.yml (`docs:` line)
- modify - superdev/skills/setup/scripts/bootstrap.sh (grep pattern on line 60, seeded-defaults message on line 63, header comment lines 27-31)
- modify - tests/superdev/read-config.test.ts (`expectedBody`, every fixture/assertion naming `docs`, the fixed-order test)
- modify - tests/superdev/bootstrap.test.ts (seeded-defaults line, the idempotence expected stdout block)
- modify - .claude/superdev.yml (this repo's own config)

### Test Commands
#### Build
- none - the repo has no build step (markdown + bash ship as-is)

#### Tests
- `node --test tests/superdev/read-config.test.ts` -> `# fail 0`
- `node --test tests/superdev/bootstrap.test.ts` -> `# fail 0`

### Approach
1. In `read-config.sh` change the loop to `for key in adr rules memory changelog cleanup` and update the header comment's key list.
2. In `config.yml` replace the `docs:` line with `changelog: false   # Changelog -> docs/changelog/` and add `cleanup:   false   # Remove run files (docs/.workflows/<run>, spec, intent) after a completed build`; keep the column alignment style of the existing lines.
3. In `bootstrap.sh` change the grep alternation to `(adr|rules|memory|changelog|cleanup)` and the seeded message to `... defaults: adr=false, rules=false, memory=false, changelog=false, cleanup=false`; update the header comment.
4. Update `read-config.test.ts`: `expectedBody(adr, rules, memory, changelog, cleanup)` with five lines, every fixture that wrote `docs: true` now writes `changelog: true`, add one fixture proving `cleanup: true` resolves and that a leftover `docs: true` key is ignored; the fixed-order test names the five keys.
5. Update `bootstrap.test.ts` to the new seeded-defaults line and the two new asset lines in the idempotence block (must equal `config.yml` byte for byte).
6. Rewrite `.claude/superdev.yml` to the five keys, all `false`.

### Edge cases
- A host config still carrying `docs: true` resolves to nothing - the key is simply not in the loop (covered by the new test).

### Contracts
- `read-config.sh` stdout: `# superdev config (resolved)` then `adr: <bool>`, `rules: <bool>`, `memory: <bool>`, `changelog: <bool>`, `cleanup: <bool>`.

### DoD
Both test files pass; `bash superdev/scripts/read-config.sh` in this repo prints five `false` lines.


### Covered criteria
1. `superdev/scripts/read-config.sh` prints the header and exactly `adr`, `rules`, `memory`, `changelog`, `cleanup` in that order (no `docs` line), all `false` when `.claude/superdev.yml` is missing; `superdev/skills/setup/assets/config.yml` seeds the same five keys; `bootstrap.sh` reports them; `tests/superdev/read-config.test.ts` and `tests/superdev/bootstrap.test.ts` pass.
