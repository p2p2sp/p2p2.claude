
## Task 6 - Remove the docs layer and its planning-side gate
- Covers: criteria #6
- TDD: none

### Dependencies
- Task 5 - blocks: the orchestrators must stop invoking superdev-docs-writer before its directory is deleted

### Files
- delete - superdev/skills/superdev-docs/SKILL.md
- delete - superdev/skills/superdev-docs-writer/SKILL.md
- delete - superdev/skills/superdev-docs-writer/references/doc-format.md
- modify - superdev/.claude-plugin/plugin.json (`skills[]` - remove `./skills/superdev-docs/` and `./skills/superdev-docs-writer/`)
- modify - superdev/skills/intent/SKILL.md (remove line 15, the `docs/product` Explore bullet)
- modify - superdev/skills/superplan/SKILL.md (remove line 64, the `docs/product` self-review bullet)
- modify - superdev/skills/simpleplan/SKILL.md (remove line 64, the `docs/product` self-review bullet)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `grep -rn "docs/product\|superdev-docs" superdev/skills/ superdev/.claude-plugin/ superdev/scripts/` -> no output, exit 1
- `node --test tests/portability.test.ts` -> `# fail 0`

### Approach
1. `git rm -r superdev/skills/superdev-docs superdev/skills/superdev-docs-writer`.
2. Remove the two entries from `plugin.json`, keeping valid JSON (no trailing comma).
3. Delete the three `docs/product` bullets in `intent`, `superplan`, `simpleplan`; nothing replaces them.

### Edge cases
- none

### Contracts
- none

### DoD
grep returns nothing under `superdev/skills/`, `superdev/.claude-plugin/`, `superdev/scripts/` (README mentions are Task 9's); `plugin.json` parses (`node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"` exits 0).


### Covered criteria
6. `superdev/skills/superdev-docs/` and `superdev/skills/superdev-docs-writer/` are deleted; `grep -rn "docs/product\|superdev-docs" superdev/skills/ superdev/.claude-plugin/ superdev/scripts/` returns nothing; `intent`, `superplan` and `simpleplan` no longer carry the `docs/product` contradiction gate (the `superdev/README.md` mentions are removed in criterion #9).
