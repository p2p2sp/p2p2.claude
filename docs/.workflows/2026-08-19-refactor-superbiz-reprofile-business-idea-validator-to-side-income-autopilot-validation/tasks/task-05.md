
## Task 5 - docs(superbiz): sync plugin and repo docs with the side-income validator profile
- TDD: none
- Covers: criteria #11

### Dependencies
- Task 1 - blocks: docs must describe the shipped researcher profile
- Task 4 - blocks: docs must describe the shipped entry profile

### Files
- modify - superbiz/CLAUDE.md (`## Skills (qualified superbiz:<name>)` - the `business-idea-validator` and `business-idea-validator-researcher` entries; the plugin intro sentence)
- modify - CLAUDE.md (the `superbiz` bullet in `## What this repo is`)
- modify - README.md (the `superbiz` bullet in the intro list; the `## Super Biz` table rows for `business-idea-validator` and `business-idea-validator-researcher`)

### Test Commands
#### Build
- none

#### Tests
- `grep -c 'side-income' superbiz/CLAUDE.md` - expected: >= 1
- `grep -c 'side-income' CLAUDE.md` - expected: >= 1
- `grep -E 'an .opus. fork' CLAUDE.md; test $? -eq 1` - expected: exit 0 (stale model claims gone from the rewritten bullet)
- `grep -E 'GO / PIVOT / NO-GO|GO/PIVOT' README.md; test $? -eq 1` - expected: exit 0
- `grep -c 'BUILD / PIVOT / DROP' README.md` - expected: >= 1
- `grep -RE '—|–' superbiz/CLAUDE.md; test $? -eq 1` - expected: exit 0

### Approach
- superbiz/CLAUDE.md: rewrite the plugin intro sentence and the two validator skill entries to the side-income autopilot profile - validator interviews about the idea plus maintenance-hours budget and income target, researcher applies the 1-10 PCV-led rubric with the autopilot hard gate and returns BUILD/PIVOT/DROP; keep the mandatory-council-round and roadmap-offer wording as is (mechanics unchanged).
- Root CLAUDE.md: rewrite the superbiz bullet in `## What this repo is` - validator described as side-income autopilot validation with BUILD/PIVOT/DROP; drop both "(an `opus` fork ...)" parentheticals from the rewritten bullet (the forks declare no `model:`; describe the researcher as "a fork doing deep web research" and the chairman as "a fork").
- README.md: rewrite the superbiz intro bullet (BUILD / PIVOT / DROP verdict on a side-income autopilot product idea); rewrite the `business-idea-validator` table row - fix the stale "on a GO/PIVOT verdict" claim to the unconditional offer the source defines, and mention the mandatory council round; rewrite the `business-idea-validator-researcher` row to "writes the BUILD / PIVOT / DROP report"; grep README.md for any remaining `GO / PIVOT / NO-GO` or `GO/PIVOT` occurrence in the Super Biz section and update it.
- Do not touch: the stale "All five run `model: opus`" line in superbiz/CLAUDE.md's Agents section (outside the validator paragraphs, out of scope), the `product-phase-roadmap` and `council-this` entries, the marketplace manifest, plugin.json.

### Edge cases
- Root CLAUDE.md and README.md contain other, non-validator "opus" mentions (superbiz Agents section, other plugins): only the rewritten superbiz-bullet parentheticals change - verify the `grep -E 'an .opus. fork' CLAUDE.md` check still holds since both current occurrences sit inside that one bullet.

### Contracts
- none (documentation of the contracts fixed in Tasks 1-4)

### DoD
All three docs describe the side-income autopilot profile with BUILD/PIVOT/DROP, no "an opus fork" claim remains in root CLAUDE.md, no GO/PIVOT label remains in README.md; all listed grep checks pass.


### Covered criteria
11. The validator's frontmatter `description:` keeps the existing broad idea-validation triggers and do-not-use exclusions (it remains the plugin's only validator), adds side-income phrasing triggers (side project, passive income, product alongside a day job, "dodatkowe źródło dochodu"), and states the side-income autopilot profile so routing conveys what the verdict means; the validator paragraphs in `superbiz/CLAUDE.md`, root `CLAUDE.md`, and `README.md` describe the same profile - with the edited sentences no longer claiming the researcher or chairman is "an opus fork".
