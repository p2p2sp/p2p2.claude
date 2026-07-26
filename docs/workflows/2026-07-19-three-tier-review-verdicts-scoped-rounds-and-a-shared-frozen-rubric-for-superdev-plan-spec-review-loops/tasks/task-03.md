
## Task 3 - refactor(superdev): checklist-driven self-review and scoped review loop in planners
- Covers: criteria #3, #4, #5

### Dependencies
- Task 2 - blocks: none

### Files
- modify - superdev/skills/simpleplan/SKILL.md (frontmatter allowed-tools, checklist preload, Self-Review, Final Review loop)
- modify - superdev/skills/superplan/SKILL.md (same)

### Test Commands
*Build*
- none - markdown-only repo, no build step

*Tests*
- grep -q 'Bash(printf:\*)' superdev/skills/simpleplan/SKILL.md && grep -q 'plan-review-checklist.md' superdev/skills/simpleplan/SKILL.md && grep -q 'prior-blocking' superdev/skills/simpleplan/SKILL.md
- grep -q 'Bash(printf:\*)' superdev/skills/superplan/SKILL.md && grep -q 'plan-review-checklist.md' superdev/skills/superplan/SKILL.md && grep -q 'prior-blocking' superdev/skills/superplan/SKILL.md
- ! grep -q 'identical every round' superdev/skills/simpleplan/SKILL.md superdev/skills/superplan/SKILL.md

### Approach
1. In both planners' frontmatter add `Bash(printf:*)` to `allowed-tools` (pre-approved preload invariant); after the `### Rules` intro add a preload line: Checklist path: `` !`printf '%s' "${CLAUDE_PLUGIN_ROOT}/references/plan-review-checklist.md"` `` (superspec:55 precedent).
2. Rewrite `### Self-Review` in both: read the checklist at the path above and check the plan against every Blocking class B1-B7 plus `## Author self-check` - verify in the repo (Read/Grep/Glob) every `### Files` path and symbol, every build/test command, and the two-way mapping acceptance criteria <-> tasks; fix inline; this is the same rubric the reviewer applies, so a clean self-check is expected to PASS round 1.
3. Rewrite Final Review step 1 in both: args are a labeled block - `plan:` and `checklist:` (superplan adds `spec:`) plus `round: <N>` incremented each invocation; from round 2 append each FINDINGS line of the previous review verbatim as a `prior-blocking:` line; values stay PATHS for files, never pasted content; delete the sentences "identical every round" and "No review history is passed between rounds - the plan file's current state carries everything".
4. Rewrite step 3 (PASS): relay any NOTES to the user together with the final plan; never edit the plan file after PASS - the approval gate re-arms on any post-verdict write; a note genuinely worth applying -> apply it and run one more review round before `ExitPlanMode`.
5. Extend step 4 (FAIL) with the dispute rule: a Blocking finding whose evidence the planner can show is factually wrong (repo or confirmed-understanding contradicts it) -> do not re-loop on it; present that single finding plus the counterargument to the user in plain prose and apply the user's ruling. Keep the 3-round cap step 5 unchanged.

### Edge cases
- Round counter resets when the plan is rewritten from scratch for a new topic, not when fixes are applied.
- FINDINGS "none" with BLOCKED entries still means FAIL - prior-blocking lines for the next round include BLOCKED entries too (they were blocking the verdict); label stays `prior-blocking:`.
- Preload failure (missing checklist file) prints a path that Read will fail on -> planner stops and reports instead of reviewing blind.

### Contracts
- Invoker-side args must match Task 2's reviewer input labels exactly.
- NOTES handling contract: post-PASS plan-file edits are forbidden (keeps `review-plan.sh` W->R->S sequence valid).

### DoD
Both planner SKILL.md files carry the preload, rubric-driven self-review, labeled-block args with round/prior-blocking, NOTES relay rule, dispute rule; grep tests pass.


### Covered criteria
3. Round scoping is encoded on both sides of each loop: the invoker passes `round: <N>` and, for rounds >= 2, the previous round's Blocking findings verbatim as `prior-blocking:` lines (sanitized for the superspec preload path); the reviewer in round >= 2 verifies prior fixes and may report as Blocking only unfixed priors or new Blocking introduced by the fix edits.
4. One shared `superdev/references/plan-review-checklist.md` is read by `simpleplan`, `superplan` (self-review) and passed to both plan reviewers; `superspec/references/checklist.md` gains the same severity-class / never-flag / evidence sections; both planner skills mandate repo verification of every file path and test command before submitting for review.
5. The 3-round cap and the dispute rule (author who can show a Blocking finding is factually wrong escalates that finding plus counterargument to the user instead of looping) are present in `simpleplan`, `superplan`, and `superspec`.
