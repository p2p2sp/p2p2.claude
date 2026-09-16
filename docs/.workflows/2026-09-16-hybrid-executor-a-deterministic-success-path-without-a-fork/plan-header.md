Title: "Hybrid executor - a deterministic success path without a fork"


## Goal
A build, test, lint or type-check gate that passes costs one direct `run.sh` Bash call and no fork at all; `superdev:executor` is dispatched only when that call reports a deviation, and it then reads the already-written log instead of running the command a second time. The two review-layer defects recorded in `docs/handoff.md` that sit on the same lines are closed in the same pass.

## Context
Measured on this machine's session transcripts: the `superdev:executor` fork costs a median of 14.7s per command, of which only 4.4s is the command itself and 10.2s is pure fork overhead (boot plus roughly three haiku round-trips). Across 344 runs in one day that is 113 minutes of wall clock, 78 of them overhead. Of 368 analysed runs, 274 (74%) end in `VERDICT: PASS`, so in three cases out of four the whole fork exists to turn `EXIT: 0` into `PASS`. `run.sh` already writes the full output to a log and prints only a short fixed block, so the deterministic half is in place; what is missing is a machine-readable success signal and an executor mode that analyses an existing log. This is the repo's own "Script vs. fork" invariant applied to a route that currently forks unconditionally. `docs/handoff.md` records two review-layer defects on the very lines this change rewrites, so both are folded in on the user's ruling: defect B by variant B2 (`## Gates` becomes the single owner of gate-command BLOCKED conditions) and defect A by variant A4 (the Simple reviewer's early return on misalignment is removed). Only Task 1 touches executable code; Tasks 2-7 change skill, agent, reference and documentation prose, for which the repo ships no harness, so their `### Test Commands` entry is the existing suite as a regression guard and their proof is the observable file state named in their `### DoD`.

## Out of scope
- The cost of the reviewer forks themselves (191 min/day, medians 281-301s)
- The non-converging plan gate (`superplan-reviewer` fired 11 times in one session)
- Degrading `exit 0` to a deviation by grepping the log for failure markers
- Defect A variants A1-A3 - the early return is removed, not re-engineered
- Any change to `superbuild-task-reviewer`, which runs no gate commands

## Acceptance criteria
1. success without fork - a green gate command whose `TAIL:` shows no skipped cases completes through a direct `run.sh` Bash call, with no `superdev:executor` invocation anywhere in that path.
2. expect-exit honoured - `run.sh` prints `RESULT: SUCCESS` when the command's exit code satisfies `expect-exit:` (default `0`, also `nonzero` and an explicit integer) and `RESULT: DEVIATION` in every other case, including `STATUS: timeout` and `STATUS: error`.
3. tail not summary - `run.sh` prints the log's last non-empty line on a `TAIL:` line, omits that line when the log holds none, and nothing in the repo labels that value `SUMMARY:`.
4. analysis mode - `superdev:executor` accepts `log:` + `exit:` + `duration:` in place of `command:`, runs no command in that mode, and returns the same reply shape it returns today.
5. no self-read - the two task implementors and the three build reviewers are instructed to dispatch `superdev:executor` on a deviation and never to open the `LOG:` path with `Read` themselves.
6. contract documented - `review-contract.md`'s `## Gates` section describes the hybrid route, the `RESULT:` mapping, and what carries success-path evidence in place of `SUMMARY:`.
7. single blocked owner - `## Gates` is the only place that states which gate-command outcomes yield `VERDICT: BLOCKED`; `## Verdict rules` and the three reviewer `## Gates` paragraphs carry a pointer to it instead of their own summary.
8. full simple sweep - `simplebuild-reviewer` runs every axis at every stage and reports a plan misalignment as an ordinary Critical, with no sentence instructing it to return early.
9. docs in sync - the root `CLAUDE.md` and `superdev/README.md` describe the hybrid route rather than an unconditional fork.

