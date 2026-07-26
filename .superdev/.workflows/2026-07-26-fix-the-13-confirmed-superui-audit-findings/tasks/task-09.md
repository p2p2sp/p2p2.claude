
## Task 9 - fix(superui): reset the whole run dir so a re-run cannot ship stale specs
- Covers: criteria #9
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/skills/design-extractor/SKILL.md (`## Step 1 - Intake and gate`, items 4-6)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -n "rm -rf" superui/skills/design-extractor/SKILL.md` - the single hit targets `<run>`, not `<out>`
- `grep -c "every later step assumes an empty output tree" superui/skills/design-extractor/SKILL.md` - expect 1 (wording preserved, target changed)

### Approach
1. Change step 1.4 (`design-extractor/SKILL.md:42-43`) to `rm -rf <run>` instead of `rm -rf <out>`: `<run>` holds only regenerable scratch (`notes/`, `specs/`, `registry.json`, `inventory.md`, `source-map.md`, `intake-answers.md`) and `<out>` nests inside it, so one reset clears both.
2. Reword the trigger condition, which currently keys on `<out>` already existing, to key on `<run>` already existing - the same "previous run on this same source" case, since `<run-slug>` is the source directory's basename.
3. Keep step 1.5's `mkdir -p <out>` exactly as it is - it still creates both levels in one call.
4. Adjust step 1.6's gate report so it names the removed `<run>`, not a stale `<out>`.

### Edge cases
- The reset must stay in step 1, before `source-scout` writes `<run>/source-map.md` in step 2 - moving it later would delete that step's own output.
- `design-extractor-builder` step 5's `mkdir -p <run>/specs/...` must keep working against a freshly cleared `<run>`; it does, since `mkdir -p` creates the parents.
- A first run on a new source dir has no `<run>` to remove - the branch must stay conditional.

### Contracts
`<run>` = `.temp/design-extractor/<run-slug>/`, `<out>` = `<run>/handoff/` - unchanged. New invariant: `<run>` holds nothing older than the current run.

### DoD
Two consecutive runs on the same source directory, with an inventory entry renamed between them, ship a `DESIGN.components.md` whose `## <slug>` sections match the current `inventory.md` exactly.


### Covered criteria
9. A second `/superui:design-extractor` run on the same source directory ships no spec whose slug is absent from the current `inventory.md`.
