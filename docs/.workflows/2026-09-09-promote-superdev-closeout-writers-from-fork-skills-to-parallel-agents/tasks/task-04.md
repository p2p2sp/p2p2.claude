
## Task 4 - chore(superdev): retire the four closeout writer skills
- Covers: criteria #7, #9, #10
- TDD: none

### Dependencies
- Task 2 - blocks: orchestrators must be rewired before the skills disappear
- Task 3 - blocks: fronts must be rewired before the skills disappear

### Files
- delete - superdev/skills/superbuild-adr/ (SKILL.md)
- delete - superdev/skills/superdev-memory-writer/ (SKILL.md, references/templates.md)
- delete - superdev/skills/superdev-rules-writer/ (SKILL.md, references/rule-format.md)
- delete - superdev/skills/superdev-changelog-writer/ (SKILL.md, references/entry-format.md)
- modify - superdev/.claude-plugin/plugin.json (`skills[]`, new `agents[]`)
- modify - superdev/README.md (`### Knowledge layers` table rows)
- modify - CLAUDE.md (superdev bullet L50, host-repo-`docs/` invariant L207 + L210, layout tree L143, plugin-internals paragraph L179-182, self-documentation invariant L287-289; line numbers are hints, they drift as the file is edited)
- modify - docs/assets/superdev-flow.svg (the four Close Out `<text class="desc">` labels, L422-425)

### Test Commands
#### Build
- none - this repo has no build step and no lint (markdown + JSON only, per root `CLAUDE.md`)

#### Tests
- `grep -rn "superbuild-adr\|superdev-memory-writer\|superdev-rules-writer\|superdev-changelog-writer" superdev/ CLAUDE.md docs/assets/superdev-flow.svg` - no output, exit 1
- `node -e "const p=JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8')); const a=p.agents||[]; if(a.length!==4) throw new Error('agents '+a.length); for(const n of ['adr-writer','memory-writer','rules-writer','changelog-writer']) if(!a.some(x=>x.includes(n))) throw new Error('missing '+n); if(p.skills.some(s=>/writer|superbuild-adr/.test(s))) throw new Error('writer left in skills'); console.log('ok')"` - prints `ok`
- `git status --porcelain superdev/hooks/content/manifest.md` - no output (manifest untouched)
- `node --test "tests/**/*.test.ts"` - suite green

### Approach
1. Delete the four skill directories in full, including their `references/` subdirs (the copies made
   in Task 1 are now the live ones).
2. In `superdev/.claude-plugin/plugin.json` remove `./skills/superbuild-adr/`,
   `./skills/superdev-memory-writer/`, `./skills/superdev-rules-writer/` and
   `./skills/superdev-changelog-writer/` from `skills[]`, and add an `agents[]` array with
   `./agents/adr-writer.md`, `./agents/memory-writer.md`, `./agents/rules-writer.md`,
   `./agents/changelog-writer.md` - matching how `superui`/`superfix` declare theirs.
3. In `superdev/README.md`, under `### Knowledge layers (also runnable on their own)`, change the
   table header cell from `Skill` to `Worker` and rewrite the three worker rows to name
   `superdev:changelog-writer`, `superdev:memory-writer` / `superdev:rules-writer` and
   `superdev:adr-writer` as agents, adding that the Close Out wave runs them in parallel.
4. In the root `CLAUDE.md` update all five spots: the superdev bullet's `superdev-changelog-writer
   (a fork writer only, ...)` phrasing (L50); the host-repo-`docs/` invariant's two worker names -
   `superdev's superbuild-adr` (L207) and `superdev-changelog-writer` (L210); the layout tree's
   `superdev/` line (L143) and the plugin-internals paragraph (L179-182), which must now list
   `superdev` alongside `superui`/`superfix` as carrying `agents/`; and the self-documentation
   invariant (L287-289), whose claim that "superdev and superbiz ship no agents at all - superdev's
   workers are skills" is now false for superdev - replace it with superdev's four closeout agents
   and which skills dispatch them, leaving superbiz's clause intact.
5. In `docs/assets/superdev-flow.svg` rewrite only the four Close Out label strings (L422-425) to
   the new agent names; change no geometry, no styles and no other text - L426 already states
   "wave 1 in parallel, changelog after it" and stays as is.
6. Touch nothing in `superdev/hooks/content/manifest.md` - it lists groups and chains, not individual
   workers, and no group or chain changes.

### Edge cases
- `superdev/references/` now holds four files including the pre-existing `plan-review-checklist.md` -
  the three new names must not collide with it.
- No worker may appear in both `skills[]` and `agents[]`; the node assertion above enforces it.
- `.github/scripts/release.sh` writes only `version` into each `plugin.json`, so a new `agents[]` key
  does not affect the release flow.

### DoD
The four writer skills are gone, `plugin.json` declares them as agents, README, root `CLAUDE.md` and
the flow diagram match the new shape, the manifest is unmodified, and every test command above
passes.


### Covered criteria
7. The four writer skill directories are gone; `superdev/.claude-plugin/plugin.json` lists the four
   workers in `agents[]` and none of them in `skills[]`.
9. `superdev/README.md`, the root `CLAUDE.md` and `docs/assets/superdev-flow.svg` name the four
   workers as superdev agents, and no old worker name survives under `superdev/` or in those three
   files; `superdev/hooks/content/manifest.md` is untouched, and the historical run dirs under
   `docs/.workflows/` are left exactly as they are - they are the record of past builds.
10. `node --test "tests/**/*.test.ts"` passes from the repo root.
