# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Three-tier review verdicts, scoped rounds, and a shared frozen rubric for superdev plan/spec review loops"

---
<!-- HEADER -->

## Goal
The superdev plan/spec review loops converge in 1-2 rounds: reviewers FAIL only on objectively Blocking findings (cited against a shared checklist with repo evidence), advisory observations ride along as NOTES on a PASS, rounds 2+ are structurally narrowed to verifying prior fixes, and authors self-check against the exact rubric the reviewer applies.

## Context
Today any reviewer finding forces VERDICT: FAIL, each round is a memoryless fresh fork re-reviewing the whole artifact with byte-identical args, and the planner's self-review has no concrete rubric. Result: rotating-findings churn across many rounds, bounded only by a 3-round cap that dumps residue on the user. Decisions from the interview: three-tier verdict (Blocking -> FAIL, Advisory -> NOTES with PASS), round scoping passed via reviewer args (stdout/args only, no files written during planning), one shared frozen checklist for authors and reviewers, cap 3 kept as safety net plus an explicit dispute-escalation rule. The hook `review-plan.sh` keys on the first `VERDICT:` line only and already works with this design. Hard invariant for every task: `superdev/hooks/` (scripts, hooks.json, manifest.md), all `simplebuild*`/`superbuild*` skills, `superdev/.claude-plugin/plugin.json`, and `superdev/scripts/resolve-input.sh` stay byte-identical.

## Acceptance criteria
1. `simpleplan-reviewer`, `superplan-reviewer`, and `superspec-reviewer` return VERDICT: FAIL only when FINDINGS (Blocking) or BLOCKED has an entry; Advisory items go to a NOTES section that coexists with VERDICT: PASS; the verdict first-line format is byte-compatible with today (hook regex still matches).
2. Every Blocking finding must name the violated checklist class and carry repo-verified evidence (Read/Grep/Glob); an unverifiable suspicion is demoted to NOTES, never Blocking.
3. Round scoping is encoded on both sides of each loop: the invoker passes `round: <N>` and, for rounds >= 2, the previous round's Blocking findings verbatim as `prior-blocking:` lines (sanitized for the superspec preload path); the reviewer in round >= 2 verifies prior fixes and may report as Blocking only unfixed priors or new Blocking introduced by the fix edits.
4. One shared `superdev/references/plan-review-checklist.md` is read by `simpleplan`, `superplan` (self-review) and passed to both plan reviewers; `superspec/references/checklist.md` gains the same severity-class / never-flag / evidence sections; both planner skills mandate repo verification of every file path and test command before submitting for review.
5. The 3-round cap and the dispute rule (author who can show a Blocking finding is factually wrong escalates that finding plus counterargument to the user instead of looping) are present in `simpleplan`, `superplan`, and `superspec`.
6. Root `CLAUDE.md` lists `superdev/references/` among plugin-level shared assets.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 — feat(superdev): add shared plan-review checklist and extend spec checklist with severity classes
- Covers: criteria #2, #4

### Dependencies
- none — blocks: Task 2, Task 3, Task 4, Task 5

### Files
- add - superdev/references/plan-review-checklist.md (shared plan rubric)
- modify - superdev/skills/superspec/references/checklist.md (severity classes)

### Test Commands
*Build*
- none — markdown-only repo, no build step

*Tests*
- test -f superdev/references/plan-review-checklist.md && grep -q '## Blocking classes' superdev/references/plan-review-checklist.md && grep -q '## Never flag' superdev/references/plan-review-checklist.md
- grep -q 'Severity classes' superdev/skills/superspec/references/checklist.md

### Approach
1. Write `superdev/references/plan-review-checklist.md` with sections: `## Blocking classes` — enumerated `B1`..`B7`, each an objective consequence class: B1 file path or symbol in `### Files` wrong or missing vs repo; B2 build/test command not matching repo tooling; B3 acceptance criterion with no covering task, or task covering no criterion / scope creep beyond Goal-or-spec; B4 contradictory steps or broken `### Dependencies` ordering; B5 leftover TODO / placeholder / unfilled template section; B6 missing `TDD:` marker where the template requires one; B7 a step an implementer cannot execute without a decision absent from the plan (belongs in BLOCKED).
2. Add `## Advisory (NOTES)` — everything not in B1-B7: wording, style, task-split preference, optional hardening, nice-to-have; never blocks.
3. Add `## Never flag` — content already satisfying the template; naming/style; hypothetical risk without repo evidence; alternatives to decisions the plan already fixes; anything the build/test commands will deterministically catch during implementation.
4. Add `## Evidence rule` — a Blocking finding must cite its class ID plus concrete repo evidence verified with Read/Grep/Glob; evidence not verifiable -> the item is Advisory, phrased as a question in NOTES.
5. Add `## Author self-check` — before submitting for review: verify in the repo every `### Files` path and symbol, every build/test command, and the two-way criteria-to-task mapping; fix inline.
6. Append to `superdev/skills/superspec/references/checklist.md` a `### Severity classes` section: Blocking = How leak, AC phrased as mechanics, story with 4+ AC, TBD/placeholder/unfilled mandatory section, Out of Scope under 2 entries, checklist item objectively violated; Advisory = wording/structure/right-sizing suggestions; plus `### Never flag` and `### Evidence rule` mirroring steps 3-4 (evidence = quote from the spec text).

### Edge cases
- Checklist must stay stack-agnostic — classes reference the plan template's sections, never any ecosystem tool (no dotnet/npm/pytest examples).
- B7 overlaps BLOCKED bucket: state explicitly that B7 items are reported under BLOCKED, not FINDINGS.

### Contracts
- Checklist path contract consumed by Tasks 2-3: `${CLAUDE_PLUGIN_ROOT}/references/plan-review-checklist.md`.
- Class IDs B1-B7 are the citation vocabulary reviewers must use in FINDINGS.

### DoD
Both checklist files exist with the listed sections; grep tests above pass.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 — refactor(superdev): checklist-driven self-review and scoped review loop in planners
- Covers: criteria #3, #4, #5

### Dependencies
- Task 2 — blocks: none

### Files
- modify - superdev/skills/simpleplan/SKILL.md (frontmatter allowed-tools, checklist preload, Self-Review, Final Review loop)
- modify - superdev/skills/superplan/SKILL.md (same)

### Test Commands
*Build*
- none — markdown-only repo, no build step

*Tests*
- grep -q 'Bash(printf:\*)' superdev/skills/simpleplan/SKILL.md && grep -q 'plan-review-checklist.md' superdev/skills/simpleplan/SKILL.md && grep -q 'prior-blocking' superdev/skills/simpleplan/SKILL.md
- grep -q 'Bash(printf:\*)' superdev/skills/superplan/SKILL.md && grep -q 'plan-review-checklist.md' superdev/skills/superplan/SKILL.md && grep -q 'prior-blocking' superdev/skills/superplan/SKILL.md
- ! grep -q 'identical every round' superdev/skills/simpleplan/SKILL.md superdev/skills/superplan/SKILL.md

### Approach
1. In both planners' frontmatter add `Bash(printf:*)` to `allowed-tools` (pre-approved preload invariant); after the `### Rules` intro add a preload line: Checklist path: `` !`printf '%s' "${CLAUDE_PLUGIN_ROOT}/references/plan-review-checklist.md"` `` (superspec:55 precedent).
2. Rewrite `### Self-Review` in both: read the checklist at the path above and check the plan against every Blocking class B1-B7 plus `## Author self-check` — verify in the repo (Read/Grep/Glob) every `### Files` path and symbol, every build/test command, and the two-way mapping acceptance criteria <-> tasks; fix inline; this is the same rubric the reviewer applies, so a clean self-check is expected to PASS round 1.
3. Rewrite Final Review step 1 in both: args are a labeled block — `plan:` and `checklist:` (superplan adds `spec:`) plus `round: <N>` incremented each invocation; from round 2 append each FINDINGS line of the previous review verbatim as a `prior-blocking:` line; values stay PATHS for files, never pasted content; delete the sentences "identical every round" and "No review history is passed between rounds — the plan file's current state carries everything".
4. Rewrite step 3 (PASS): relay any NOTES to the user together with the final plan; never edit the plan file after PASS — the approval gate re-arms on any post-verdict write; a note genuinely worth applying -> apply it and run one more review round before `ExitPlanMode`.
5. Extend step 4 (FAIL) with the dispute rule: a Blocking finding whose evidence the planner can show is factually wrong (repo or confirmed-understanding contradicts it) -> do not re-loop on it; present that single finding plus the counterargument to the user in plain prose and apply the user's ruling. Keep the 3-round cap step 5 unchanged.

### Edge cases
- Round counter resets when the plan is rewritten from scratch for a new topic, not when fixes are applied.
- FINDINGS "none" with BLOCKED entries still means FAIL — prior-blocking lines for the next round include BLOCKED entries too (they were blocking the verdict); label stays `prior-blocking:`.
- Preload failure (missing checklist file) prints a path that Read will fail on -> planner stops and reports instead of reviewing blind.

### Contracts
- Invoker-side args must match Task 2's reviewer input labels exactly.
- NOTES handling contract: post-PASS plan-file edits are forbidden (keeps `review-plan.sh` W->R->S sequence valid).

### DoD
Both planner SKILL.md files carry the preload, rubric-driven self-review, labeled-block args with round/prior-blocking, NOTES relay rule, dispute rule; grep tests pass.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 — docs: list superdev/references as plugin-level shared assets
- Covers: criteria #6

### Dependencies
- Task 1 — blocks: none

### Files
- modify - CLAUDE.md (repository layout + shared-assets sentences)

### Test Commands
*Build*
- none — markdown-only repo, no build step

*Tests*
- grep -q 'superdev/references/' CLAUDE.md

### Approach
1. In root `CLAUDE.md`, edit the single occurrence of "plugin-level shared assets/scripts live in `superdev/scripts/` and `superui/scripts/`..." (the "Repository layout" plugin-dir paragraph) to include `superdev/references/`.
2. In the "What this repo is" shared-scripts paragraph (the sentence beginning "plus deterministic helper scripts bundled either under an individual skill's own `scripts/` dir..."), extend the plugin-level enumeration so `superdev` is listed as keeping shared scripts and references at plugin root (`superdev/scripts/`, `superdev/references/`), mirroring how `superui` is described.

### Edge cases
- Touch only the shared-assets sentences — no other CLAUDE.md content is in scope.

### Contracts
- none

### DoD
Root CLAUDE.md names `superdev/references/`; grep test passes; git diff shows CLAUDE.md as the only file changed by this task.

<!-- /TASK -->
