# final review - review-01-code.md

## Gates

- Build (every task's `#### Build` block, Tasks 1-8): `none (no build step in this repo)` - nothing to run, as every task declares.
- `node --test "tests/**/*.test.ts"` (Task 8's suite command, the superset of every per-task test command) - PASS: 663 tests, 660 pass, 0 fail, 3 skipped, 45.1s, exit 0.
- `node -e "...plugin.json agents includes ./agents/profiler.md..."` (Task 6) - PASS, exit 0.
- `grep -n '^model: inherit$\|^tools: Read, Write, Grep, Glob, Bash$' superfix/agents/profiler.md` (Task 6) - PASS, one hit each (lines 4 and 5).
- `grep -n '## Bug classes from history\|## Contract shape\|## Critical paths\|## Severity calibration\|no fix history in window' superfix/agents/profiler.md` (Task 6) - PASS, all five terms hit.
- the en-dash / em-dash scan over `superfix/agents/profiler.md superfix/.claude-plugin/plugin.json` (Task 6) - PASS, no output, exit 0.
- `grep -n '^argument-hint: "\[<repo-path>\] \[<area-dir>\]"$' superfix/skills/code-auditor/SKILL.md` (Task 7) - PASS, one hit (line 6).
- `grep -n -- '--scope' superfix/skills/code-auditor/SKILL.md` (Task 7) - PASS, 3 hits (both Phase 1 commands plus the prose rule).
- `grep -n 'superfix:profiler\|## Repo profile\|Scope:\|claim.md\|critic returned no verdict\|Further findings\|repo profile unavailable' superfix/skills/code-auditor/SKILL.md` (Task 7) - PASS, at least one hit per term.
- ``! grep -n 'the report path, `job.md`' superfix/skills/code-auditor/SKILL.md`` (Task 7) - PASS, no output (old critic brief gone).
- the en-dash / em-dash scan over `superfix/skills/code-auditor/SKILL.md superfix/skills/code-auditor/references/jobs.md` (Task 7) - PASS, no output, exit 0.
- `grep -n 'profiler' superfix/CLAUDE.md superfix/README.md CLAUDE.md superfix/.claude-plugin/plugin.json` (Task 8) - PASS, hits in all four (5 / 1 / 2 / 1).
- `grep -n 'inherit' superfix/CLAUDE.md superfix/README.md` (Task 8) - PASS, hits in both (1 / 3).
- the en-dash / em-dash scan over `superfix CLAUDE.md` (Task 8) - PASS, no output, exit 0.
- Tasks 1-5 gate commands re-run at this round (dash scans on both sweep scripts and their tests, `grep -c '^## ' synthesis.md` = 9, the four Task 4 terms, `model: inherit` and `effort: high` on detective and critic, `model: haiku` on both scouts, `! grep -n 'report path' critic.md`) - all PASS, unchanged from `checkpoint-01.md`.

no e2e or integration suite in this host

## Prior findings

| ID | Verdict | Evidence |
| --- | --- | --- |
| M1 | NOT ADDRESSED | superfix/skills/code-auditor/scripts/collect_edges.sh:130 - the duplicated `scope_reject` / normalise / validate block is unchanged; Minor, carried in `debt.md`, never dispatched for fix |
| M2 | NOT ADDRESSED | superfix/skills/code-auditor/scripts/collect_signals.sh:193 - the false `a scope carrying a newline cannot reach here` justification is unchanged; Minor, carried in `debt.md` |
| M3 | NOT ADDRESSED | tests/superfix/collect_signals.test.ts:319 - `endsWith(scope.replace(/\/+$/, ""))` is unchanged; Minor, carried in `debt.md` |

Tasks 6 to 8 touched no script and no test file, so none of the three could have moved. All three are Minor and none affects this verdict.

## Findings

### Critical

- C1 - superfix/agents/profiler.md:23 - the profiler's one and only evidence-gathering command writes the sweep window as `--since=<window>d`, a form `git log` does not parse. Git's approxidate silently falls back to the current time for an unrecognised value and returns an empty log with exit 0, so the substituted command (`git log --since=30d -i --grep=fix --grep=hotfix --grep=revert --stat --format='%h %s' -- .`) returns zero commits on this repository, where the same command with a parseable date returns 26. Verified directly: `--since=30d` gives 0 commits, `--since='30 days ago'` gives 197, `--since='30.days.ago'` gives 197, `--since=30.days` gives 197, and the unparseable control `--since=zzz` gives 0, i.e. `30d` behaves exactly like garbage input (git 2.47.1). Why it matters: every run's profile therefore takes the empty-window branch at profiler.md:60, writing `Already fixed in window: 0 commits` and the single sentence `no fix history in window` under `## Bug classes from history`. The four headings are still present, so Phase 0 step 8's profile gate accepts the file, `job.md` gets its `## Repo profile` section, and nothing anywhere reports a failure: the build's headline capability (calibrate the audit from the repo's own fix history) is dead in every run and renders as a legitimate documented result. Three consumers degrade with it: `## Bug classes from history` is always empty, so Phase 6's second seed source (SKILL.md:139) can never fire; `## Critical paths` loses its "files the fix history touches most" half (profiler.md:29) and collapses to memory-only; and the preamble do-not-rediscover hash list (profiler.md:58) is always empty. This is a cross-task seam, not a local slip: `Window:` is one derived value with two owners, Task 1's `collect_signals.sh` and Task 6's `profiler.md`, and `task-07-notes.md` records an explicit `UNDERSPECIFIED:` on exactly that value ("that keeps the profiler's history window and the sweep window provably the same value"). The two owners agree on the number and on the `-i --grep=fix --grep=hotfix --grep=revert` set (collect_signals.sh:335-337 is equivalent on the grep half) and diverge only on the date expression, and only the script's form works. `collect_signals.sh:168-172` deliberately resolves the window to an absolute `%Y-%m-%d` date first, with a comment on GNU vs BSD `date`, precisely because a bare duration is not portable input here. How to fix: have the profiler use a form git actually parses, matching the script's contract. Either write the command as `--since='<window> days ago'` (or `--since=<window>.days.ago`) in profiler.md:23, or, better for provable lockstep, have SKILL.md Phase 0 steps 6 and 7 pass the already-resolved `%Y-%m-%d` date as the `Window:` value the profiler substitutes, so the sweep and the profile are pinned to one computed boundary rather than to two independently written expressions. Whichever form is chosen, profiler.md:23's "Substitute every placeholder literally" instruction must leave no room for the agent to reinvent the expression.

### Important

- none.

### Needs decision

- none. C1 is unmet code, not a recorded decision: no line of the decisions file covers it, it appears in no task's `### Failure modes`, and a change to the command clears it without any user ruling.

## Debt

- M4 - superfix/agents/profiler.md:23 - the pathspec placeholder `<scope or .>` and the `<target-root>` placeholder are both unquoted in the command the agent is told to substitute literally, so a target root or an area directory containing a space splits into two pathspecs (or two arguments) and silently changes what the log covers. Phase 0 step 3 validates the area directory for existence, `..` segments and containment but never rejects a space, and `collect_signals.sh` quotes every equivalent value (`git log --since="$SINCE" --oneline -- "$f"`). Quoting both placeholders in the code block is the whole fix.

## Notes

- NOTE: plan defect - Task 6's `### Approach` step 3(b) pins the broken command verbatim, `--since=<window>d` included, so the implementor reproduced the plan faithfully and C1 originates in the plan text rather than in the implementation. It is still raised as a Critical and not as a plan-defect note alone: the contract shields a behaviour recorded under a task's `### Failure modes`, not a factual error in an Approach step, and the delivered artifact does not work.
- The two `NOTE: plan defect` lines from `checkpoint-01.md` (critic.md:36's unreachable `"unchanged" if you agree with the original` branch, and collect_signals.sh:382's substring `git grep -lI -- "$stem"`) were re-checked at this round against the final tree and both still hold exactly as recorded. Neither is raised again.
- Integration mandate, `### Contracts` entries another task consumes: the claim sidecar chain is coherent end to end. `synthesis.md`'s Claim sidecar schema (`<rank>-<slug>.claim.md`, `LOCATION` plus `CLASS` plus `## Reproduce`, "a `NO FINDING` report has no sidecar"), detective.md:18/33/49/50, critic.md:14/46 and SKILL.md:120/129 all name the same path shape and the same three-part content, and the one filename ambiguity the plan carried (`<report path>.claim.md` vs `<rank>-<slug>.claim.md`) was resolved to the `synthesis.md` form in both agents, as `task-05-notes.md` records. Phase 5 step 1 spawns a critic only for a report that is not `NO FINDING`, which is exactly the set for which a sidecar exists, so the critic is never handed a missing file.
- Integration mandate, the profile chain: the four headings the profiler writes (profiler.md:42-51) are the same four Phase 0 step 8 gates on (SKILL.md:51) and the same four criterion 4 names; `synthesis.md:104-106` takes its severity bands from `job.md` -> `## Repo profile` -> `## Severity calibration` and falls back to its own generic bands only when the section is absent, recording `repo profile unavailable` in the coverage notes (`synthesis.md:149-154`), which is the same string SKILL.md:51 carries and SKILL.md:150 surfaces to the user. critic.md:47 reads the same section for its own severity call. The contract is consistent across Tasks 4, 6 and 7; only the data flowing into it is empty, which is C1.
- Integration mandate, failure branches crossing tasks: the twice-silent critic path is stated once in `synthesis.md:90` and referenced, not restated, by SKILL.md:130, which is the correct direction given SKILL.md:133's "synthesis.md is the sole authority" rule. The `-retry` worktree path is named in SKILL.md:130 and documented in superfix/CLAUDE.md so a reader knows two critic worktrees per report may exist. `check_node.sh`'s hard stop was correctly moved ahead of the profiler dispatch (SKILL.md:47 step 4, before step 7), so no agent is paid for on a missing runtime.
- No `CARRY:` line was left by any task, so nothing crossed into this round as declared unfinished integration debt.
- The paired `UNDERSPECIFIED:` scan found one value named by more than one task's notes across the whole build: the sweep window (`task-07-notes.md`, against Task 6's brief). Reading both owners' code for that value is what produced C1. The `--scope` validation pairs from Tasks 1 and 2 were re-checked and still agree, as `checkpoint-01.md` recorded.
- The repeated-literal grep over the changed files found no shared default or error-shape literal duplicated across two files in this delta beyond the window value above; the `repo profile unavailable` and `critic returned no verdict` strings each have one authoring file (`synthesis.md`) and are referenced by SKILL.md rather than redefined.
- Documentation is consistent with the delivered agents: `plugin.json` `agents[]`, `superfix/CLAUDE.md` and `superfix/README.md` all state five agents in the same order, and the root `CLAUDE.md` parenthetical gained `profiler`. The `model: inherit` consequence is stated in both plugin docs.

## Assessment

Tasks 6 to 8 land a coherent set of contracts: the profile chain, the redacted critic and the capped findings file each have exactly one authoring file and are referenced rather than restated by their consumers, and the sidecar seam holds end to end across four files written by three different tasks. One defect breaks the delivery: the profiler's single evidence command uses a `--since` form git does not parse, so the repo profile the whole build exists to produce carries no fix history in any run and fails silently into its own documented empty-window branch.

VERDICT: FAIL
