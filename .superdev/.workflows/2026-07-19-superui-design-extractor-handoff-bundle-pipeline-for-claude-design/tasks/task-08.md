
## Task 8 - chore(superui): register new components and clear stale references
- Covers: criteria #7, #8

### Dependencies
- Task 7 - blocks: none

### Files
- modify - `superui/.claude-plugin/plugin.json` (`skills`, `agents`)
- modify - `superui/CLAUDE.md` (Skills, Agents, Layout, Scripts inventory, routing sentence)
- modify - `superui/README.md` (Skills table, mid-rewrite note)
- modify - `README.md` (Super UI table, mid-rewrite note, superui bullet, three CSO-routing claims at lines 3, 28 and 60-61)
- modify - `CLAUDE.md` (superui bullet, two repository-layout sentences, two CSO-routing sentences, agents self-documentation clause - five sites, each pinned by verbatim quote in Approach step 4)
- modify - `superui/skills/setup/SKILL.md` (lines 11-14, lines 36-39)
- modify - `superui/skills/pro-designer/SKILL.md` (line 4, lines 34-36)

### Test Commands
*Build*
- `node -e "const m=require('./superui/.claude-plugin/plugin.json'); if(m.skills.length!==4||m.agents.length!==5) throw new Error('counts'); const dup=m.skills.filter(s=>m.agents.some(a=>a.includes(s.split('/')[2]))); if(dup.length) throw new Error('worker in both'); console.log('plugin.json ok')"` - expect `plugin.json ok`

*Tests*
- `for p in $(node -e "const m=require('./superui/.claude-plugin/plugin.json'); console.log([...m.skills.map(s=>s+'SKILL.md'),...m.agents].join(' '))"); do test -f "superui/${p#./}" || echo "MISSING $p"; done` - expect no output
- `grep -rn 'design-system-extractor\|design-system-creator\|design-system-generator\|design-system-completer\|design-system-auditor\|design-system-guardian\|\.superui/design-system\|tokens\.css\|lint_previews\|build_sheets\|build_index\|doc-chrome\|DESIGN\.md' superui/ README.md CLAUDE.md` - expect no match
- `grep -rin 'mid-rewrite\|rewrite target\|superui ships no agents\|superui.s went to legacy' superui/ README.md CLAUDE.md` - expect no match (case-insensitive; the pattern deliberately avoids the bare phrase "ships no agents", which stays true of superdev at `CLAUDE.md:179`)
- `grep -n 'allowed-tools' superui/skills/pro-designer/SKILL.md` - expect a comma-separated list

### Approach
1. Add `./skills/design-extractor/` and `./skills/design-extractor-builder/` to `skills[]`, bringing it to four entries alongside the retained `pro-designer` and `setup`, and restore an `agents[]` key listing the five agent files from Tasks 4 and 5. Confirm no worker appears in both arrays.
2. In `superui/CLAUDE.md`: delete the "superui is mid-rewrite" banner (lines 9-14) and the "there is currently no `agents[]` - the plugin ships no agents" clause (lines 17-19), replace the rewrite-target section with the shipped pipeline, add the two new skills to the Skills section, add an Agents section covering the five workers, restore `agents/` to the Layout block, and add the six new scripts to the Scripts inventory. Five further sentences become false and no test catches them, so fix each explicitly: the Layout note "There is no `agents/`, `references/`, or `assets/` dir at present"; the Scripts-inventory sentence "the only relative imports are `sample_colors.ts` -> `vendor/`"; the vendor bullet "Both consumed only by `sample_colors.ts`", since `measure_geometry.ts` becomes a second vendor consumer; the routing sentence at lines 18-19 "It ships no hooks and no manifest - every skill routes purely via its CSO `description:`", which stops being true once `design-extractor` carries `disable-model-invocation: true` and `design-extractor-builder` carries `user-invocable: false` - only `pro-designer` stays model-routable, so reword to say the plugin still ships no hooks and no manifest while naming which skills route by CSO and which are user-only or internal; and the SAME claim a second time inside the "No hooks, no manifest" architecture invariant at line 79 ("Every skill is reached through its own CSO `description:`"), which sits outside the section this step replaces and would otherwise leave the file contradicting its own corrected header - give it the identical treatment.
3. In `superui/README.md` and root `README.md`: add `design-extractor` to the skills tables, mark `design-extractor-builder` internal, and replace the mid-rewrite note with a description of the handoff-bundle flow. In `superui/README.md` also rewrite the closing pointer "See `superui/CLAUDE.md` for the architecture and the rewrite target", since step 2 deletes the section it points at. In root `README.md` fix the same CSO-routing overstatement step 4 fixes in root `CLAUDE.md`, at three further sites no grep catches: line 3 "`superui` and `supergh` route their skills purely via CSO descriptions", line 28 "while `superui` / `supergh` / `superfix` route purely via skill descriptions", and lines 60-61 "No manifest, no hooks - skills route via their CSO `description:`". All three stop being true once only `pro-designer` is model-routable; reword so the CSO claim covers supergh fully and superui partially, keeping the no-hooks-no-manifest fact intact.
4. In root `CLAUDE.md`, five sites, each identified by its verbatim quote rather than a line number: the superui bullet, updated to the shipped state; the Repository-layout line "`superfix` carries `agents/` (superui's went to legacy with the rewrite - it ships no agents today)", so it names both plugins as carrying `agents/`; the Repository-layout sentence claiming superui "keeps its shared scripts, references and assets at the plugin root (`<plugin>/scripts/`, `<plugin>/references/`, `<plugin>/assets/`)", since superui now carries plugin-root `scripts/` plus the restored `agents/` and no `shared/`, `references/` or `assets/` dir at all; both routing sentences "superui and supergh route purely via CSO `description:`" and "superui and supergh stay model-routable via CSO `description:`", which stop being true once only `pro-designer` is model-routable - reword so the CSO claim covers supergh fully and superui partially; and the agents clause of the self-documentation invariant, now that superui carries agents again.
5. In `superui/skills/setup/SKILL.md`: rewrite the purpose sentence to name the actual script duties (color sampling, geometry measurement, registry and design.md rendering, bundle validation and packing, contrast checks) and rewrite the closing impact paragraph to name the surviving skills instead of the removed ones.
6. In `superui/skills/pro-designer/SKILL.md`: change line 4 to a comma-separated `allowed-tools`, and rewrite the design-system-precedence section to point at the handoff bundle produced by `design-extractor` rather than the removed `.superui/design-system/` location.

### Edge cases
- Marketplace manifest `.claude-plugin/marketplace.json` needs no change: the plugin name and subdir source are unchanged. Do not touch it.
- The grep assertion is scoped to `superui/`, `README.md` and `CLAUDE.md` on purpose. Three other trees legitimately keep the old names and are out of scope: `.temp/superui-legacy/` (the set-aside reference), `.docs/` (dev-time source notes, never shipped, including `.docs/superui/README.md` which cites `.superui/design-system/`), and `.superdev/.workflows/` (archived run records, which are history and must not be rewritten).
- `pro-designer`'s bundled `references/*.md` may mention a design system generically; only the SKILL.md precedence section names the removed path and needs the edit.

### Contracts
`plugin.json` `skills[]` holds four entries (`pro-designer`, `setup`, `design-extractor`, `design-extractor-builder`), `agents[]` holds five, no overlap.

### DoD
Every test command passes; the four documentation files describe the shipped four-skill five-agent state; no file under `superui/`, and neither root `README.md` nor root `CLAUDE.md`, references a removed artifact or path. `.temp/`, `.docs/` and `.superdev/` are out of scope by design.


### Covered criteria
7. `superui/.claude-plugin/plugin.json` lists four skills and five agents, with no worker appearing in both arrays, and `superui/CLAUDE.md`, `superui/README.md`, root `README.md` and root `CLAUDE.md` describe the shipped state with no mid-rewrite or no-agents wording left anywhere.
8. No file under `superui/`, and neither root `README.md` nor root `CLAUDE.md`, references a removed artifact - `.superui/design-system/`, `tokens.css`, `DESIGN.md` generation, spec-token or preview linting, the doc chrome, or any set-aside skill name. The `.temp/`, `.docs/` and `.superdev/` trees keep the old names deliberately and are out of scope.
