# superfix - prioritized multi-agent codebase investigation

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skill / agents as runtime data. See the root `CLAUDE.md` for the
> repo-wide warnings and cross-plugin invariants; this file holds only what is specific to `superfix`.

`superfix` is the codebase-investigation plugin: one user-invoked skill that sweeps a repo on **two tracks** -
files, scored Impact × Opportunity, and producer/consumer artifact pairs, triaged `MATCH` / `MISMATCH` /
`UNCLEAR` / `NO_CONTRACT` - and dispatches cheap-triage / deep-dive agents into the union of both tracks'
hotspots. It ships **no `hooks/` and no injected manifest**. Its single skill `code-auditor` is `disable-model-invocation:
true` (user-only, invoked solely via `/superfix:code-auditor`), so there is nothing to auto-route - a dispatcher
manifest would be dead weight, and the manifest is what the `SessionStart` hook injects, so dropping the
manifest drops the hook too. This is the plugin-scale analogue of superdev's `setup`: a user-only command
deliberately outside any routing manifest. The **per-skill** catalog of record is `.claude-plugin/plugin.json`
`skills[]` + `agents[]`.

## Layout (superfix internals)

```
superfix/
  .claude-plugin/plugin.json   The plugin manifest - skills[] + agents[] are the catalog of record
  skills/            One user-invoked skill code-auditor/ (disable-model-invocation); bundles
                     references/ (jobs.md, scoring.md, synthesis.md) + scripts/ (check_node.sh,
                     collect_signals.sh, rank.ts - the file track; collect_edges.sh, rank_edges.ts - the
                     edge track) - all addressed via `${CLAUDE_SKILL_DIR}/...`
  agents/            Four plugin agents: scout.md (cheap haiku file triage) + edge-scout.md (cheap haiku
                     pair triage) + detective.md (frontier opus deep-dive) + critic.md (frontier opus
                     independent verifier)
```

## Components (qualified `superfix:<name>`)

- `code-auditor` (skill, main context, user-only) - prioritized multi-agent codebase investigation, run as
  **two tracks** every time, unconditionally:
  - **File track** (unchanged in shape) - `score = Impact × Opportunity`: a deterministic sweep
    (`scripts/collect_signals.sh`) → cheap `scout` scoring fan-out → deterministic gate/rank
    (`scripts/rank.ts`, TypeScript run by Node's native type stripping), which now also reports an
    `opportunity_histogram` and a `degenerate` flag - a run where no file's Opportunity clears the gate names
    itself instead of reading as "all clear".
  - **Edge track** (new) - a contract defect between two individually-correct files is invisible to a
    per-file scout, so pairs get their own sweep: a deterministic pair discovery (`scripts/collect_edges.sh`,
    reusing `collect_signals.sh`'s deny-list and noise filter, no language-specific parsing) scores every
    linking literal artifact-first (a real tracked file both sides touch outranks a same-named syntax token),
    emits `via` as the top-scoring literal and `vias` as up to 3 candidates ranked the same way, best first →
    cheap `edge-scout` fan-out judging the pair on the strongest real contract among those candidates and
    returning `MATCH` / `MISMATCH` / `UNCLEAR` / `NO_CONTRACT` per pair (`NO_CONTRACT` when the shared literal
    is coincidental - no real contract to check) → deterministic gate/rank (`scripts/rank_edges.ts`) that keeps
    `MATCH` and `NO_CONTRACT` out of both `dispatch` and `overflow`, orders the rest by verdict class
    (`MISMATCH` before `UNCLEAR`) then a pair-Impact computed only from both endpoints' signals, caps dispatch
    at `--top-edges`, and writes its own `hotlist/edges.json` + `hotlist/edges.md` (a separate file from
    `hotlist.md`, not an appended section - appending is not idempotent on a re-run, and `rank.ts` overwrites
    `hotlist.md` wholesale).
  - Detectives are dispatched into the **union** of file hotspots, edge dispatch rows, and a small structural
    budget (2 highest-degree files from `edges.json`'s `degree[]` not already in that union) - never into
    either track's hotspots alone → verified, severity-ranked synthesis. State lives under a
    `.temp/superfix/<run-id>/` workspace, not the main context. Bundles `references/{jobs,scoring,synthesis}.md`.
    Phase 0 resolves the runtime via `scripts/check_node.sh` and HARD-STOPS on `NODE_MISSING` - the gate is
    what makes the cut reproducible, so a run that cannot rank must not pay for the sweep and the scout fan-out
    first (this now covers both tracks' gates, both driven by the same Node runtime). This is
    the one place superfix's env-check differs from superui's `pro-designer` (whose contrast-script fallback
    degrades with a note pointing at `/superui:setup` rather than hard-stopping) - superui's other
    script-dependent skill, `design-extractor-builder`, hard-stops on `NODE_MISSING` exactly like superfix; it
    is also why the check sits in Phase 0 rather than next to the ranking steps it guards.
- `scout` / `edge-scout` / `detective` / `critic` - the four **plugin agents** (`agents/*.md`, listed in
  `plugin.json` `agents[]`, dispatched via the Agent tool with `subagent_type: superfix:<name>`). `scout` is
  cheap-tier breadth-first per-file triage (spawn many); `edge-scout` is the same cheap tier applied to a
  candidate pair instead of a file - its job is narrower (a four-way verdict on whether both endpoints agree on
  a shared contract, judged on the strongest real contract among the pair's `via` and `vias` candidates), and
  its `UNCLEAR` verdict is itself a dispatch reason for Phase 4, not a rejection;
  `detective` is frontier-tier depth-first investigation (spawn few) - a detective dispatched from an edge
  receives both endpoints as entry points, per `synthesis.md`'s pair-capable `ENTRY:` field; `critic` is
  frontier-tier independent verification, one instance per detective report, replaying its claim on
  a fresh checkout and returning a tagged verdict (schema in `references/synthesis.md`) rather than a file.
  Bare-named because they are genuine agents, not fork-skills.

**Plugin-specific invariant: the edge track carries no Opportunity axis.** Opportunity is a property of one
file (how cheap/safe a fix there is); a pair defect's Impact is already computed from both endpoints, but there
is no single file whose Opportunity could stand for the pair, and inventing one would silently reintroduce the
same file-shaped assumption that made the original per-file gate blind to this class of defect in the first
place. The edge gate therefore ranks by verdict class + pair-Impact only, never a 2×2 quadrant.

`superfix` declares no cross-plugin chains.
