# final review - review-01-spec.md

## Gates

- Build (`#### Build` block of every task, and the plan's own): `none (no build step in this repo)` for every task - nothing to run.
- `node --test "tests/**/*.test.ts"` (Task 8's suite command, the superset of every per-task test command): PASS - 663 tests, 660 pass, 0 fail, 3 skipped, ~48.7s. The 3 skips are pre-existing and unrelated to this plan: `release.sh coverage skipped: jq not on PATH` (Git-Bash ships no `jq`) and two `detect_state.sh` / `scan_conventions.sh` symlink cases skipped because `this account cannot create a directory symlink` - none of the three touch `superfix` or a file this plan changed.
- `! grep -rn $'–\|—' superfix CLAUDE.md` (Task 8): PASS, no output, exit 0.
- Task 1: `node --test tests/superfix/collect_signals.test.ts` PASS; dash scan on the task's files PASS.
- Task 2: `node --test tests/superfix/collect_edges.test.ts` PASS; dash scan PASS.
- Task 3: `node --test tests/superfix/collect_signals.test.ts` PASS; `node --test tests/superfix/rank.test.ts` PASS (regression guard, unaffected by the new key); dash scan PASS.
- Task 4: `grep -c '^## ' superfix/skills/code-auditor/references/synthesis.md` prints `9` - PASS; the four required terms (`Further findings`, `critic returned no verdict`, `## Reproduce`, `Severity calibration`) all hit - PASS; dash scan PASS.
- Task 5: `model: inherit` and `effort: high` each hit once in `detective.md` and `critic.md` - PASS; `model: haiku` unchanged in `scout.md`/`edge-scout.md` - PASS; `claim.md` hits in both agent files - PASS; `report path` absent from `critic.md` - PASS; dash scan over `superfix/agents/` PASS.
- Task 6: the `node -e` check that `plugin.json` `agents[]` includes `./agents/profiler.md` exits 0 - PASS; `model: inherit` / `tools: Read, Write, Grep, Glob, Bash` each hit once in `profiler.md` - PASS; the five required terms (`## Bug classes from history`, `## Contract shape`, `## Critical paths`, `## Severity calibration`, `no fix history in window`) all hit - PASS; dash scan PASS.
- Task 7: `argument-hint` line hits once - PASS; `--scope` hits at least twice in `SKILL.md` (both Phase 1 commands) - PASS; the seven required terms all hit in `SKILL.md` - PASS; the old critic brief string is absent - PASS; dash scan over `SKILL.md` and `jobs.md` PASS.
- Task 8: `profiler` hits in all four named files, `inherit` hits in both named files - PASS; dash scan (already covered by the repo-wide run above) PASS.

`no e2e or integration suite in this host` - the plan and superfix's own memory document none.

## Coverage

1. met - `superfix/skills/code-auditor/SKILL.md` `## Arguments` + Phase 0 steps 1-3 confirm/resolve/validate `<area-dir>` and STOP with `code-auditor: area directory not found under <root>: <value>` before step 4 (`check_node.sh`), step 7 (profiler dispatch) or Phase 1 (sweep scripts) ever run; Phase 1's two command blocks both carry `--scope <area-dir>`. Verified by reading; no automated test exercises the skill prose itself (expected - it is not a script), but the two scripts' own `--scope` validation (criteria 2-3) is the tested backstop the plan names.
2. met - `collect_signals.sh --scope <dir>` (lines 96-202, 287-319); `tests/superfix/collect_signals.test.ts` "`--scope <dir> emits records for that subtree only...`" and "`a scoped record carries exactly the values the unscoped run computes for that same file`" assert exactly this, field-by-field including `path`, `dependents`, `dependents_stem`. Gate: `node --test tests/superfix/collect_signals.test.ts` PASS.
3. met - `collect_edges.sh --scope <dir>` (lines 97-158, 374-394); `tests/superfix/collect_edges.test.ts` "`--scope <dir> keeps a pair iff at least one endpoint lies under it`" and "`a scoped pair carries exactly the values the unscoped run computes for it`" assert both halves (no both-outside pair emitted; surviving pair identical to unscoped). Gate: `node --test tests/superfix/collect_edges.test.ts` PASS.
4. met - `superfix/agents/profiler.md` writes the four required headings; `SKILL.md` Phase 0 step 7 dispatches it alongside Phase 1, step 8 is the gate (checks all four headings, appends verbatim under `## Repo profile`, retries once, then falls back with `repo profile unavailable` in `findings.md`'s `## Coverage notes` per `synthesis.md`'s own line for that case, and says so in the Phase 3 hotlist message per step 8's text). Reference-only task (no runtime test), consistent with Task 6/7's own Failure-modes rationale.
5. met - `profiler.md` `## Hard rules` restrict inputs to the target repo and this run's `job.md` ("never read anything else under `.temp/superfix/`... never a previous `findings.md`"), `## Method` step 2 runs exactly one `git log` call scoped to the window, and the `## Output` section states the `no fix history in window` sentence for an empty window explicitly (never a blank file). Prose-only, matches the plan's own no-test rationale for this criterion.
6. met - `synthesis.md` `## Severity`: profile bands from `job.md`'s `## Repo profile` -> `## Severity calibration` are read first; the four generic bands are stated as the fallback used "only when `job.md` carries no `## Repo profile` section at all (the profiler missed twice)".
7. met - `collect_signals.sh`'s lockstep `awk` program (lines 219-285): builds the literal map over the unscoped, noise-filtered universe, compares whole literals per round, extends one segment at a time for a colliding group, drops an exhausted path with an empty literal. `tests/superfix/collect_signals.test.ts` `buildCollisionFixture` cases assert exactly the stated behaviour (`b/index` unique at depth 1, `lib/a/index` still colliding at depth 1 so it extends, `a/index.ts` and root `index.ts` exhausted to `-1`/`null`, `widget.ts` unique from the start).
8. met - `collect_signals.sh` lines 357-390: `dependents_stem` is set to the literal string whenever `dependents != -1`, else `null`; the "keys" test in `collect_signals.test.ts` asserts the seven-key shape and `dependents_stem === null` when `--with-dependents` is absent.
9. met - `buildTwoIndexFixture` + "`two same-stem files in different directories each count by their own one-segment literal`": `a/index.ts` -> `dependents 3`, `dependents_stem "a/index"`; `b/index.ts` -> `dependents 1`, `dependents_stem "b/index"` - the criterion's numbers verbatim, and the test comment says so.
10. met - `detective.md` `## Method` step 4 and `## Hard rules` restrict the sidecar to `LOCATION`, `CLASS`, `## Reproduce`, explicitly excluding `CONFIDENCE`, `SEVERITY`, root cause and fix sketch; `synthesis.md`'s `## Claim sidecar schema` states the same three-part shape and exclusion list; a `NO FINDING` report has no sidecar in both files.
11. met - `critic.md` `## Inputs you are given` lists exactly the sidecar path, `job.md`, the worktree-script path and its own worktree path - no report path (grep-confirmed); `## Method` step 1 states the refutation mandate, step 3 gates `VERIFIED` on "the reproduction passed and no refutation held".
12. met - `synthesis.md` `## Critic verdict schema`'s fifth fold bullet and `SKILL.md` Phase 5 step 2 both specify: no `VERDICT:` line -> one retry with a fresh (`-retry`) worktree; a second miss folds the finding `INCONCLUSIVE` with reason `critic returned no verdict`, `CONFIDENCE` lowered one step.
13. met - `grep -n '^model: inherit$'` and `grep -n '^effort: high$'` each hit once in `detective.md` and `critic.md`; `grep -n '^model: haiku$'` each hits once, unchanged, in `scout.md` and `edge-scout.md`.
14. met - `superfix/README.md` line 47 ("The session model is also the detective and critic model... a weaker session model means weaker reproduction") and `superfix/CLAUDE.md` line 121 (near-identical statement) both carry the required claim.
15. met - `synthesis.md` `## findings.md (final output)`: cap of ten full entries in descending severity, 1-3 band never gets a full entry, and for entries competing at the cap boundary the tie-break is verdict (`VERIFIED` > `PARTIALLY VERIFIED` > `INCONCLUSIVE`) then higher `CONFIDENCE` then lower report `<rank>` - matching the spec's tie-break sequence exactly (severity is already the file's primary, stated ordering, so the tie-break fires only among equal-severity candidates at the boundary, which is what "remis" names).
16. met - `synthesis.md`'s `## Further findings (N)` format is exactly `SEVERITY · LOCATION · CLASS · <title> · <report path>`, one line per surviving finding with no full entry, `N` defined as "the number of lines in that section".
17. met - `synthesis.md`: an `INCONCLUSIVE` finding "does count against the ten", keeps its filed `SEVERITY`, confidence lowered one step, `STATUS: INCONCLUSIVE - <missing oracle | critic returned no verdict>` line: and "after every Phase 6 wave, regenerate the whole file from the whole pool of the run" (also stated in `SKILL.md` Phase 6's last bullet) so criteria 15-16 keep holding post-wave.
18. met - `SKILL.md` Phase 5 step 3 and `synthesis.md`'s `## What the moderator reads` both restrict the ranking read to critic verdict blocks plus each report's first four (or, for a tie, five) lines, and state a full report is opened only for a cap-winning entry, only while writing its entry, no other report section in any other phase.
19. met - `superfix/.claude-plugin/plugin.json` `agents[]` lists `./agents/profiler.md` first; `superfix/CLAUDE.md` and `superfix/README.md` both name all five agents, the `[<repo-path>] [<area-dir>]` argument form, `--scope` and the claim sidecar.
20. met - `node --test "tests/**/*.test.ts"` passes under Git-Bash (this review's own shell) with 660/663 green and the 3 skips pre-existing and unrelated; `tests/superfix/collect_signals.test.ts` and `tests/superfix/collect_edges.test.ts` both carry the `--scope` sections (criteria 2, 3), the `dependents_stem` section and the criterion-9 fixture.

## Findings

### Critical

- none.

### Important

- none.

### Needs decision

- none.

## Debt

- none raised by this round. `debt.md` already carries M1-M3 from the `checkpoint-01.md` round (the duplicated `--scope` validation block between the two scripts, a comment mis-stating why `awk -v` is newline-safe, and a vacuous `endsWith("")` assertion for the `/`/`//` cases in both scope-rejection tests) - all three still hold in the current tree, all three are Minor, none affects any acceptance criterion above, and none is re-raised here.

## Notes

- The checkpoint round (`checkpoint-01.md`) already recorded `NOTE: plan defect - collect_signals.sh:382 keeps git ... grep -lI -- "$stem"`, a substring/regex match rather than a whole-token match, per Task 3 Approach step 3's explicit "keep unchanged" instruction. Re-checked here: this affects only the `dependents` *count*, not the lockstep *literal-determination* algorithm criterion 7 actually asks for (whole-string comparison when deciding whether two files' literals collide) - the two are different steps in the pipeline, and the fixtures in criteria 7-9 pass because their mention text is clean substrings of the intended literal. No criterion above is unmet by this behaviour; it stays a documented plan defect, not a finding.
- `checkpoint-01.md` also recorded `NOTE: plan defect - critic.md:36 keeps SEVERITY: <... or "unchanged" if you agree with the original>` even though the critic can no longer see a filed severity to agree with, because Task 5 Approach step 3 pinned the `## Output` block byte-identical. Still true in the current tree; `synthesis.md`'s fold rule handles both branches, so nothing breaks. Not re-raised as a new finding.
- `git diff --name-status 04a046b..HEAD` (the whole build, excluding the run's own working directory) touches exactly the fourteen files the plan's eight tasks name across their `### Files` sections and nothing else - no scope creep, nothing from the spec's `Out of scope` implemented.
- Every task's own `*-notes.md` file records its deviations with a stated reason; none is unexplained, and no `CARRY:` line was left by any task - nothing crosses into this final round as unfinished integration debt.
- Task 1's per-task reviewer (`task-01-review-1.md`) failed the round on a real C1 (`--scope /` and `--scope //` failing open into a whole-repo sweep); the fix landed in the same task (notes: `C1: fixed`) and is confirmed live in the current `collect_signals.sh`/`collect_edges.sh` (the absolute-path `case` runs on the raw value before the trailing-slash normalisation, and both scripts' tests now include `"/"` and `"//"` in the rejection list).

## Assessment

Every one of the twenty acceptance criteria is met by the repository as it stands: the `--scope` grammar and its byte-identical-record guarantee, the lockstep `dependents_stem` literal, the claim-sidecar redaction with its refutation mandate and no-verdict retry, `model: inherit` on the frontier agents with the documentation stating the consequence, the ten-entry `findings.md` cap with its tie-break and `## Further findings` list, the moderator's headers-and-verdicts-only read, and the five-agent catalog and docs sync all land exactly as the plan and spec describe. The full suite is green (660/663, the three skips pre-existing and unrelated), the dash scan is clean everywhere, and the whole-build diff maps one-to-one onto the plan's task `Files` lists with no scope creep. No Critical or Important finding survives, and the two carried-forward plan defects are correctly scoped as decisions rather than as gaps in this delivery.

VERDICT: PASS
