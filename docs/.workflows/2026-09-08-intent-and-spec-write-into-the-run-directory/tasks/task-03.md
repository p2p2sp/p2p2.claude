
## Task 3 - feat(superdev): superspec writes spec.md into the run directory
- Covers: criterion #6
- TDD: none

### Dependencies
- Task 1 - blocks: the directory `superspec` writes into is only honoured once `decompose.sh` adopts it.
- Task 2 - blocks: the handoff path `superspec` derives its directory from is defined there.

### Files
- modify - superdev/skills/superspec/SKILL.md (`## Publish`, `## Hand off`)

### Test Commands
#### Build
- none - editing markdown is shipping; the repo has no build and no lint.

#### Tests
- `node --test "tests/**/*.test.ts"` - no test covers this file; the command must stay green as a no-regression check.

### Approach
1. In `## Publish`, change the date preload to `date +%F` and relabel it `Save date (YYYY-MM-DD)`.
2. Replace the **New spec** bullet with two cases: the handoff carried `intent: <path>` -> save to `spec.md` in that path's own directory; no `intent:` in the handoff -> create `docs/.workflows/<date>-<slug>/` (`<date>` = the preload value, `<slug>` = a short title as slug, `-2`/`-3` on collision) and save `spec.md` there.
3. Leave the **Refining an existing spec** bullet untouched - it overwrites in place and skips the date/slug step.
4. In `## Hand off`, replace the illustrative `docs/.workflows/<date>-<slug>.md` with `docs/.workflows/<run>/spec.md`, keeping "the saved spec filepath" as the operative instruction.

### Edge cases
- Handoff carries `intent:` naming a file outside `docs/.workflows/`: the spec is written next to it, and `decompose.sh` falls back to the derived working dir - no error, the current behaviour.
- Refine on a spec still living flat in `docs/.workflows/`: overwritten in place, no relocation.

### Contracts
- Spec file path: `docs/.workflows/<YYYY-MM-DD>-<slug>[-N]/spec.md`, passed to `superplan` as the sole argument and written into the plan's `Spec:` line, unchanged in shape.

### DoD
`superdev/skills/superspec/SKILL.md` names no `docs/.workflows/<date>-<slug>.md` spec shape, and `node --test "tests/**/*.test.ts"` stays green.


### Covered criteria
6. `superspec` writes a new spec to `spec.md` inside the run directory taken from the handoff's `intent:` path, and creates `docs/.workflows/<YYYY-MM-DD>-<slug>/` itself with the same convention when the handoff carries no `intent:`; refining an existing spec still overwrites it in place.
