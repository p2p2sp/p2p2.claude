Title: "superfix: add the edge track - artifact-pair sweep, degeneracy alarm, structural budget"


## Goal
`code-auditor` sweeps two units in every run: files (unchanged) and producer/consumer **pairs**. A contract defect that lives between two individually-correct files is now reachable: `collect_edges.sh` discovers candidate pairs deterministically, a cheap `edge-scout` classifies each pair `MATCH` / `MISMATCH` / `UNCLEAR`, `rank_edges.ts` ranks the non-`MATCH` ones by a deterministic pair-Impact, and detectives are dispatched to the union of file hotspots, edge hotspots, and a small budget of highest-degree files. `rank.ts` additionally reports when the per-file Opportunity distribution is degenerate, so a zero-hotspot run names itself instead of reading as "all clear".

## Context
Run `2026-07-25-superui` passed 0 of 32 files through the standard gate (28 files scored Opportunity 1, 4 scored 2, none reached 3), yet the two heaviest findings (SEV 5.5 and 5.0) came from dispatches made outside the gate. Both were contract mismatches between two files that are each correct in isolation, so no per-file scout could see them - the scouts answered correctly within their contract. This is an observability failure, not a calibration failure: the unit of assessment is the file, and the defect is not a property of any file. Lowering the threshold does not fix it (at T=1 all 32 files pass and the gate means nothing). The fix is a second unit of assessment. Source note: `.temp/code-reviewer/2026-07-25-superui/gate-observations.md`.

Two deviations from the interview worth flagging at approval: (1) `rank_edges.ts` writes its own `hotlist/edges.md` instead of appending a section to `hotlist.md` - appending is not idempotent on a re-run and `rank.ts` overwrites `hotlist.md` wholesale, which would make script ordering load-bearing; (2) `scoring.md` gets new schema sections documenting the fields `rank.ts` and `rank_edges.ts` emit, but its 1-5 rubric, 2x2 gate, T=3 defaults and "leave it" warning are untouched, exactly as decided.

## Acceptance criteria
1. `collect_edges.sh` emits one JSON line per candidate pair to stdout with `a`, `b`, `via`, `fanout`, `shared`; every line satisfies `a < b` lexicographically and `2 <= fanout <= --max-fanout`.
2. Pair discovery is stack-agnostic and deterministic: candidates come from path-like literals shared by two or more swept files, reusing `collect_signals.sh`'s deny-list, noise filter and portability conventions; no language-specific parsing, no `jq`.
3. A new `edge-scout` agent returns one strict-JSON line per pair carrying `verdict` of exactly `MATCH`, `MISMATCH` or `UNCLEAR`, echoes `a`/`b` byte-identical, and is registered in `superfix/.claude-plugin/plugin.json` `agents[]`.
4. `rank_edges.ts` drops `MATCH` verdicts, orders the rest by verdict class then a pair-Impact computed only from both endpoints' signals, caps dispatch with `--top-edges`, and writes `hotlist/edges.json` plus `hotlist/edges.md`.
5. `rank.ts` emits `opportunity_histogram` and `degenerate` in `hotlist.json` and states the degenerate case in one line of `hotlist.md`; for a non-degenerate run its hotspot/overflow/skipped output is otherwise unchanged.
6. `SKILL.md` runs the edge track unconditionally alongside the file track and dispatches detectives to the union of file hotspots, edge dispatch rows, and a degree budget of 2 highest-degree files from `edges.json` `degree[]` that are not already in that union. The degree budget is a `SKILL.md`-level rule read off `degree[]`, not a script flag.
7. `SKILL.md` states the real concurrency ceiling of 16 concurrent subagents instead of "tens at a time is normal", for both waves.
8. A detective dispatched from an edge receives both endpoints as entry points, and `synthesis.md`'s `ENTRY:` field accepts a pair.
9. `scoring.md` documents the new `hotlist.json` fields and the `edges.json` schema; its 1-5 rubric, 2x2 gate, T=3 defaults and 5x2 "leave it" warning are unchanged.
10. `superfix/CLAUDE.md` and the root `CLAUDE.md` list `edge-scout` and describe the pipeline as two-track.

