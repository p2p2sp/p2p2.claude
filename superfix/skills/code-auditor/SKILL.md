---
name: code-auditor
description: Prioritized, multi-agent investigation of a large codebase using the Impact x Opportunity law.
user-invocable: true
disable-model-invocation: true
argument-hint: "[<repo-path>] [<area-dir>]"
allowed-tools: Agent, Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# Code Auditor - prioritized multi-agent codebase investigation

## The one law

```
score = Impact x Opportunity
```

- Impact - how much pain it touches if fixed: reach, dependents, blast radius, change frequency.
- Opportunity - how broken or drifted it is right now, and how fixable today: bugginess, complexity, hotfix history, coverage gaps.

Only the corner where both are high earns a frontier model. High impact with nothing to win is the "leave it" cell, and chasing it anyway is the most common waste.

Cheap models for breadth, frontier models for depth. Wave plans and intermediate results live in files under the run workspace, never in this context - that is what lets a run scale to tens of subagents.

## Jobs

Pick the job matching the user's goal, then read `${CLAUDE_SKILL_DIR}/references/jobs.md` for its exact Impact-signal x Opportunity-signal pair: Code (Tech debt, Dead code), Reliability (Bugs, Coverage, Consistency), Cost (Spend, Performance), Growth (Conversion, SEO).

Default when the user just says "find bugs / review / audit": Reliability/Bugs plus Code/Tech debt. If the goal is unclear, ask once - never silently assume a non-code job.

## Arguments

`$ARGUMENTS` holds zero, one or two whitespace-separated tokens:

- Token 1 - the target repo path: the repository this run audits.
- Token 2 - the area directory: the one subtree this run sweeps, scores and dispatches detectives into. Given repo-root-relative, or absolute as long as it lies inside the repo, in which case Phase 0 rewrites it to the relative form.
- Zero tokens - Phase 0 step 1 asks for the repo and the job exactly as it does today.
- One token - the repo is set from it; the job is still confirmed with the user.

The job never comes from `$ARGUMENTS`; it is always confirmed in Phase 0. Two tokens is the scoped run: everything the sweep emits, scores and investigates lives under the area directory.

## Phase 0 - Frame

1. Read the `$ARGUMENTS` tokens, then confirm the target repo path and the job: ask for both when no token was given, ask for the job alone when only the repo was given.
2. Resolve the target repo path to an absolute root (`cd "<target-repo-path>" && pwd`). If it already equals the current working directory this is a no-op - never prefix it again downstream.
3. Validate the area directory, when token 2 was given. An absolute path is accepted only when it lies under the resolved root, and is then rewritten to its root-relative form; a relative path is read against the root. A value that does not exist as a directory under the root, that lies outside it, or that carries a `..` segment STOPS the run here: tell the user `code-auditor: area directory not found under <root>: <value>` and do nothing else. The validated root-relative value is this run's scope, carried into `job.md` and into both Phase 1 commands; with no token 2 the run has no scope and sweeps the whole repo.
4. Run `sh "${CLAUDE_SKILL_DIR}/scripts/check_node.sh"`. `NODE_OK <cmd>` -> use `<cmd>` wherever this skill writes `node`. `NODE_MISSING` -> STOP here: the Phase 3 gates need Node.js >= 22.6, and without them the sweep, the scout fan-out and the profiler would be paid for and then discarded. Tell the user, and do not start Phase 1. Nothing that spends tokens or runs a script happens before this step - steps 1 to 3 are a conversation and a path check, nothing more.
5. Create the workspace: `mkdir -p .temp/superfix/<run-id>/{signals,scores,reports,hotlist,worktrees}`.
6. Write `.temp/superfix/<run-id>/job.md`: the job's Impact and Opportunity signals from `references/jobs.md`, the 1-5 rubric inlined from `references/scoring.md`, `Target root: <the absolute root from step 2>`, `Window: <the sweep window in days, the same number Phase 1 hands collect_signals.sh - 30 unless the user asked for another>`, and, only on a scoped run, `Scope: <the root-relative area directory from step 3>`. Every subagent scores against that one self-contained file, and every later phase addresses files relative to that root.
7. Dispatch `superfix:profiler` (Agent tool) in the same message that starts the Phase 1 scripts, so the repo profile is written while the sweep runs. Its brief carries `Target root: <root>`, `Window: <days>`, `Scope: <dir>` on a scoped run, the `job.md` path, and the output path `.temp/superfix/<run-id>/profile.md`.
8. Profile gate. When the profiler returns, check that `.temp/superfix/<run-id>/profile.md` exists and carries all four headings - `## Bug classes from history`, `## Contract shape`, `## Critical paths`, `## Severity calibration`. If it does, append the whole file verbatim to `job.md` under a `## Repo profile` heading: that section is what calibrates every later agent to this repo instead of to generic priors. If it does not, dispatch the profiler once more with the same brief; after a second miss continue with no `## Repo profile` section in `job.md`, carry `repo profile unavailable` into `findings.md`'s `## Coverage notes`, and say so in the Phase 3 hotlist message, so the ranking reads as uncalibrated rather than as repo-specific.

Every run sweeps two units, files and producer/consumer pairs. The edge track runs unconditionally alongside the file track, not only when the file track looks clean - a contract defect between two individually-correct files is invisible to a per-file scout.

## Phase 1 - Sweep (cheap signal collection)

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/collect_signals.sh" <window-days> <repo-root> --with-dependents --scope <area-dir> \
  > .temp/superfix/<run-id>/signals/signals.jsonl
```

One JSON line per source file with `churn`, `fix_commits`, `recency_days`, `loc`, `dependents`, and `dependents_stem` - the lockstep-unique literal `dependents` was counted by, `null` whenever `dependents` is -1. These feed the scouts as priors, they are not the score. `--with-dependents` costs O(n) extra `git grep` calls on top of the sweep; drop it deliberately on a very large target if that cost is not worth paying.

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/collect_edges.sh" <repo-root> --max-fanout 8 --scope <area-dir> \
  > .temp/superfix/<run-id>/signals/edges.jsonl
```

One JSON line per candidate artifact pair - two swept files sharing a path-like literal, which is evidence they share a contract. An empty `edges.jsonl` is a valid result: the edge track then contributes nothing and the run proceeds on the file track alone.

`--scope <area-dir>` is a trailing option on both commands, written only when Phase 0 step 3 set a scope and left off entirely otherwise. With a scope the emitted records and pairs shrink to the area - a pair keeps a partner lying outside it, because a contract crossing the boundary is exactly what a scoped audit must still see - while every signal inside a record stays repo-wide, so a scoped record is byte-identical to the one an unscoped run emits for the same file.

## Phase 2 - Score (fan out the scouts, cheap tier)

Do not start until `job.md` carries its `## Repo profile` section, or the Phase 0 profile gate has recorded the profile's absence after two misses. Then, for each candidate file, or each batch of files, spawn a `superfix:scout` (Agent tool). Give it the matching line from `signals.jsonl` verbatim - not a separately-resolved path - plus `job.md`. Append every verdict to `.temp/superfix/<run-id>/scores/scores.jsonl`.

For each candidate pair, or small batch of pairs, spawn a `superfix:edge-scout` the same way, with the edge record line handed over verbatim. Append every verdict to `.temp/superfix/<run-id>/scores/edge_scores.jsonl`.

- Batch to control cost: ~10-40 files per scout on a huge tree, 1 file per scout when you want maximum resolution on a hot module.
- Launch at most 16 concurrent subagents; beyond that, run successive waves.
- Most files rating low is the correct outcome of a sweep, not a failed one.

## Phase 3 - Gate (drop the noise, build the hotlist)

```bash
node "${CLAUDE_SKILL_DIR}/scripts/rank.ts" \
  --scores .temp/superfix/<run-id>/scores/scores.jsonl \
  --signals .temp/superfix/<run-id>/signals/signals.jsonl \
  --min-impact 3 --min-opportunity 3 --top 20 \
  --run-id <run-id> --job <job> \
  --out-json .temp/superfix/<run-id>/hotlist/hotlist.json \
  --out-md   .temp/superfix/<run-id>/hotlist/hotlist.md
```

```bash
node "${CLAUDE_SKILL_DIR}/scripts/rank_edges.ts" \
  --edges .temp/superfix/<run-id>/signals/edges.jsonl \
  --verdicts .temp/superfix/<run-id>/scores/edge_scores.jsonl \
  --signals .temp/superfix/<run-id>/signals/signals.jsonl \
  --top-edges 20 --run-id <run-id> --job <job> \
  --out-json .temp/superfix/<run-id>/hotlist/edges.json \
  --out-md   .temp/superfix/<run-id>/hotlist/edges.md
```

Both gates are deterministic, so the cut is reproducible. Show `hotlist.md` and `edges.md` to the user before spending frontier tokens.

## Phase 4 - Dispatch detectives (frontier tier, top-N only)

Build the dispatch set as the union of three sources, then spawn one `superfix:detective` (Agent tool) per entry:

- `hotlist.json` `hotspots` - the file track's gate-clearing files.
- `edges.json` `dispatch` - the edge track's gate-clearing pairs.
- A structural budget: the top 2 rows of `edges.json` `degree[]` (highest pair-count paths) not already covered above. This is a rule of this file, not a script flag - read `degree[]` yourself and walk down it, skipping any path already in the union, until 2 slots are filled or `degree[]` is exhausted, so the budget is never spent twice on one file.

A file appearing in both the file hotlist and an edge dispatch row gets one detective, not two - dispatch it with the edge as the richer entry (both endpoints), not the single file path.

Give each detective:

- Its entry point(s), resolved against the `Target root:` in `job.md`, so it reads the same file the sweep scored regardless of the directory this skill runs from. A hotspot or degree-slot dispatch gets ONE path as an entry point (not a fence - it may follow the trail into neighbouring code); a degree-slot dispatch additionally states that the file was selected by graph degree rather than by score. An edge dispatch gets BOTH endpoints. On a scoped run an edge whose second endpoint lies outside the area is still a valid entry: dispatch it with both endpoints, because a contract crossing the boundary is what a scoped audit exists to catch.
- `job.md`, the report-schema path `${CLAUDE_SKILL_DIR}/references/synthesis.md`, the output path for its report (`.temp/superfix/<run-id>/reports/<rank>-<slug>.md`), and the output path for its claim sidecar (`.temp/superfix/<run-id>/reports/<rank>-<slug>.claim.md`), which it writes only when it files a finding.
- The worktree-script path `${CLAUDE_SKILL_DIR}/scripts/worktree.sh`, and a unique absolute verification-worktree path reserved for this detective alone (`<target-root>/.temp/superfix/<run-id>/worktrees/<rank>-<slug>`).

Scale the count to the size of the dispatch set - 5, 20 or 50 - and never dispatch a detective to something that did not clear a gate. Launch at most 16 concurrent; run successive waves beyond that.

## Phase 5 - Synthesize (verify, dedupe, score, rank)

Read `${CLAUDE_SKILL_DIR}/references/synthesis.md`, then run the critic pass:

1. For every detective report that is not `NO FINDING`, spawn a `superfix:critic` (Agent tool), one per report. Give it four things and nothing else: the claim sidecar path (`.temp/superfix/<run-id>/reports/<rank>-<slug>.claim.md`), `job.md`, the worktree-script path `${CLAUDE_SKILL_DIR}/scripts/worktree.sh`, and a fresh unique absolute verification-worktree path reserved for it alone (`<target-root>/.temp/superfix/<run-id>/worktrees/critic-<rank>-<slug>`), never the one the detective used. The sidecar is the whole claim, so the report stays out of the brief: a verifier handed the discoverer's reasoning confirms that framing instead of testing it. The critic returns a tagged `VERDICT:` in its final message and writes no file.
2. A critic whose final message carries no `VERDICT:` line is dispatched once more, same brief, with a fresh worktree path of its own (`<target-root>/.temp/superfix/<run-id>/worktrees/critic-<rank>-<slug>-retry`). After that second miss the finding is folded as `INCONCLUSIVE` carrying the reason `critic returned no verdict`, as `synthesis.md` specifies.
3. Rank the pool from the critics' verdict blocks, which are already in this context, plus the first four lines of each report (`# <title>`, `LOCATION`, `CLASS`, `SEVERITY`) and nothing more. Then fold the verdicts, deduplicate by root cause, assign severity and emit `.temp/superfix/<run-id>/findings.md` exactly as `synthesis.md` specifies - the cap of ten full entries, the `## Further findings (N)` list, the tie-break and the coverage notes. A full report is opened only for an entry that made the cap, and only while that entry is being written.

`synthesis.md` is the sole authority on verification, deduplication, severity and the shape of `findings.md` - do not restate or reinterpret its rules.

## Phase 6 - Iterate and open new fronts

The workflow is dynamic, not a fixed pipeline. After synthesis:

- A confirmed bug class (a missing-authz pattern, an unchecked length) becomes the seed of a fresh scout wave that hunts the same pattern across the rest of the repo - new front, same machinery. `job.md`'s `## Repo profile` section is the second seed source: a class listed under `## Bug classes from history` is worth a wave even when no detective filed it this run, because the repo keeps re-fixing it.
- Callers and importers of a confirmed-broken file inherit elevated Impact; re-sweep them at a lower threshold.
- Stop when new waves stop producing top-right-corner hotspots, or when the user's budget or coverage target is met. Record in `findings.md` which areas got only a shallow pass, so a hotlist never reads as a false "all clear". Regenerate `findings.md` from the whole pool after every wave, never by appending the new wave underneath the old file: the cap applies to the run, not to a wave, so a late high-severity finding pushes an earlier one down.

Re-running the same sweep is cheap and repeatable. Use it weekly and diff hotlists over time.

## Output the user sees

1. HOTLIST (`hotlist.md`) - the ranked triage table: what got investigated, what was skipped, and the quadrant reason. A `degenerate: true` run is reported explicitly, never as a clean zero-hotspot result.
2. EDGE GATE (`edges.md`) - the ranked artifact-pair table alongside the hotlist, plus the structural `degree[]` list.
3. FINDINGS (`findings.md`) - at most ten full, severity-sorted, verified entries with PoCs and fix sketches, then `## Further findings (N)` as one line per surviving finding that got no full entry, then the coverage notes.
4. A short prose summary: how many files and pairs swept, how many hotspots, edges and degree-budget slots dispatched, how many confirmed findings, which fronts remain open, and whether the repo profile was available - a run that fell back to the generic severity bands says so here too.
