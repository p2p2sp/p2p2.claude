Title: "Fix all 9 verified findings from the 2026-07-26 code-auditor audit of superfix"


## Goal
Every defect confirmed by the audit run `2026-07-26-bugs` is gone from the `superfix` source: the edge track
stops discarding its most promising pairs and stops emitting link literals that exist in neither endpoint, the
two ranking gates stop crashing on a legitimately empty sweep and stop corrupting their own decision tables,
the sweeps stop dropping tracked files silently, the clean-checkout recipe survives the verification it exists
for, and every reference/`CLAUDE.md` claim matches the shipped scripts.

## Context
The audit swept 15 files and 43 artifact pairs, dispatched 8 detectives and 8 critics, and returned 9 findings
- all `VERIFIED`, none `REFUTED`. Full report: `.temp/code-reviewer/2026-07-26-bugs/findings.md`; per-finding
PoCs and oracles: `.temp/code-reviewer/2026-07-26-bugs/reports/`. Findings 1 and 4 compound (a bad `via` feeds
a scout that has no verdict for "no contract"), so they are fixed in dependency order rather than in severity
order. Two conventions constrain every task: this repo has no build, test or lint at any level - editing
markdown IS shipping - so each task's verification is a fixture run of the real script or a grep assertion on
the edited file, and every task is therefore `TDD: none` (the shell/TS code here reads git and the filesystem
and writes stdout, which yields integration checks, not red-green cycles). Agent and skill markdown must stay
table-free and emoji-free per `.claude/rules/_skills.md`.

Scope note: finding 9 traces one false claim to `superui/CLAUDE.md:157`, outside the superfix subtree named in
the request. Task 10 fixes it there too - correcting only the copy in `superfix/CLAUDE.md` would leave the
source of the drift in the repo.

## Acceptance criteria
1. `rank_edges.ts` given a readable `--edges` file and a nonexistent `--verdicts` path exits 0 and writes a
   well-formed `edges.json` + `edges.md`; a nonexistent `--edges` path still exits non-zero.
2. A `reason` or `via` value containing `|` produces a table row in `edges.md` / `hotlist.md` with exactly as
   many cells as the header, and the raw unescaped value survives in `edges.json` / `hotlist.json`.
3. `collect_edges.sh` emits no token that is absent from its endpoints: a dotted literal whose post-dot tail
   exceeds the 8-character cap is skipped whole, never truncated.
4. Two files mentioning two different literals that share a long prefix produce no pair.
5. A tracked path that git C-quotes (`"` or `\` in the name) produces one stderr warning naming it, in both
   `collect_signals.sh` and `collect_edges.sh`, instead of vanishing silently at exit 0.
6. `dependents` for a non-ASCII filename that only mentions its own stem is 0, not 1.
7. For a pair linked by both an artifact literal and a lower-fanout syntax literal, the emitted `via` is the
   artifact literal, and the record carries a `vias` list of up to 3 candidates, best first.
8. `edge-scout` can return `NO_CONTRACT`; `rank_edges.ts` counts it in its own bucket, keeps it out of
   `dispatch` and `overflow`, satisfies
   `counts.match + counts.mismatch + counts.unclear + counts.no_contract + counts.unscored == counts.pairs`,
   and no row whose reason denies a contract lands under the `MATCH` heading.
9. The clean-checkout recipe in `detective.md`, `critic.md` and `synthesis.md` uses
   `git worktree remove --force`, and its recovery ladder carries a rung for
   `contains modified or untracked files`.
10. `synthesis.md`'s `findings.md` template renders `SEVERITY: N.N` on its own line, its documented final sort
    reads `findings.md` rather than `reports/`, its fold list states what to do with the critic's independent
    `SEVERITY`, and `INCONCLUSIVE` is defined when `CONFIDENCE` is already `low`.
11. `scoring.md`'s `hotlist.json` example is reproducible: feeding its own `opportunity_histogram` to `rank.ts`
    at its own `top` and gates yields its own `counts`, and its `overflow` row's `rank` is the first rank past
    the cap.
12. No `CLAUDE.md` in the repo claims superfix is the only plugin without hooks or that superui degrades on
    `NODE_MISSING`; the root and superfix `CLAUDE.md` verdict vocabulary and edge-record description match the
    shipped scripts.

