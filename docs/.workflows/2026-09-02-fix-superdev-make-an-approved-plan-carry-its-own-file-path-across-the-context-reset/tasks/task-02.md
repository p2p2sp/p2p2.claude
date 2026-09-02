
## Task 2 - gate ExitPlanMode on the plan declaring its own path
- Covers: criteria #2, #3, #4, #7
- TDD: none

### Dependencies
- Task 1 - blocks: the gate enforces the preamble line that Task 1 introduces

### Files
- modify - superdev/hooks/scripts/review-plan.sh (new gate after the Step 1b format gate, reusing `plan_path` / `plan_base`)
- modify - superdev/hooks/hooks.json (`description`)
- modify - tests/superdev/review-plan.test.ts (fixtures at `writePlanFile` / `writeCustomPlanFile` call sites, plus new cases)

### Test Commands
#### Build
- `bash -n superdev/hooks/scripts/review-plan.sh`
- `node -e "JSON.parse(require('fs').readFileSync('superdev/hooks/hooks.json','utf8'))"`

#### Tests
- `node --test tests/superdev/review-plan.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. In `review-plan.sh`, immediately after the Step 1b format gate (the block ending in the "declare the plan format" `emit_deny`), add a Step 1c guarded by `[ -n "$plan_path" ] && [ -f "$plan_path" ] && [ -r "$plan_path" ]`: read the first `^Plan:` line with `grep -m1`, strip the label and surrounding whitespace with `sed`, and take its basename by stripping through the last `/` or `\` the same way `plan_base` is derived.
2. `emit_deny` when that basename is empty or differs from `plan_base`, with a reason instructing the author to add `Plan: <plan-file path>` to the plan preamble, re-run the plan reviewer, then retry `ExitPlanMode` - phrased like the sibling gates, ending with "(This is the normal approval gate, not an error.)".
3. Compare basenames, not full paths, so a separator or drive-case difference between the transcript-recorded path and the author-written path cannot cause a false deny; an unreadable plan file falls through to allow, preserving the file-level fail-open policy the format gate already uses.
4. Update the `description` in `superdev/hooks/hooks.json` so it names the plan-path gate next to the existing format and `VERDICT: PASS` gates.
5. In `tests/superdev/review-plan.test.ts`, add a `Plan: <path>` line to every fixture that writes a REAL plan file and expects `allow` or a deny attributed to a later gate: `DF` (`simple.md`), `DFS` (`super.md`), the both-markers case (`both.md`), the multiple-plan-writes case (only `bar.md`, the LAST write and therefore the sole file that becomes `plan_path`; `foo.md` needs no line), and `CF` (`plans-custom/foo.md`, whose assertion matches `/simpleplan-reviewer/` and must keep reaching the reviewer gate).
6. Add new cases: a readable plan file with no `Plan:` line and a reviewer PASS denies with a reason naming the plan path line; a plan whose `Plan:` line names a different file denies; and a transcript whose plan path does not exist on disk - carrying the reviewer call and a PASS, so every other gate is satisfied and only the `[ -f ]` guard can decide - still allows, proving the fail-open guard.

### Edge cases
- The ~30 existing cases built on the `PLAN` constant point at a path that never exists on disk; the `[ -f ]` guard must keep them untouched, exactly as the format gate does today.
- `UF` expects a deny naming the SimplePlan format, so the new gate must sit AFTER the format gate, never before it.
- A plan file that is present but unreadable must allow, not deny - hook faults always fail open.

### Contracts
- New deny reason string emitted by `review-plan.sh` when the plan does not declare its own path.
- `hooks.json` `description` text.

### DoD
`node --test tests/superdev/review-plan.test.ts` is green with the new deny and fail-open cases, `bash -n` on the hook is clean, `hooks.json` parses, and `node --test "tests/**/*.test.ts"` is green.


### Covered criteria
2. `review-plan.sh` denies `ExitPlanMode` when the resolved plan file is readable and carries no `Plan:` line naming that same plan file, and the deny reason tells the author to add the line.
3. `review-plan.sh` keeps its fail-open policy on the new gate: an unresolved, missing, or unreadable plan file still exits 0 with parseable JSON and never denies because of the `Plan:` check.
4. `superdev/hooks/hooks.json` `description` names the plan-path gate alongside the format and reviewer gates.
7. `node --test "tests/**/*.test.ts"` passes, including new cases for the plan-path gate (deny plus fail-open) and for `decompose.sh` exit 3 asserting no orphaned working directory.
