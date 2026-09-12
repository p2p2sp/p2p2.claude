# re-review review - review-01-code-re1.md

## Gates

- Build (every task's `#### Build` block, Tasks 1-8): `none (no build step in this repo)` - nothing to run, as every task declares.
- `node --test "tests/**/*.test.ts"` (Task 8's suite command, the superset of every per-task test command) - PASS: 665 tests, 662 pass, 0 fail, 3 skipped, 43.2s, exit 0. Three tests more than the prior round (663), which is `tests/superfix/profiler.test.ts` minus the one skip that no longer applies.
- `node --test tests/superfix/profiler.test.ts` (the fix round's new file, run alone) - PASS: 2 tests, 2 pass, 0 fail, 0 skipped, exit 0.
- `node -e "...plugin.json agents includes ./agents/profiler.md..."` (Task 6) - PASS, printed `true`.
- `grep -n '^model: inherit$\|^tools: Read, Write, Grep, Glob, Bash$' superfix/agents/profiler.md` (Task 6) - PASS, one hit each (lines 4 and 5), unchanged by the fix.
- `grep -c '## Bug classes from history\|## Contract shape\|## Critical paths\|## Severity calibration\|no fix history in window' superfix/agents/profiler.md` (Task 6) - PASS, 6 hits across the five terms.
- the en-dash / em-dash scan over `superfix/agents/profiler.md tests/superfix/profiler.test.ts` plus the round's notes file - PASS, no output, exit 0.
- C1 evidence command, re-run directly against this repository: `git log --since=30d -i --grep=fix` returns 0 commits; `git log --since=30.days.ago -i --grep=fix` returns 27. The delivered form is the one git parses.
- Tasks 1-5 and 7-8 gate commands: not re-run individually this round. The fix round touched two files (`superfix/agents/profiler.md`, `tests/superfix/profiler.test.ts`) and no script, no SKILL.md and no doc, and the full suite above covers every per-task test command; the Task 6 commands that bear on the changed file were re-run above.

no e2e or integration suite in this host

## Prior findings

| ID | Verdict | Evidence |
| --- | --- | --- |
| C1 | ADDRESSED | superfix/agents/profiler.md:23 - the fenced command now reads `--since=<window>.days.ago`; verified end to end, `--since=30.days.ago` returns 27 fix commits on this repo where `--since=30d` returned 0. profiler.md:25 adds the substitution rule the report demanded (the bare number, the `.days.ago` suffix as part of the command, and why `--since=30d` is wrong), and profiler.md:14 restates `Window:` as a bare day count matching SKILL.md:49's recipe line, so the two owners of that value now agree on the expression as well as on the number. `tests/superfix/profiler.test.ts` lifts the block from the agent file and runs it against a throwaway repo whose history straddles the window, so the form cannot silently regress. |
| M1 | NOT ADDRESSED | superfix/skills/code-auditor/scripts/collect_edges.sh:130 - the duplicated `scope_reject` / normalise / validate block is unchanged; the fix round touched no script. Minor, carried in `debt.md`, never dispatched for fix. |
| M2 | NOT ADDRESSED | superfix/skills/code-auditor/scripts/collect_signals.sh:193 - the false `a scope carrying a newline cannot reach here` justification is unchanged. Minor, carried in `debt.md`. |
| M3 | NOT ADDRESSED | tests/superfix/collect_signals.test.ts:319 - `endsWith(scope.replace(/\/+$/, ""))` is unchanged. Minor, carried in `debt.md`. |
| M4 | NOT ADDRESSED | superfix/agents/profiler.md:23 - the fix round rewrote this very line but left `<target-root>` and `<scope or .>` unquoted, exactly as raised. The dispatch carried no `minor:` line, so this is the expected outcome; `fix-01-notes.md` records the deliberate skip. Minor, carried in `debt.md`. |

## Findings

### Critical

- none.

### Important

- none.

### Needs decision

- none.

## Debt

- none raised this round. `debt.md` is unchanged: no new Minor exists to append, and the four existing entries stay as written.

## Notes

- The fix took the report's first option (correct the expression in `profiler.md`) over the second (resolve a `%Y-%m-%d` boundary in SKILL.md Phase 0 and pass it as `Window:`). The rejection reason recorded in `fix-01-notes.md` is sound and matches what this review found: the second option would have duplicated the GNU-vs-BSD `date` branch that `collect_signals.sh:167-172` already owns into untested skill prose, and would have changed the `Window:` contract shared by Tasks 6 and 7 - a cross-task rewrite where a one-line change clears the finding. The lockstep the report asked for is achieved by wording instead of by a shared computation, which is the appropriate weight for a value that is a calibration prior rather than a computed output.
- Residual, and correctly recorded rather than hidden: `.days.ago` counts back from the run instant while `collect_signals.sh` resolves the sweep to midnight of the `%Y-%m-%d` date N days back, so the profiler's window is a strict subset of the sweep's, narrower by up to 24h at the tail. The consequence is bounded to a commit landing inside that sliver being present in the sweep's recency signal but absent from the profile's do-not-rediscover hash list. `fix-01-notes.md:8` states the divergence and the decision explicitly. Not raised as a finding at any class: the day count - the value the two owners share - matches, no criterion asks for an instant-exact boundary, and the effect is below the resolution at which a calibration prior is used.
- The new test earns its place rather than restating prose. It executes the documented command instead of asserting on its text, which is the only thing that could have caught C1: git's approxidate answers an unrecognised `--since` with the current time and exit 0, so the defect is invisible to any static check. The negative assertions (a fix older than the window and a non-fix subject are both absent) mean the test fails on an over-wide window too, not only on an empty one, so it pins both edges. The `exactly one bash block` assertion is a deliberate coupling to the agent file's `Run this and no other git subcommand` rule, not brittleness.
- Test code holds the repo's conventions: `withGitRepo` + a file-local `commitAt` (the same shape `tests/superfix/collect_signals.test.ts` and `collect_edges.test.ts` use), `forEachShell("bash", ...)` behind a file-local `assertBash` (the shape nine other suites use), sentence-shaped test names, and no new helper pushed into `tests/harness/`. Commit dates are computed relative to `Date.now()` at 5 and 45 days against a 30-day window, so the case carries a 15-day margin on both sides and cannot drift into flakiness with the calendar.
- The paired `UNDERSPECIFIED:` scan over the notes dir found the sweep window named by two rounds (`task-07-notes.md:3` and `fix-01-notes.md:8`). Both owners' code was read for that value: `profiler.md:23` and `collect_signals.sh:167-172` now agree on the day count and each uses the date form its own executor parses. That pair is closed; it is what produced C1 and no divergence survives it beyond the sub-day boundary noted above.
- The repeated-literal grep over the two changed files found no shared default or error-shape literal duplicated across them.
- The two `NOTE: plan defect` lines from `checkpoint-01.md` and the one from `review-01-code.md` (Task 6's `### Approach` step 3(b) pinning the broken `--since=<window>d` verbatim) are unchanged in the plan text and are not raised again. The third is now historical: the delivered artifact no longer carries the plan's error.
- No file outside the fix's declared set moved. The commit's remaining paths are run bookkeeping under `docs/.workflows/` (the two round-1 reports, `debt.md`'s M4 line, `fix-01-notes.md`), which is expected and carries no product change.

## Assessment

C1 is fixed at the root the report named: the profiler's one evidence command now uses a date expression git parses, the substitution instruction leaves no room to reinvent it, the `Window:` contract is stated identically on both sides of the dispatch, and a test that runs the documented command guards the form against regression. The three carried Minor findings and the newly carried M4 are untouched by design and affect no verdict; the fix introduced no new Critical or Important.

VERDICT: PASS
