# The five code-auditor agents

`profiler`, `scout`, `edge-scout`, `detective` and `critic` are dispatched only by the `code-auditor`
skill (`viber:<agent>`). They stand outside the node's "Shared text": no "Your tools are ..." paragraph,
no `VERDICT: DENIED` line. Every `references/` path below is in `skills/code-auditor/`.

Each agent's inputs are named paths in the `code-auditor` brief, used exactly as given and
substituted literally into every Bash call (shell variables do not persist between calls); no
agent invents a path or asks the user.

## Output shapes have mirrors

An agent body restates the shape its consumer parses instead of pointing at it, so a shape change
edits the agent and its mirror together:

- `scout.md` JSON line - the example in `references/scoring.md`, and the keys `rank.ts` reads:
  `impact`/`opportunity` as integers (clamped to 1-5), `impact_reason`/`opportunity_reason` joined
  into the hotlist `reason` column.
- `edge-scout.md` JSON line - `verdict` and `reason` read by `rank_edges.ts`.
- `critic.md` four-line `VERDICT:`/`COMMAND:`/`OBSERVED:`/`SEVERITY:` block - the Critic verdict
  schema in `references/synthesis.md`.
- `detective.md` `NO FINDING` body and the `sh <worktree-script> add|remove` block (also in
  `critic.md`) - `references/synthesis.md`. The skill dispatches a critic only for a report that is
  not `NO FINDING`.

A malformed scout line never fails the run: `rank.ts` skips a record without numeric
`impact`/`opportunity` with a stderr warning, and `rank_edges.ts` treats an unknown verdict as
`UNCLEAR`, so a bad output shape shows up only as a missing or misfiled gate row.

## Design rules across the agents

- **Doubt escalates.** The cheap agents' bail-out pushes a place toward a detective, never away:
  `scout` scores Opportunity high, `edge-scout` returns `UNCLEAR` (which dispatches). Unreadable
  input is the one asymmetry: `scout` scores it 1/1 (dropped), `edge-scout` returns `UNCLEAR`.
- **Who writes.** `scout`, `edge-scout` (`Read, Grep, Glob`) and `critic` (no `Write`) write no
  file; their final message is the output. `detective` and `profiler` are the only writers, each
  confined to its given output paths and never writing inside the target tree (parallel detectives
  share it), and each reads its file's tail back to delete a leaked closing tag: the sidecar is
  parsed and the profile is appended verbatim to `job.md`.
- **Soft Bash limits.** `critic` (reproduction only) and `profiler` (the one fenced `git log`)
  hold `Bash` in `tools:`; the narrower limit is body text only.
- **Independence.** `profiler` never reads another run, a previous `findings.md` or anything else
  under `.temp/viber/code-auditor/`; it stays under one page because every later agent carries
  `job.md`.

## Traps

- `profiler`'s fallback of returning the whole profile in its final message when the Write fails
  is not consumed: the Phase 0 gate checks only `profile.md` on disk and redispatches on a miss.
- `references/jobs.md` describes a two-job sweep where scouts emit two impact/opportunity pairs,
  but `scout.md`'s output line carries one pair and `rank.ts` reads one.
