
## Task 2 - feat(superdev): intent creates the run directory and writes intent.md
- Covers: criteria #4, #5
- TDD: none

### Dependencies
- Task 1 - blocks: the directory `intent` creates is only honoured once `decompose.sh` adopts it.

### Files
- modify - superdev/skills/intent/SKILL.md (frontmatter `argument-hint`, `## Run`, `## Resume from a file`, `## Synthesis`, `## Handoff - the user picks the track [GATE]`)

### Test Commands
#### Build
- none - editing markdown is shipping; the repo has no build and no lint.

#### Tests
- `node --test "tests/**/*.test.ts"` - no test covers this file; the command must stay green as a no-regression check.

### Approach
1. In `## Run`, change the preload to `date +%F` and relabel it so the value is the `<YYYY-MM-DD>` the synthesis template's own `Date:` field already expects.
2. In `## Synthesis`, replace the write target with: write the synthesis to `docs/.workflows/<Date>-<slug>/intent.md` (`<Date>` from `## Run`, `<slug>` = short title as slug); on a fresh run whose directory already exists, append `-2`, `-3`, … to the **directory** name; a resume overwrites its own `intent.md` in place. Phrase it so the directory is created by the `Write` call itself and the collision check by `Glob` - both already in `allowed-tools` - never by a `mkdir` shell call, which the skill's `Bash(date:*)` entry would not pre-approve and which would prompt mid-interview.
3. In `## Resume from a file`, replace both `-intent.md` recognition rules with "a path to an existing file named `intent.md`" and "names an `intent.md` path that does not exist", leaving the two branches' behaviour unchanged.
4. Change the frontmatter `argument-hint` from `[path-to-intent.md]` to `[path-to-run-dir/intent.md]` so the hint matches the new recognition rule.
5. Leave `## Handoff` passing `intent: <path to the intent file>` verbatim to `simpleplan` / `superspec` and the `intent <path>` resume hint in the stop branch - both now carry the nested path with no wording change needed.

### Edge cases
- Argument that is neither an `intent.md` path nor an existing file: unchanged - fall through to the normal flow using the argument text as the request.
- A resume whose file was written before this change (flat `<date>-<slug>-intent.md`): out of scope by the intent's own decision; the user re-runs the interview.

### Contracts
- Intent file path: `docs/.workflows/<YYYY-MM-DD>-<slug>[-N]/intent.md`, passed to the next skill on an `intent: <path>` line, unchanged in shape.

### DoD
`superdev/skills/intent/SKILL.md` names no `docs/.workflows/<date>-<slug>-intent.md` file shape anywhere, its `## Run` preload is `date +%F`, its `argument-hint` and both resume rules name `intent.md`, and `node --test "tests/**/*.test.ts"` stays green.


### Covered criteria
4. `intent` creates `docs/.workflows/<YYYY-MM-DD>-<slug>/` and writes the synthesis to `intent.md` inside it, appending `-2`, `-3`, … to the **directory** name on collision in a fresh run, while a resume overwrites its own file in place.
5. `intent` resumes from an argument naming a file called `intent.md` instead of one ending in `-intent.md`, and its `## Run` date is `date +%F`, matching the `Date:` field the synthesis template already asks for.
