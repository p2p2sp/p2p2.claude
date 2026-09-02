
## Task 1 - add the Plan preamble line to both plan templates and their skills
- Covers: criteria #1
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/skills/simpleplan/templates/plan.md (preamble, after the `Title:` line)
- modify - superdev/skills/superplan/templates/plan.md (preamble, after the `Spec:` line)
- modify - superdev/skills/simpleplan/SKILL.md (`### Rules`, the "Save the plan to the file path" bullet)
- modify - superdev/skills/superplan/SKILL.md (`### Rules`, the "Save the plan to the file path" bullet)

### Test Commands
#### Build
- `grep -n '^Plan:' superdev/skills/simpleplan/templates/plan.md superdev/skills/superplan/templates/plan.md` (repo has no build step; run this AFTER the edit - it exits 1 while the line is still absent)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. In `superdev/skills/simpleplan/templates/plan.md`, insert the line `Plan: <absolute path of this plan file, exactly as given by plan mode>` directly below `Title: "<title>"`, keeping the blank line and `---` that follow. The angle brackets are deliberate - this is template text and matches the placeholder style the template already uses for `Title:`.
2. In `superdev/skills/superplan/templates/plan.md`, insert the same `Plan:` line directly below the `Spec:` line, so the preamble order is `Title:`, `Spec:`, `Plan:`.
3. In both SKILL.md files, extend the existing `### Rules` bullet "Save the plan to the file path given in the plan mode tool's own message - never a hardcoded or assumed directory - and pass that same path to the reviewer as `plan:`." with a clause requiring that same path to be written into the plan's `Plan:` preamble line while drafting, before the reviewer is invoked - never after a `VERDICT: PASS`, because a post-verdict write re-arms the approval gate.

### Edge cases
- The value is an absolute path (the plan file lives outside the host repo), which is a deliberate exception to the repo-relative-paths guidance - state it in the template placeholder so authors do not "fix" it into a relative path.
- `decompose.sh` parses only `^Title:` and `^Spec:`; the `Plan:` line must stay outside the `<!--` HEADER `-->` markers so it is neither copied into `plan-header.md` nor added to the stdout index, whose full text is asserted byte-for-byte by `tests/superdev/decompose.test.ts`.

### Contracts
- Plan preamble gains one line: `Plan: <absolute plan-file path>`, at column 0, before the `---` that opens the body.

### DoD
Both templates carry the `Plan:` line, both `### Rules` bullets require filling it before review, and `node --test "tests/**/*.test.ts"` is green.


### Covered criteria
1. Both plan templates carry a `Plan:` preamble line, and both plan skills instruct filling it with the plan-mode-given path while drafting, before the reviewer runs.
