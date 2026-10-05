# code-auditor - the skill, its references and scripts

One user-only skill (`disable-model-invocation: true`, no manifest entry: nothing routes to it,
`/viber:code-auditor`) driving two sweep tracks at once: files (Impact x Opportunity) and
producer/consumer pairs (contract agreement). Cheap agents score breadth, frontier agents
investigate only what a deterministic gate let through. Its five agents (`viber:profiler`,
`viber:scout`, `viber:edge-scout`, `viber:detective`, `viber:critic`) are read through
`agents/CLAUDE.code-auditor.md`.

## Pipeline and tiers

| Phase | Worker | Model | Writes |
|---|---|---|---|
| 0 Frame | `profiler` | inherit | `profile.md` (appended to `job.md`) |
| 1 Sweep | `collect_signals.sh`, `collect_edges.sh` | - | `signals/signals.jsonl`, `signals/edges.jsonl` |
| 2 Score | `scout`, `edge-scout` | haiku | JSON lines in the final message, appended by the skill to `scores/` |
| 3 Gate | `rank.ts`, `rank_edges.ts` | - | `hotlist/hotlist.*`, `hotlist/edges.*` |
| 4 Investigate | `detective` | inherit, `effort: high` | `reports/<rank>-<slug>.md` + `.claim.md` sidecar |
| 5 Verify | `critic` | inherit, `effort: high` | no file: a tagged `VERDICT:` block in its final message |

Everything a run produces lives under `.temp/viber/code-auditor/<run-id>/`; verification worktrees
go to `<target-root>/.temp/viber/code-auditor/<run-id>/worktrees/`, one absolute path per detective
or critic, never shared.

## Where each rule lives

- `references/synthesis.md` - sole authority on the report head block, the claim sidecar, the critic
  verdict fold, dedupe, severity and the shape of `findings.md`. `SKILL.md` points at it and must not
  restate it.
- `references/scoring.md` - the 1-5 rubric, the 2x2 file gate, the edge verdict set.
- `references/jobs.md` - the Impact/Opportunity signal pair per job.
- Script headers - every flag, output schema and edge case of the six scripts (`collect_signals.sh`,
  `collect_edges.sh`, `rank.ts`, `rank_edges.ts`, `worktree.sh`, `check_node.sh`).
- `job.md` is the one self-contained brief every agent scores against: `Target root:`, `Window:`,
  optional `Scope:`, the inlined rubric and the `## Repo profile` section. No agent reads
  `scoring.md` or `jobs.md` itself, only the copy Phase 0 inlines; the files reach agents through
  paths built on `${CLAUDE_SKILL_DIR}`.

## Contracts between files

- **Join keys.** `scout` echoes `path` and `edge-scout` echoes `a`/`b` byte-identical to the record it
  was handed; `rank.ts` joins scores to `signals.jsonl` on `path`, `rank_edges.ts` joins verdicts to
  `edges.jsonl` on the pair. A normalised path silently drops the row from the gate.
- **Profile headings.** `## Bug classes from history`, `## Contract shape`, `## Critical paths`,
  `## Severity calibration` are written by `profiler.md`, checked verbatim by the Phase 0 profile gate
  in `SKILL.md`, and read by name in `synthesis.md`, `jobs.md` and `critic.md`. Rename in all of them
  at once.
- **Critic isolation.** The critic gets the sidecar, `job.md`, the worktree script and its own worktree
  path - never the report. The sidecar carries `LOCATION`, `CLASS` and `## Reproduce` only. A sidecar
  field change touches `detective.md`, `critic.md` and `synthesis.md` together.
- **Verdict enums.** Edge: `MATCH | MISMATCH | UNCLEAR | NO_CONTRACT` (`edge-scout.md` -> `rank_edges.ts`,
  only `MISMATCH`/`UNCLEAR` dispatch). Critic: `VERIFIED | REFUTED | PARTIALLY VERIFIED | INCONCLUSIVE`
  (`critic.md` -> `synthesis.md` fold).
- **Prose mirrors the gates.** `scoring.md` restates what `rank.ts` and `rank_edges.ts` compute:
  independent thresholds of 3 on each axis (also the `rank.ts` defaults and the literal
  `--min-impact 3 --min-opportunity 3` in `SKILL.md` Phase 3), the tie-break score, then impact, then
  churn, gate-clearing rows past `--top` landing in `overflow`, the `degenerate` flag, and the edge
  order `MISMATCH` before `UNCLEAR`, then `pair_impact`. A gate change edits the script and
  `scoring.md` in the same change.
- **Phase 4 reads gate output by key name.** `hotlist.json` `hotspots`, `edges.json` `dispatch` and
  `degree[]` (sorted by degree descending, then path). A renamed key in a rank script empties the
  dispatch set without an error. The two-slot degree budget is a rule of `SKILL.md`, not a script flag.
- **Phase 5 ranks by line position.** It reads only the first four lines of each report (`# <title>`,
  `LOCATION`, `CLASS`, `SEVERITY`), so the order of the head block in `synthesis.md` is load-bearing.
- **One window per run.** The `Window:` line in `job.md`, the profiler's brief and the first argument
  of `collect_signals.sh` carry the same number of days (30 unless the user asks otherwise).
- **Scope narrows output only.** With `--scope`, a scoped record is byte-identical to the
  unscoped one. `collect_signals.sh` computes every signal repo-wide; `collect_edges.sh` reads
  only the scope files and every file a scope literal can reach (the `git grep -F` hits plus each
  symlink, assume-unchanged or skip-worktree entry, every candidate when git grep fails), keeps a
  pair with one endpoint outside the area on purpose, and counts only scope-reachable literals in
  its stderr `literals:` line. The skill validates the directory exists before calling them; the
  scripts treat an empty match as exit 0.
- **The two sweep scripts share their universe verbatim**: `DENY_EXT`, `noise_filter`, the two-pass
  extension discovery, the quoted-path skip and the `--scope` validation are copied, not sourced. Edit
  both or the file and edge tracks cover different files.
- **`worktree.sh` is trusted.** It self-verifies and recovers internally, prints exactly one
  `WORKTREE_READY|REMOVED|FAILED` line; callers never branch on a git error. `WORKTREE_FAILED` is
  `NO FINDING` for a detective, `INCONCLUSIVE` for a critic.
- **Node >= 22.6.** `check_node.sh` resolves the `node` command for the `.ts` gates and halts the run
  before any spend when it prints `NODE_MISSING`. It is a copy of `superui`'s
  `pro-designer/scripts/check_node.sh` (only the header name line differs);
  `tests/superui/check_node.test.ts` asserts the two behave identically, so change both.

## Traps

- The skill pre-approves bare `Bash` and calls its scripts through an interpreter (`sh check_node.sh`,
  `bash collect_*.sh`, `node rank*.ts`, `sh worktree.sh`), the exception to viber's literal-line
  form. `check_node.sh` and `worktree.sh` are POSIX `#!/bin/sh`; the collectors need bash. Only
  `check_node.sh`, `collect_edges.sh` and `worktree.sh` are 100755.
- `rank.ts` reproduces Python 3.9 output exactly: its bespoke JSON parser/dumper (`PyFloat`,
  key-order-preserving `Map`) matches `json.dumps`/`str`, its hand-rolled usage text matches
  `argparse`, and `tests/viber/rank.test.ts` pins it. Never swap in `JSON.parse`/`JSON.stringify`.
  `rank_edges.ts` has no such layer.
- `tests/viber/profiler.test.ts` lifts the fenced `git log` block from `agents/profiler.md` verbatim
  and runs it: editing that block edits a test input. `--since=<n>.days.ago` must stay in that form
  (`--since=30d` parses to "now" and returns an empty log with exit 0).
- Phase 2 (scouts) must not start until the profile gate has resolved, and the gate's second miss is not a
  stop: the run continues uncalibrated and says `repo profile unavailable` in `findings.md`.
