
## Task 2 — refactor(superdev): three-tier verdict and round scoping in plan reviewers
- Covers: criteria #1, #2, #3

### Dependencies
- Task 1 — blocks: Task 3

### Files
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (input labels, classification, round scoping, NOTES output)
- modify - superdev/skills/superplan-reviewer/SKILL.md (same, plus spec label kept)

### Test Commands
*Build*
- none — markdown-only repo, no build step

*Tests*
- grep -q 'checklist:' superdev/skills/simpleplan-reviewer/SKILL.md && grep -q 'prior-blocking' superdev/skills/simpleplan-reviewer/SKILL.md && grep -q 'NOTES' superdev/skills/simpleplan-reviewer/SKILL.md
- grep -q 'checklist:' superdev/skills/superplan-reviewer/SKILL.md && grep -q 'prior-blocking' superdev/skills/superplan-reviewer/SKILL.md && grep -q 'NOTES' superdev/skills/superplan-reviewer/SKILL.md
- grep -q 'spec:' superdev/skills/superplan-reviewer/SKILL.md

### Approach
1. Rewrite `## Input` in both reviewers: labeled block in `"$ARGUMENTS"` — required `plan: <path>` (superplan-reviewer also required `spec: <path>` and `checklist: <path>`); optional `round: <N>` (absent = 1) and repeated `prior-blocking: <one prior Blocking finding, verbatim>` lines. In `simpleplan-reviewer` the `checklist:` label is optional: when absent, resolve the checklist as `../../references/plan-review-checklist.md` relative to this skill's base directory (the harness injects "Base directory for this skill" at load; the plain plan-mode flow invokes this reviewer directly with only `plan:`). Missing required label or nonexistent file -> `**VERDICT:** FAIL` with that as the single FINDINGS entry, stop. Read plan (and spec) and checklist via Read.
2. Replace `## Buckets` with three: FINDINGS — Blocking only, each entry names its checklist class ID (B1-B7) plus repo-verified evidence and the fix; BLOCKED — unchanged definition (needs a decision/context not in inputs, includes checklist class B7); NOTES — Advisory items, never affects the verdict.
3. Rewrite `## Calibration`: the checklist is the frozen rubric — flag nothing outside its Blocking classes as Blocking; items on `## Never flag` are not reported at all; evidence not verifiable with Read/Grep/Glob -> NOTES as a question; verdict is FAIL only when FINDINGS or BLOCKED has an entry.
4. Add `## Round scoping` section: when `round >= 2` — first re-verify each `prior-blocking:` line against the current plan (unfixed -> repeat verbatim in FINDINGS); then inspect only the plan regions changed by the fixes; new FINDINGS entries are allowed only for Blocking issues introduced by those fixes; every other new observation goes to NOTES.
5. Update `## Output Format`: first line `**VERDICT:** PASS` / `FAIL` byte-identical to today (bold markers, bare value, no preamble); sections FINDINGS (or "none"), BLOCKED (or "none"), NOTES (or "none"); drop the Critical/Major severity wording in favor of class-ID citations.

### Edge cases
- `prior-blocking:` value may itself contain a colon — reviewers parse labels per line prefix, first colon only.
- Round label absent (legacy caller / plain plan-mode flow) -> behave as round 1; `checklist:` absent in `simpleplan-reviewer` -> base-directory fallback per step 1; `checklist:` absent in `superplan-reviewer` -> FAIL (its only caller is `superplan`, which always passes it).
- A prior-blocking line the reviewer judges already fixed must NOT be re-litigated with new wording — it is simply dropped.

### Contracts
- Input labels: `plan:`, `checklist:`, `spec:` (superplan-reviewer), `round:`, `prior-blocking:` (repeatable) — consumed from Task 3's invoker side.
- Output sections: VERDICT / FINDINGS / BLOCKED / NOTES; first line format frozen for `review-plan.sh`.

### DoD
Both reviewer SKILL.md files carry the new input contract, three-way classification, round-scoping rules, and NOTES output; grep tests pass; no other files touched.


### Covered criteria
1. `simpleplan-reviewer`, `superplan-reviewer`, and `superspec-reviewer` return VERDICT: FAIL only when FINDINGS (Blocking) or BLOCKED has an entry; Advisory items go to a NOTES section that coexists with VERDICT: PASS; the verdict first-line format is byte-compatible with today (hook regex still matches).
2. Every Blocking finding must name the violated checklist class and carry repo-verified evidence (Read/Grep/Glob); an unverifiable suspicion is demoted to NOTES, never Blocking.
3. Round scoping is encoded on both sides of each loop: the invoker passes `round: <N>` and, for rounds >= 2, the previous round's Blocking findings verbatim as `prior-blocking:` lines (sanitized for the superspec preload path); the reviewer in round >= 2 verifies prior fixes and may report as Blocking only unfixed priors or new Blocking introduced by the fix edits.
