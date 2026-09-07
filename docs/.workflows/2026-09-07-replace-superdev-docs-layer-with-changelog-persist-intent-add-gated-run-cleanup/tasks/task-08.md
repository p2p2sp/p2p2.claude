
## Task 8 - Carry the Intent path through spec and plan templates
- Covers: criteria #8
- TDD: none

### Dependencies
- Task 7 - blocks: the handoff line `intent: <path>` these skills consume is defined there

### Files
- modify - superdev/skills/superspec/templates/spec.md (new `Intent:` line under the title)
- modify - superdev/skills/superspec/SKILL.md (`## Inputs`, `## Publish`)
- modify - superdev/skills/superspec-refine/SKILL.md (preserve `Intent:`)
- modify - superdev/skills/superplan/templates/plan.md (`Intent:` preamble line between `Spec:` and `Plan:`)
- modify - superdev/skills/superplan/SKILL.md (input bullets, `### Rules`)
- modify - superdev/skills/simpleplan/templates/plan.md (`Intent:` preamble line between `Title:` and `Plan:`)
- modify - superdev/skills/simpleplan/SKILL.md (input bullet, `### Rules`)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/superdev/decompose.test.ts` -> `# fail 0` (a plan rendered from the updated templates still decomposes)
- `node --test tests/superdev/review-plan.test.ts` -> `# fail 0` (the `Plan:` line lookup is unaffected by the extra preamble line)

### Approach
1. `spec.md` template: add `Intent: <path to the intent file, from the handoff; omit the line when none>` as line 2. `superspec/SKILL.md` Inputs: the handoff carries `intent: <path>` - write it into the spec's `Intent:` line; Publish: a refined spec keeps its existing `Intent:` line.
2. `superspec-refine/SKILL.md`: add "keep the spec's `Intent:` line - the rewritten spec must carry it unchanged".
3. `superplan/templates/plan.md`: add `Intent: <path copied from the spec's Intent: line; omit when the spec has none>` after `Spec:`; `superplan/SKILL.md` Rules: copy the spec's `Intent:` value into the plan preamble while drafting.
4. `simpleplan/templates/plan.md`: add `Intent: <path from the handoff's intent: line; omit when none>` after `Title:`; `simpleplan/SKILL.md` Rules: write the handoff's `intent:` path into the `Intent:` line while drafting, before the reviewer runs (same timing rule as `Plan:`).

### Edge cases
- `simpledebug` -> `simpleplan` handoff carries no `intent:` -> the line is omitted, decompose prints no `intent:` (criterion 3).
- The `Intent:` line must be written before the reviewer's PASS - a post-verdict edit re-arms the approval gate (stated in both plan skills).

### Contracts
- Preamble line `Intent: <repo-relative path>` in specs and plans; consumed by `decompose.sh` (Task 3) and `cleanup-run.sh` (Task 2).

### DoD
All seven files updated; both test files green.


### Covered criteria
8. The `Intent:` path propagates: `superspec/templates/spec.md` and `superplan/templates/plan.md` and `simpleplan/templates/plan.md` carry an `Intent:` preamble line; `superspec` writes it from the handoff, `superplan` copies it from the spec, `simpleplan` takes it from the handoff; `superspec-refine` keeps it; `intent`'s handoff passes the intent path to `superspec` / `simpleplan`; a plan without the line still decomposes (criterion 3).
