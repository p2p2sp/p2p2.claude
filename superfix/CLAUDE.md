# superfix

## Purpose

Prioritized multi-agent codebase investigation. ONE user-invoked skill, `code-auditor`
(`disable-model-invocation: true`), plus five agents in `agents[]`. Ships NO hooks and NO
manifest - the sole skill is user-only, so there is nothing to auto-route.

## Entry points

- `skills/code-auditor/SKILL.md` - `/superfix:code-auditor [<repo-path>] [<area-dir>]`. Runs TWO
  tracks every time, unconditionally:
  - **File track**: `score = Impact x Opportunity`. Deterministic sweep
    (`scripts/collect_signals.sh`, accepts `--scope <area-dir>`) -> cheap `scout` scoring
    fan-out -> deterministic gate/rank (`scripts/rank.ts`), which also flags a `degenerate` run
    (no file clears the Opportunity gate).
  - **Edge track**: a contract defect between two individually-correct files, invisible to a
    per-file scout. Deterministic pair discovery (`scripts/collect_edges.sh`, reuses
    `collect_signals.sh`'s deny-list/noise filter) scores linking literals artifact-first,
    emits `via`/`vias` -> cheap `edge-scout` fan-out returns `MATCH`/`MISMATCH`/`UNCLEAR`/
    `NO_CONTRACT` per pair -> deterministic gate/rank (`scripts/rank_edges.ts`) keeps `MATCH`
    and `NO_CONTRACT` OUT of dispatch, orders `MISMATCH` before `UNCLEAR`, writes its own
    `hotlist/edges.json` + `hotlist/edges.md` (never appended into `hotlist.md`, which
    `rank.ts` overwrites wholesale).
  - Phase 0 dispatches `profiler` (reads the target's own memory/tooling/fix history into the
    run's profile) and resolves the Node runtime via `scripts/check_node.sh`, HARD-STOPPING on
    `NODE_MISSING` (unlike superui's advisory skip - both gates depend on the same runtime).
  - Detectives dispatch into the UNION of file hotspots, edge dispatch rows, and a small
    structural budget from `edges.json`'s `degree[]` - never either track alone.
- `agents/` - `profiler` (once per run, Phase 0), `scout` (cheap per-file triage),
  `edge-scout` (cheap pair triage, `UNCLEAR` is a dispatch reason not a rejection),
  `detective` (deep-dive; a pair-sourced detective gets both endpoints as entry points),
  `critic` (refuter - reads only the claim sidecar, never the detective's report; a missing
  verdict earns one retry before folding as `INCONCLUSIVE`).

## Contracts & invariants

- Thin harness, model does the judgment: deterministic code stays confined to signal
  collection, the two gates, and the worktree lifecycle; all reasoning stays with the agents.
- Agents receive bundled-script paths as ARGUMENTS in the dispatch brief, never as env
  expansions - `${CLAUDE_SKILL_DIR}` resolves inside the skill, not inside an `agents/*.md`.
- `scripts/worktree.sh` owns every clean-checkout recovery for detective/critic verification;
  self-verifying (`WORKTREE_READY`/`WORKTREE_REMOVED` only after the end state is confirmed,
  `WORKTREE_FAILED` otherwise) and trusted by both callers. `WORKTREE_FAILED` is a verification
  verdict (`NO FINDING` / `INCONCLUSIVE`), not a retry prompt.
- The edge track carries NO Opportunity axis - a pair's Impact already comes from both
  endpoints; inventing a pair-Opportunity would reintroduce the file-shaped blindness the edge
  track exists to fix. Ranks by verdict class + pair-Impact only, never a 2x2 quadrant.
- The critic never sees the detective's reasoning - only the claim sidecar (`LOCATION`,
  `CLASS`, `## Reproduce`) - so its verdict is an independent reproduction, not a re-read.
- `detective`, `critic`, `profiler` all carry `model: inherit` - a weaker session model means
  weaker verification, not just a weaker sweep.
- `detective` and `profiler` are the plugin's only writers, and both carry the repo-wide
  read-back guard against an orphan closing tag (`</content>`, `</parameter>`) ending a file
  they wrote. It matters twice over here: the claim sidecar is parsed, and the profile is
  appended to `job.md` verbatim, so one stray tag reaches every agent of the run.

## Anti-patterns

- Growing elaborate scaffolding around the agents - a clever harness tends to become a cage the
  next model release makes unnecessary.
- Letting `code-auditor` skip either track, or letting a detective dispatch from only one track.

## Related context

- Root cross-plugin invariants: `../CLAUDE.md`
- Shares a byte-identical `check_node.sh` with superui: `../superui/CLAUDE.md`
- superfix declares no cross-plugin chains.
