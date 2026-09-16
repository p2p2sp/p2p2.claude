
## Task 2 - feat(superdev): gate superspec and simpleplan on a refreshed intent
- Covers: criterion #3
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- Task 1 - blocks: the gate reads the `refresh.md` contract Task 1 defines, and depends on that file being written on every resume

### Files
- modify - superdev/skills/superspec/SKILL.md (## Inputs)
- modify - superdev/skills/simpleplan/SKILL.md (### Initial Understanding)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test tests/portability.test.ts` - expected: all tests pass (its `!` preload sweep reads every SKILL.md, so both edited files are in scope)

### Approach
1. In `superdev/skills/superspec/SKILL.md`, under `## Inputs`, add the gate as its own bullet before the smell test: when the handoff carries `intent: <path>` and that path sits under `docs/.workflows/`, `Glob` `<that path's directory>/refresh.md` before anything else; no hit means write nothing at all, run the `intent` Skill with that same path as its sole argument, and STOP.
2. In the same bullet state why the loop cannot happen: the `intent` skill writes `refresh.md` on every path that writes an `intent.md`, fresh and resumed alike, and ends at its own handoff, so a bounced run comes back with the file present and the user re-picks the track there.
3. In the same bullet, own the unresolvable path: an `intent:` value that does not resolve to an existing file means the gate is not evaluated - report the path as not found and STOP. Note the contrast with `superdev/skills/intent/SKILL.md`, whose own not-found branch falls through and treats the argument as a request; neither skill here may fall through, because there is no interview to fall into.
4. In `superdev/skills/simpleplan/SKILL.md`, under `### Initial Understanding`, add the same gate in the same words, ending in the same STOP.
5. In both, state that the gate applies only to a path under `docs/.workflows/` - an `intent:` naming an existing file elsewhere, and a run with no `intent:` line at all, pass through untouched.

### Failure modes
- when `intent:` names a path that does not exist -> response: the gate is not evaluated and the skill reports that path as not found and STOPs, writing nothing, log the unresolved path in that stop message, test: invoke `superspec` with `intent:` pointing at a missing file and confirm no spec file is created and the path is named back
- when `refresh.md` exists next to the intent but is empty or unparsable -> response: the gate passes, because validity is the file's presence alone, log nothing, test: place a zero-byte `refresh.md` next to an intent and confirm `superspec` proceeds to write the spec
- when the handoff carries no `intent:` line -> response: the gate is skipped and the skill runs its existing no-intent branch, log nothing, test: invoke `superspec` with no `intent:` label and confirm it still creates its own run directory

### Contracts
- Consumes Task 1's `refresh.md` contract: only its existence at `<intent dir>/refresh.md` is read, never its content.
- The `intent:` value is an external value entering a `Glob` path and a routing decision; validation rule, owned by this task and written into both skills: the value must resolve to an existing file before anything else happens (it does not -> report it as not found and STOP), it is then used only to derive `<its own directory>/refresh.md` and is never joined with any other segment, and the gate itself fires only when the resolved path sits under `docs/.workflows/`.

### DoD
Both `superdev/skills/superspec/SKILL.md` and `superdev/skills/simpleplan/SKILL.md` carry the gate with the same STOP-and-run-`intent` wording, the same `docs/.workflows/` scoping, and the same not-found branch for an `intent:` path that does not resolve; `node --test tests/portability.test.ts` green.


### Covered criteria
3. `superspec` i `simpleplan`, dostając `intent:` wskazujący plik pod `docs/.workflows/` bez `refresh.md` obok, nie tworzą ani nie modyfikują żadnego pliku i uruchamiają `intent` z tą samą ścieżką.
