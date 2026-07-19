
## Task 4 — refactor(superdev): three-tier verdict and round scoping in superspec review gate
- Covers: criteria #1, #3, #5

### Dependencies
- Task 1 — blocks: none

### Files
- modify - superdev/skills/superspec/SKILL.md (Review gate loop: round args, sanitization, NOTES, dispute rule)
- modify - superdev/skills/superspec-reviewer/SKILL.md (round visibility, classification, NOTES output)

### Test Commands
*Build*
- none — markdown-only repo, no build step

*Tests*
- grep -q 'round:' superdev/skills/superspec/SKILL.md && grep -q 'prior-blocking' superdev/skills/superspec/SKILL.md
- grep -q 'NOTES' superdev/skills/superspec-reviewer/SKILL.md && grep -q 'prior-blocking' superdev/skills/superspec-reviewer/SKILL.md
- ! grep -q 'identical every round' superdev/skills/superspec/SKILL.md

### Approach
1. In `superspec/SKILL.md` Review gate step 1: extend the labeled args block with `round: <N>` and, from round 2, one `prior-blocking: <finding>` line per previous Blocking finding; add the sanitization rule — each such line MUST be single-line with any double quote, back-tick, dollar sign, or backslash replaced by a single quote (the args block is substituted into the reviewer's shell preload; unsanitized content aborts the fork load); file values remain PATHS only; drop "identical every round" and "No review history is passed between rounds".
2. Rewrite steps 2-4 of the gate: PASS may carry NOTES — superspec may apply Advisory notes directly to the spec (no exit gate exists for specs) or relay them at Handoff, no re-review required either way; FAIL handling as today plus the dispute rule mirroring Task 3 step 5; cap step 5 unchanged.
3. In `superspec-reviewer/SKILL.md`: keep the resolve-input.sh preload line unchanged (it extracts only `spec` and `checklist` labels and ignores extra lines); add a `## Round` section containing `"$ARGUMENTS"` so the reviewer sees `round:` and `prior-blocking:` lines.
4. Rewrite `## Assessment`: classify per the checklist's `### Severity classes` — FINDINGS = Blocking only, each citing the violated checklist item plus a quote from the spec; BLOCKED unchanged; NOTES = Advisory; add round scoping — round >= 2 verifies prior-blocking lines first, new Blocking only if introduced by the fix edits, everything else to NOTES.
5. Update `## Output format`: first line `VERDICT: PASS|FAIL` unchanged in format; FAIL only when FINDINGS or BLOCKED non-empty; add NOTES section (or "none"); keep BLOCKED "max 5, numbered".

### Edge cases
- resolve-input.sh `value_of` picks only requested labels, so extra `round:`/`prior-blocking:` lines flow through harmlessly — no script change needed.
- Sanitized prior-blocking lines are approximate quotes; reviewer matches them against checklist items semantically, never byte-exact.
- INPUT ERROR block from the preload (missing spec/checklist) -> reviewer returns FAIL naming the missing input, exactly as today.

### Contracts
- superspec invoker args must match superspec-reviewer's expected labels; `spec:`/`checklist:` stay preload-consumed, `round:`/`prior-blocking:` stay body-consumed.
- Sanitization contract protects the `!` preload (shell-portable preload invariant from root CLAUDE.md).

### DoD
Both files carry round-aware args, sanitization rule, three-way classification, NOTES output, dispute rule; grep tests pass; `superdev/scripts/resolve-input.sh` unchanged.


### Covered criteria
1. `simpleplan-reviewer`, `superplan-reviewer`, and `superspec-reviewer` return VERDICT: FAIL only when FINDINGS (Blocking) or BLOCKED has an entry; Advisory items go to a NOTES section that coexists with VERDICT: PASS; the verdict first-line format is byte-compatible with today (hook regex still matches).
3. Round scoping is encoded on both sides of each loop: the invoker passes `round: <N>` and, for rounds >= 2, the previous round's Blocking findings verbatim as `prior-blocking:` lines (sanitized for the superspec preload path); the reviewer in round >= 2 verifies prior fixes and may report as Blocking only unfixed priors or new Blocking introduced by the fix edits.
5. The 3-round cap and the dispute rule (author who can show a Blocking finding is factually wrong escalates that finding plus counterargument to the user instead of looping) are present in `simpleplan`, `superplan`, and `superspec`.
