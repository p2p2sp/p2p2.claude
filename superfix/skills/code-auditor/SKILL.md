---
name: code-auditor
description: Prioritized, multi-agent investigation of a large codebase using the Impact × Opportunity law.
user-invocable: true
disable-model-invocation: true
allowed-tools: Skill, Agent, Read, Write, Edit, Glob, Bash, AskUserQuestion
---

# Code Auditor - prioritized multi-agent codebase investigation

## The one law

Every target gets a single score:

```
score = Impact × Opportunity
```

- **Impact** = *how much pain it touches if we fix it* - reach, traffic, dependents, blast radius, change frequency. "How much does this matter."
- **Opportunity** = *how broken / slow / drifted it is right now, and how fixable that is today* - bugginess, complexity, hotfix history, coverage gaps. "How much is there to win here, now."

You only care about the corner where **both are high**. The 2×2:

| | Opportunity LOW | Opportunity HIGH |
|---|---|---|
| **Impact HIGH** | High impact, already fine → **leave it** | **SEND THE DETECTIVE HERE** |
| **Impact LOW** | Low / low → **ignore** | Broken but nobody cares → **skip it** |

Spending a frontier model anywhere except the top-right cell is wasted money.

## Core principle: thin harness, model does the judgment

Cheap models for **breadth** (score everything). Frontier models for **depth** (investigate the few that survive). Do **not** build elaborate scaffolding - the next model release tends to make clever harnesses unnecessary, and an over-specified harness becomes a cage. Keep deterministic code to *cheap signal collection only*; leave all reasoning to the agents. Orchestration state and intermediate results live in **files under a workspace dir**, never bloating the main context - that is what lets this scale to tens of subagents.

## What you can point it at (the "jobs")

The same Impact × Opportunity formula generalizes across domains. Before sweeping, pick the **job** that matches the user's goal and read `${CLAUDE_SKILL_DIR}/references/jobs.md` for the exact Impact-signal × Opportunity-signal pair:

- **Code** - Tech debt (churn × complexity), Dead code (unused-confidence × size)
- **Reliability** - Bugs (change-frequency × hotfix-blame), Coverage (blast-radius × coverage-gap), Consistency (usage × rubric-drift)
- **Cost** - Spend (dollar-spend × optimizable), Performance (run-freq × slowness)
- **Growth** - Conversion (traffic × drop-off), SEO (traffic × ranking-gap)

Default job when the user just says "find bugs / review / audit": **Reliability → Bugs** plus **Code → Tech debt**. If the goal is unclear, ask once which job to run; do not silently assume a non-code job.

## The dynamic workflow

This mirrors the five-step idea: *sweep → score → ignore noise → send detectives → iterate & open new fronts.* Run the phases in order, but let the data steer how wide and how deep each wave goes.

### Phase 0 - Frame
1. Confirm the **target repo path** and the **job** (above).
2. Run `sh "${CLAUDE_SKILL_DIR}/scripts/check_node.sh"`. `NODE_OK <cmd>` -> use `<cmd>` wherever this skill writes `node`. `NODE_MISSING` -> STOP here: the Phase 3 gate needs Node.js >= 22.6, and without it the sweep and the scout fan-out would be paid for and then discarded. Tell the user, and do not start Phase 1.
3. Create a workspace: `mkdir -p .temp/code-reviewer/<run-id>/{signals,scores,reports,hotlist}`.
4. Define the Impact and Opportunity signals for the chosen job from `${CLAUDE_SKILL_DIR}/references/jobs.md`. Write them to `.temp/code-reviewer/<run-id>/job.md`, inlining the 1-5 rubric from `${CLAUDE_SKILL_DIR}/references/scoring.md`, so every subagent scores against the *same* rubric from one self-contained file.

### Phase 1 - Sweep (cheap signal collection)
Collect deterministic signals for every candidate file. This is the only place you run a script, because these numbers must be repeatable and free:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/collect_signals.sh" <window-days> <repo-root> \
  > .temp/code-reviewer/<run-id>/signals/signals.jsonl
```

This emits one JSON line per source file with `churn`, `fix_commits`, `recency_days`, `loc`, and (optional) `dependents`. These feed the scouts as priors - they are *not* the score, just evidence.

### Phase 2 - Score (fan out the scouts, cheap model)
For each candidate file (or each batch of N files), spawn a **`scout`** subagent (Agent tool, `subagent_type: superfix:scout`) - cheap tier, runs in its own isolated context, returns one line of strict JSON. Launch them in parallel; tens at a time is normal.

- Give each scout: the file path, the matching signal line, and `job.md`.
- Each scout returns `{path, impact, opportunity, impact_reason, opportunity_reason}` with Impact and Opportunity each on **1-5** (rubric inlined in `job.md`). Append every verdict to `.temp/code-reviewer/<run-id>/scores/scores.jsonl`.
- A good scout will rate most files low and say "nothing interesting" - that is correct, not a failure. Cheap and shallow on purpose: the scout rates *likelihood worth a closer look*, it does NOT try to find the actual bug.

Batch to control cost: ~10-40 files per scout for a huge tree, 1 file per scout when you want maximum resolution on a hot module.

### Phase 3 - Gate (drop the noise, build the hotlist)
Combine and rank deterministically so the cut is reproducible:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/rank.ts" \
  --scores .temp/code-reviewer/<run-id>/scores/scores.jsonl \
  --signals .temp/code-reviewer/<run-id>/signals/signals.jsonl \
  --min-impact 3 --min-opportunity 3 --top 20 \
  --out-json .temp/code-reviewer/<run-id>/hotlist/hotlist.json \
  --out-md   .temp/code-reviewer/<run-id>/hotlist/hotlist.md
```

`rank.ts` computes `score = impact × opportunity`, assigns each file a 2×2 quadrant, drops everything that is not in the top-right corner, and writes a ranked **HOTLIST** (`#, Component, Impact, Opportunity, Score, Reason`). Show the hotlist to the user before spending frontier tokens.

### Phase 4 - Dispatch detectives (frontier model, top-N only)
For each hotspot on the gated hotlist, spawn a **`detective`** subagent (Agent tool, `subagent_type: superfix:detective`) - frontier tier, isolated context. This is "Send the detective here": you only pay deep-model cost for the survivors.

- Give each detective ONE hotspot as an **entry point** (not a constraint - it may follow the trail into neighbouring code), `job.md`, and the report-schema path `${CLAUDE_SKILL_DIR}/references/synthesis.md`.
- The detective hunts the actual issue, **verifies it on a clean checkout**, and writes a structured report (schema in `synthesis.md`) to `.temp/code-reviewer/<run-id>/reports/<rank>-<slug>.md`, or writes `NO FINDING` if nothing real survives verification.
- Scale the count to how many hotspots cleared the bar - 5, 20, or 50. Run in waves if the tier has concurrency limits.

### Phase 5 - Synthesize (verify, dedupe, score, rank)
Read `${CLAUDE_SKILL_DIR}/references/synthesis.md` and run the critic pass:
1. Spawn a separate **critic** instance per report (or reuse `detective` in verify-only mode) that replays the claimed issue **on a fresh checkout** - this catches the classic failure where an agent earlier edited the tree, then "discovered" its own change after a context compaction.
2. Deduplicate findings that are the same root cause hit from different files.
3. Assign each surviving finding a **severity 0-10** and tag it `SEVERITY: N.N` on its own line so the final ranking is greppable.
4. Emit `.temp/code-reviewer/<run-id>/findings.md`: a severity-sorted list, each entry with location, class, root cause, repro/PoC, fix sketch, and confidence.

### Phase 6 - Iterate & open new fronts
The workflow is *dynamic*, not a fixed pipeline. After synthesis:
- If a detective found a **bug class** (e.g. a missing-auth pattern, an unchecked length), spawn a fresh scout wave that searches for that *same pattern* across the rest of the repo - new front, same machinery.
- Re-sweep modules adjacent to confirmed hotspots (imports / callers of the broken file inherit elevated Impact).
- Stop when new waves stop producing top-right-corner hotspots, or when the user's budget / coverage target is met. Note in `findings.md` which areas got only a shallow pass, so coverage is honest.

## Scale & cost guidance
- **Scouts**: cheap tier, many, shallow. Breadth is their whole job.
- **Detectives**: frontier tier, few, deep. Never dispatch one to a file that did not clear the gate.
- Keep all wave plans and partial results in `.temp/code-reviewer/<run-id>/` files, not in the main thread, so a 50-agent run does not blow the orchestrator's context.
- Re-running the same sweep is cheap and repeatable; that is a feature - use it weekly (the slide's "THIS WEEK") and diff hotlists over time.

## Output the user sees
1. **HOTLIST** (`hotlist.md`) - the ranked triage table, what got investigated and what was skipped (with the quadrant reason).
2. **FINDINGS** (`findings.md`) - severity-sorted, verified findings with PoCs and fix sketches.
3. A short prose summary: how many files swept, how many hotspots, how many confirmed findings, and which fronts remain open.

## Reference files
- `${CLAUDE_SKILL_DIR}/references/jobs.md` - the job catalog: Impact-signal × Opportunity-signal per job.
- `${CLAUDE_SKILL_DIR}/references/scoring.md` - the 1-5 rubric, the 2×2 gate, the combine formula, hotlist schema.
- `${CLAUDE_SKILL_DIR}/references/synthesis.md` - detective/critic report schema, clean-checkout verification, dedup, severity scoring, the open-new-fronts loop.

## Subagents this skill drives
Dispatched via the Agent tool with `subagent_type` (plugin-namespaced):
- `superfix:scout` - cheap breadth-first scorer (spawn many).
- `superfix:detective` - frontier depth-first investigator (spawn few).
