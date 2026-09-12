# superfix

Prioritized multi-agent investigation of a codebase. One user-invoked command sweeps the whole repo with
cheap agents, ranks what it found deterministically, and spends frontier-model tokens only where both the
Impact and the Opportunity are high.

```
score = Impact x Opportunity
```

Impact is how much pain a fix touches (reach, dependents, blast radius, change frequency); Opportunity is
how broken or drifted the code is right now and how cheaply it can be fixed today. Only the corner where
both are high earns a deep investigation - high impact with nothing to win is the "leave it" cell.

Ships no hooks and no manifest; nothing routes to it automatically.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superfix@p2p2 --scope user
```

Requires **Node.js >= 22.6** on the machine (the ranking scripts are TypeScript run directly by Node's
native type stripping - no packages, no build step). A run hard-stops in Phase 0 when Node is missing,
before paying for the sweep.

## Quick start

1. Run `/superfix:code-auditor [<repo-path>] [<area-dir>]`.
2. Confirm the target repo path and the job. Say "find bugs", "review this repo" or "audit" and it defaults
   to Reliability/Bugs plus Code/Tech debt; other jobs are Dead code, Coverage, Consistency, Spend,
   Performance, Conversion and SEO. The optional `<area-dir>` scopes the whole run to that one subtree.
3. Review the two gate tables it prints - `hotlist.md` (files) and `edges.md` (artifact pairs) - **before**
   it spends frontier tokens. This is the moment to narrow the run.
4. Read `findings.md`: at most ten full, severity-sorted, independently verified findings with a
   reproduction and a fix sketch each, then a `## Further findings` list of one line per surviving finding
   that did not make the cap.

Every run sweeps two tracks at once:

- **Files** - scored Impact x Opportunity, gated deterministically to the top hotspots.
- **Producer/consumer pairs** - two files sharing a path-like literal, triaged `MATCH` / `MISMATCH` /
  `UNCLEAR` / `NO_CONTRACT`. A contract defect between two individually-correct files is invisible to a
  per-file scout, which is why it gets its own track.

The session model is also the detective and critic model (both carry `model: inherit`) - a weaker session
model means weaker reproduction, not just a weaker sweep.

Detectives go into the union of both tracks' hotspots plus a small structural budget for the
highest-degree files. Everything - wave plans, scores, reports - lives in `.temp/superfix/<run-id>/`, never
in the main context, which is what lets one run scale to tens of subagents.

Re-running the same sweep is cheap and reproducible: run it weekly and diff the hotlists.

## Skills

| Skill | Role |
| --- | --- |
| `code-auditor` | The whole workflow, user-only (`/superfix:code-auditor`): sweep, score, gate, dispatch, verify, synthesize. Nothing auto-routes to it. |

## Agents

Dispatched by `code-auditor` only, never directly.

| Agent | Role |
| --- | --- |
| `profiler` | Session model, Phase 0: reads the target's memory, tooling and fix history and writes the run's repo profile. One per run. |
| `scout` | Cheap tier, breadth-first: scores one file (or a batch) on Impact and Opportunity. Spawn many. |
| `edge-scout` | Cheap tier: judges one candidate pair on the strongest real contract between them and returns a four-way verdict. `UNCLEAR` is a dispatch reason, not a rejection. |
| `detective` | Session model (`model: inherit`), depth-first: investigates one hotspot (or both endpoints of an edge), reproducing its claim on a fresh worktree checkout. Spawn few. |
| `critic` | Session model (`model: inherit`): reads only the detective's claim sidecar, never its report, and independently replays the claim on its own fresh checkout to return a verdict. One per report. |
