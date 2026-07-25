
## Task 1 - feat(superdev): add shared plan-review checklist and extend spec checklist with severity classes
- Covers: criteria #2, #4

### Dependencies
- none - blocks: Task 2, Task 3, Task 4, Task 5

### Files
- add - superdev/references/plan-review-checklist.md (shared plan rubric)
- modify - superdev/skills/superspec/references/checklist.md (severity classes)

### Test Commands
*Build*
- none - markdown-only repo, no build step

*Tests*
- test -f superdev/references/plan-review-checklist.md && grep -q '## Blocking classes' superdev/references/plan-review-checklist.md && grep -q '## Never flag' superdev/references/plan-review-checklist.md
- grep -q 'Severity classes' superdev/skills/superspec/references/checklist.md

### Approach
1. Write `superdev/references/plan-review-checklist.md` with sections: `## Blocking classes` - enumerated `B1`..`B7`, each an objective consequence class: B1 file path or symbol in `### Files` wrong or missing vs repo; B2 build/test command not matching repo tooling; B3 acceptance criterion with no covering task, or task covering no criterion / scope creep beyond Goal-or-spec; B4 contradictory steps or broken `### Dependencies` ordering; B5 leftover TODO / placeholder / unfilled template section; B6 missing `TDD:` marker where the template requires one; B7 a step an implementer cannot execute without a decision absent from the plan (belongs in BLOCKED).
2. Add `## Advisory (NOTES)` - everything not in B1-B7: wording, style, task-split preference, optional hardening, nice-to-have; never blocks.
3. Add `## Never flag` - content already satisfying the template; naming/style; hypothetical risk without repo evidence; alternatives to decisions the plan already fixes; anything the build/test commands will deterministically catch during implementation.
4. Add `## Evidence rule` - a Blocking finding must cite its class ID plus concrete repo evidence verified with Read/Grep/Glob; evidence not verifiable -> the item is Advisory, phrased as a question in NOTES.
5. Add `## Author self-check` - before submitting for review: verify in the repo every `### Files` path and symbol, every build/test command, and the two-way criteria-to-task mapping; fix inline.
6. Append to `superdev/skills/superspec/references/checklist.md` a `### Severity classes` section: Blocking = How leak, AC phrased as mechanics, story with 4+ AC, TBD/placeholder/unfilled mandatory section, Out of Scope under 2 entries, checklist item objectively violated; Advisory = wording/structure/right-sizing suggestions; plus `### Never flag` and `### Evidence rule` mirroring steps 3-4 (evidence = quote from the spec text).

### Edge cases
- Checklist must stay stack-agnostic - classes reference the plan template's sections, never any ecosystem tool (no dotnet/npm/pytest examples).
- B7 overlaps BLOCKED bucket: state explicitly that B7 items are reported under BLOCKED, not FINDINGS.

### Contracts
- Checklist path contract consumed by Tasks 2-3: `${CLAUDE_PLUGIN_ROOT}/references/plan-review-checklist.md`.
- Class IDs B1-B7 are the citation vocabulary reviewers must use in FINDINGS.

### DoD
Both checklist files exist with the listed sections; grep tests above pass.


### Covered criteria
2. Every Blocking finding must name the violated checklist class and carry repo-verified evidence (Read/Grep/Glob); an unverifiable suspicion is demoted to NOTES, never Blocking.
4. One shared `superdev/references/plan-review-checklist.md` is read by `simpleplan`, `superplan` (self-review) and passed to both plan reviewers; `superspec/references/checklist.md` gains the same severity-class / never-flag / evidence sections; both planner skills mandate repo verification of every file path and test command before submitting for review.
