---
name: code-auditor
description: Prioritized, multi-agent investigation of a large codebase using the Impact x Opportunity law.
user-invocable: true
disable-model-invocation: true
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

## Phase 0 - Frame

1. Confirm the target repo path and the job.
2. Resolve the target repo path to an absolute root (`cd "<target-repo-path>" && pwd`). If it already equals the current working directory this is a no-op - never prefix it again downstream.
3. Run `sh "${CLAUDE_SKILL_DIR}/scripts/check_node.sh"`. `NODE_OK <cmd>` -> use `<cmd>` wherever this skill writes `node`. `NODE_MISSING` -> STOP here: the Phase 3 gates need Node.js >= 22.6, and without them the sweep and the scout fan-out would be paid for and then discarded. Tell the user, and do not start Phase 1.
4. Create the workspace: `mkdir -p .temp/superfix/<run-id>/{signals,scores,reports,hotlist,worktrees}`.
5. Write `.temp/superfix/<run-id>/job.md`: the job's Impact and Opportunity signals from `references/jobs.md`, the 1-5 rubric inlined from `references/scoring.md`, and `Target root: <the absolute root from step 2>`. Every subagent scores against that one self-contained file, and every later phase addresses files relative to that root.

Every run sweeps two units, files and producer/consumer pairs. The edge track runs unconditionally alongside the file track, not only when the file track looks clean - a contract defect between two individually-correct files is invisible to a per-file scout.

## Phase 1 - Sweep (cheap signal collection)

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/collect_signals.sh" <window-days> <repo-root> --with-dependents \
  > .temp/superfix/<run-id>/signals/signals.jsonl
```

One JSON line per source file with `churn`, `fix_commits`, `recency_days`, `loc` and `dependents`. These feed the scouts as priors, they are not the score. `--with-dependents` costs O(n) extra `git grep` calls on top of the sweep; drop it deliberately on a very large target if that cost is not worth paying.

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/collect_edges.sh" <repo-root> --max-fanout 8 \
  > .temp/superfix/<run-id>/signals/edges.jsonl
```

One JSON line per candidate artifact pair - two swept files sharing a path-like literal, which is evidence they share a contract. An empty `edges.jsonl` is a valid result: the edge track then contributes nothing and the run proceeds on the file track alone.

## Phase 2 - Score (fan out the scouts, cheap tier)

For each candidate file, or each batch of files, spawn a `superfix:scout` (Agent tool). Give it the matching line from `signals.jsonl` verbatim - not a separately-resolved path - plus `job.md`. Append every verdict to `.temp/superfix/<run-id>/scores/scores.jsonl`.

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

- Its entry point(s), resolved against the `Target root:` in `job.md`, so it reads the same file the sweep scored regardless of the directory this skill runs from. A hotspot or degree-slot dispatch gets ONE path as an entry point (not a fence - it may follow the trail into neighbouring code); a degree-slot dispatch additionally states that the file was selected by graph degree rather than by score. An edge dispatch gets BOTH endpoints.
- `job.md`, the report-schema path `${CLAUDE_SKILL_DIR}/references/synthesis.md`, and the output path for its report (`.temp/superfix/<run-id>/reports/<rank>-<slug>.md`).
- The worktree-script path `${CLAUDE_SKILL_DIR}/scripts/worktree.sh`, and a unique absolute verification-worktree path reserved for this detective alone (`<target-root>/.temp/superfix/<run-id>/worktrees/<rank>-<slug>`).

Scale the count to the size of the dispatch set - 5, 20 or 50 - and never dispatch a detective to something that did not clear a gate. Launch at most 16 concurrent; run successive waves beyond that.

## Phase 5 - Synthesize (verify, dedupe, score, rank)

Read `${CLAUDE_SKILL_DIR}/references/synthesis.md`, then run the critic pass:

1. For every detective report that is not `NO FINDING`, spawn a `superfix:critic` (Agent tool), one per report. Give it the claim (bug description, LOCATION, CLASS, claimed reproduction), the report path, `job.md`, the worktree-script path, and a fresh unique absolute verification-worktree path - never the one the detective used. It returns a tagged `VERDICT:` in its final message and writes no file.
2. Fold the verdicts, deduplicate by root cause, assign severity and emit `.temp/superfix/<run-id>/findings.md` exactly as `synthesis.md` specifies. It is the sole authority on all four - do not restate or reinterpret its rules.

## Phase 6 - Iterate and open new fronts

The workflow is dynamic, not a fixed pipeline. After synthesis:

- A confirmed bug class (a missing-authz pattern, an unchecked length) becomes the seed of a fresh scout wave that hunts the same pattern across the rest of the repo - new front, same machinery.
- Callers and importers of a confirmed-broken file inherit elevated Impact; re-sweep them at a lower threshold.
- Stop when new waves stop producing top-right-corner hotspots, or when the user's budget or coverage target is met. Record in `findings.md` which areas got only a shallow pass, so a hotlist never reads as a false "all clear".

Re-running the same sweep is cheap and repeatable. Use it weekly and diff hotlists over time.

## Output the user sees

1. HOTLIST (`hotlist.md`) - the ranked triage table: what got investigated, what was skipped, and the quadrant reason. A `degenerate: true` run is reported explicitly, never as a clean zero-hotspot result.
2. EDGE GATE (`edges.md`) - the ranked artifact-pair table alongside the hotlist, plus the structural `degree[]` list.
3. FINDINGS (`findings.md`) - severity-sorted, verified findings with PoCs and fix sketches.
4. A short prose summary: how many files and pairs swept, how many hotspots, edges and degree-budget slots dispatched, how many confirmed findings, and which fronts remain open.
