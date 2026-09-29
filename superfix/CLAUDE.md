# superfix - code-auditor and its five agents

One user-only skill (`code-auditor`, `disable-model-invocation: true`: nothing routes to it) driving
two sweep tracks at once: files (Impact x Opportunity) and producer/consumer pairs (contract
agreement). Cheap agents score breadth, frontier agents investigate only what a deterministic gate
let through.

## Pipeline and tiers

| Phase | Worker | Model | Writes |
|---|---|---|---|
| 0 Frame | `profiler` | inherit | `profile.md` (appended to `job.md`) |
| 1 Sweep | `collect_signals.sh`, `collect_edges.sh` | - | `signals/signals.jsonl`, `signals/edges.jsonl` |
| 2 Score | `scout`, `edge-scout` | haiku | JSON lines in the final message, appended by the skill to `scores/` |
| 3 Gate | `rank.ts`, `rank_edges.ts` | - | `hotlist/hotlist.*`, `hotlist/edges.*` |
| 4 Investigate | `detective` | inherit, `effort: high` | `reports/<rank>-<slug>.md` + `.claim.md` sidecar |
| 5 Verify | `critic` | inherit, `effort: high` | no file: a tagged `VERDICT:` block in its final message |

Everything a run produces lives under `.temp/superfix/<run-id>/`; verification worktrees go to
`<target-root>/.temp/superfix/<run-id>/worktrees/`, one absolute path per detective or critic,
never shared.

## Where each rule lives

- `references/synthesis.md` - sole authority on the report head block, the claim sidecar, the critic
  verdict fold, dedupe, severity and the shape of `findings.md`. `SKILL.md` points at it and must not
  restate it.
- `references/scoring.md` - the 1-5 rubric, the 2x2 file gate, the edge verdict set.
- `references/jobs.md` - the Impact/Opportunity signal pair per job.
- Script headers - every flag, output schema and edge case of the six scripts (`collect_signals.sh`,
  `collect_edges.sh`, `rank.ts`, `rank_edges.ts`, `worktree.sh`, `check_node.sh`).
- `job.md` is the one self-contained brief every agent scores against: `Target root:`, `Window:`,
  optional `Scope:`, the inlined rubric and the `## Repo profile` section.

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
- **Scope narrows output only.** With `--scope`, both sweep scripts still compute every signal
  repo-wide, so a scoped record is byte-identical to the unscoped one; `collect_edges.sh` keeps a pair
  with one endpoint outside the area on purpose. The skill validates the directory exists before
  calling them; the scripts treat an empty match as exit 0.
- **The two sweep scripts share their universe verbatim**: `DENY_EXT`, `noise_filter`, the two-pass
  extension discovery, the quoted-path skip and the `--scope` validation are copied, not sourced. Edit
  both or the file and edge tracks cover different files.
- **`worktree.sh` is trusted.** It self-verifies and recovers internally, prints exactly one
  `WORKTREE_READY|REMOVED|FAILED` line; callers never branch on a git error. `WORKTREE_FAILED` is
  `NO FINDING` for a detective, `INCONCLUSIVE` for a critic.
- **Node >= 22.6.** `check_node.sh` resolves the `node` command for the `.ts` gates and halts the run
  before any spend when it prints `NODE_MISSING`. It is a copy of `superui`'s
  `pro-designer/scripts/check_node.sh`; `tests/superui/check_node.test.ts` asserts the two behave
  identically, so change both.

## Traps

- Unlike the root's direct-call invariant, `code-auditor` pre-approves bare `Bash` and calls its
  scripts through an interpreter (`sh check_node.sh`, `bash collect_*.sh`, `node rank*.ts`,
  `sh worktree.sh`). `check_node.sh` and `worktree.sh` are POSIX `#!/bin/sh`; the collectors need bash.
- `rank.ts` reproduces Python 3.9 output exactly: its bespoke JSON parser/dumper (`PyFloat`,
  key-order-preserving `Map`) matches `json.dumps`/`str`, its hand-rolled usage text matches
  `argparse`, and `tests/superfix/rank.test.ts` pins it. Never swap in `JSON.parse`/`JSON.stringify`.
  `rank_edges.ts` has no such layer.
- `tests/superfix/profiler.test.ts` lifts the fenced `git log` block from `agents/profiler.md` verbatim
  and runs it: editing that block edits a test input. `--since=<n>.days.ago` must stay in that form
  (`--since=30d` parses to "now" and returns an empty log with exit 0).
- Phase 2 (scouts) must not start until the profile gate has resolved, and the gate's second miss is not a
  stop: the run continues uncalibrated and says `repo profile unavailable` in `findings.md`.

## Tests

`tests/superfix/` holds one file per script plus `profiler.test.ts`:
`node --test "tests/superfix/*.test.ts"`.
