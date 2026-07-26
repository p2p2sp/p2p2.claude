
## Task 6 - chore(superdev): sync self-documentation for the docs layer
- Covers: criteria #6
- TDD: none

### Dependencies
- Task 2, Task 3 - blocks: none

### Files
- modify - superdev/.claude-plugin/plugin.json (skills[] array)
- modify - CLAUDE.md (superdev bullet in "What this repo is")
- modify - README.md (superdev section: setup switch list and Project memory row)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `grep -c 'superdev-docs' superdev/.claude-plugin/plugin.json` - prints `2`
- `grep -q 'superdev-docs' README.md && grep -q 'docs/product' CLAUDE.md && echo OK` - prints `OK`

### Approach
- plugin.json: append `"./skills/superdev-docs/"` and `"./skills/superdev-docs-writer/"` to `skills[]` (after the superdev-rules-writer entry, keeping the memory/rules grouping).
- Root CLAUDE.md: extend the superdev bullet in "What this repo is" with the product-docs layer (per-feature user docs in the host repo's `docs/product/`, docs-as-intent, `docs` switch).
- Root README.md, Super Dev section: in the "Entry interview & environment" row extend the switch list to `(adr, rules, memory, docs - all false by default)`; in the "Project memory (agent-facing)" row add the `superdev-docs` + `superdev-docs-writer` pair (user-facing product docs in `docs/product/`) - rename that row label to cover both audiences (e.g. "Project memory & product docs").
- No manifest change: `superdev/hooks/content/manifest.md` documents behavioral guardrails only, no artifact layers or skill groups (verified during exploration).

### Edge cases
- A worker must never appear in both `skills[]` and `agents[]` - superdev has no `agents[]`, so only `skills[]` changes.
- Keep README table wording consistent with the existing rows (short role descriptions, backticked skill names).

### Contracts
- none

### DoD
plugin.json parses (valid JSON) and lists both new skills; README and root CLAUDE.md name the new layer; grep assertions green.


### Covered criteria
6. Self-documentation is in sync: `superdev/.claude-plugin/plugin.json` `skills[]` lists both new skills, the root `CLAUDE.md` superdev description mentions the product-docs layer, and the root `README.md` superdev section documents the new pair and the `docs` switch.
