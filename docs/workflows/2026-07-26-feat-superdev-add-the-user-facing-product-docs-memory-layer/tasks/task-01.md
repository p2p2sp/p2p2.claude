
## Task 1 - feat(superdev): add the docs config switch across setup and both test suites
- Covers: criteria #3
- TDD: none

### Dependencies
- none - blocks: Task 4

### Files
- modify - superdev/skills/setup/assets/config.yml (add `docs:    false   # Product docs system` line)
- modify - superdev/scripts/read-config.sh (key loop `for key in adr rules memory`, header key list comment)
- modify - superdev/scripts/read-config.test.sh (cases 1, 2, 5 and header contract comment)
- modify - superdev/skills/setup/scripts/bootstrap.sh (present-path `grep -E` alternation, seeded defaults string, header contract comment)
- modify - superdev/skills/setup/scripts/bootstrap.test.sh (case 4 fixture, filter and assertions; header contract comment)
- modify - superdev/skills/setup/SKILL.md (Enable opt-in switches option list)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `bash superdev/scripts/read-config.test.sh` - last line `ALL PASS (5/5)`
- `bash superdev/skills/setup/scripts/bootstrap.test.sh` - last line `ALL PASS (8/8)`
- `grep -cE '^docs:' superdev/skills/setup/assets/config.yml` - prints `1`

### Approach
- Append the `docs` line to the config asset, aligned with the existing three (key, padded `false`, trailing `# Product docs system` comment).
- In `read-config.sh`, extend the `for key in adr rules memory` loop to `adr rules memory docs` and extend the header comment key list (`klucze:`) the same way.
- In `read-config.test.sh`: Case 1 adds `grep -qxF "docs: false"`; Case 2 fixture gains `docs: true` plus the matching assertion; Case 5 `expected` block gains a fourth `docs: false` line; update the header `cases` comment from three keys to four.
- In `bootstrap.sh`: extend the present-path alternation to `(adr|rules|memory|docs)`, extend the seeded report string to `defaults: adr=false, rules=false, memory=false, docs=false`, and update the header comment's documented key list.
- In `bootstrap.test.sh`: Case 4 fixture gains a `docs: true` line, the `config_lines` filter alternation gains `docs`, and the presence assertions gain a `docs:` check; update the header `cases` comment.
- In `setup/SKILL.md`, add a `docs` bullet (`docs` - Product docs system) to the single multiSelect enable question.

### Edge cases
- `read-config.test.sh` Case 5 compares the non-comment body exactly; the `docs: false` line must be appended last so key order stays `adr, rules, memory, docs`.
- `bootstrap.test.sh` Case 1 greps the seeded report as a substring (`defaults: adr=false, rules=false`); extending the string keeps it matching - do not reorder the existing keys.
- Legacy keys `artifacts|help|ui` must stay excluded from the bootstrap report (Case 4 keeps asserting they never leak).

### Contracts
- `.superdev/config.yml` key set becomes `adr, rules, memory, docs`; `read-config.sh` stdout gains exactly one line `docs: <true|false>` after `memory:`, fail-open semantics unchanged.

### DoD
Both test suites print their final `ALL PASS` line; the asset, both scripts, and `setup/SKILL.md` all name the `docs` key.


### Covered criteria
3. The `docs` switch resolves through the whole config chain: `superdev/skills/setup/assets/config.yml` carries `docs: false`, `read-config.sh` outputs a fourth `docs:` line, `bootstrap.sh` greps and reports the `docs` key, `setup/SKILL.md` offers `docs` in the enable question, and both suites pass: `bash superdev/scripts/read-config.test.sh` prints `ALL PASS (5/5)` and `bash superdev/skills/setup/scripts/bootstrap.test.sh` prints `ALL PASS (8/8)`.
