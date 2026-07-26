
## Task 12 - fix(superui): anchor the contrast-gate path in the accessibility reference
- Covers: criteria #12
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/skills/pro-designer/references/accessibility.md (the contrast-gate bullet)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "in this skill" superui/skills/pro-designer/references/accessibility.md` - expect 0
- `grep -c "CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts" superui/skills/pro-designer/references/accessibility.md` - expect 1

### Approach
1. In `accessibility.md:61`, replace the bare relative `scripts/check_contrast.ts` with `"${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts"`, matching how `pro-designer/SKILL.md:23,54` already addresses it. `pro-designer` runs inside arbitrary host projects, so a bare relative path resolves against the host's cwd.
2. Delete the "(in this skill)" parenthetical: the script sits at the plugin root, and `skills/pro-designer/` holds only `SKILL.md` and `references/`. It was true before commit `887b678` moved the script and is now false.

### Edge cases
- Keep the bullet's substance - running the gate on every foreground/background pair - untouched; only the path is wrong.
- Do not import `SKILL.md`'s NODE_MISSING skip protocol or its runtime-resolution parenthetical into the reference; the entry point already carries both and `.claude/rules/_skills.md` forbids the duplication.
- This line is the only defect in the whole `pro-designer` reference cluster: the routing table, all 15 inter-reference pointers and every numeric claim were verified consistent. Change nothing else here.

### Contracts
No interface change. The documented invocation now matches the one `pro-designer/SKILL.md` executes.

### DoD
Every path this reference tells a model to run resolves to a real file when `pro-designer` runs in a host project other than this repo.


### Covered criteria
12. `skills/pro-designer/references/accessibility.md`'s contrast-gate invocation resolves correctly when `pro-designer` runs in an arbitrary host project.
