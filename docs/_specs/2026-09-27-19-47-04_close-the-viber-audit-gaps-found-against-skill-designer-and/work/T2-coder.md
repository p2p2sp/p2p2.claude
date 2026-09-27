# T2 coder notes

- planner-review.md's `^input:` line and Faithful-check gating were already in place from T1;
  T2 only added the caller side (step 3 now sends the C1 block with the confirmed input
  verbatim) - no change needed to the agent file.
- The "no verdict returned" re-ask branch mirrors `rules/SKILL.md`'s step 5 wording exactly
  (`SendMessage`, `Finish your task, then return your output lines.` then
  `VERDICT: DENIED` / `REASON: no verdict returned`) to keep the same contract phrase across
  skills.
- DoD.5's gate-refusal fallback is one added clause on the `VERDICT: PASS` bullet rather than a
  new bullet, per `.claude/rules/instruction-editing.md`.
- DoD.6/.7: the one-literal-Bash-line rule now lives once, near the top of the body; the
  `plan-index.sh` run (step 2) and `plan-path.sh --land` run (step 4) had their repeated clause
  dropped, step 4 keeping only "the only thing this step executes" as its own distinguishing
  phrase - matches the `grep -c "one literal Bash line"` -> 1 requirement.
