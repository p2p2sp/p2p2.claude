Title: "Three-tier review verdicts, scoped rounds, and a shared frozen rubric for superdev plan/spec review loops"


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

