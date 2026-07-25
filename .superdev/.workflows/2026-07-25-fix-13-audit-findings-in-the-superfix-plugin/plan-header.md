Title: "Fix 13 audit findings in the superfix plugin"


## Goal
The `superfix` code-auditor runs end to end on macOS/BSD tooling, and every stage either produces a
correct artifact or fails loudly: the sweep discovers all candidate files, the gate reports every file
that cleared it, path identity survives the scout round trip, the detective's verification recipe is
collision-safe, and Phase 5 dispatches a real, contract-bearing `critic` agent.

## Context
A prioritized audit of `superfix/` (11 files, 6 hotspots, all investigated) returned 13 execution-verified
findings; 4 of 6 detective reports were replayed by an independent critic on a clean worktree. The headline
defect kills the plugin outright on macOS - `collect_signals.sh` feeds a newline-bearing value into `awk -v`,
which BSD awk rejects, so Phase 1 emits zero signals and exits 2. Behind it sit two silent-output defects in
the gate (`rank.ts` collapses both threshold flags into one, and `--top N` deletes gate-clearing files from
the report), a path-anchor drift that broke the scores/signals join live during the audit, an unsafe global
`git worktree` recipe that already leaked a 17 MB orphan, and a Phase 5 that dispatches an agent which has
never existed. The audit ran in a gitignored `.temp/` scratch workspace that has since been removed, so every
finding it produced is restated in this plan's criteria and every task builds its own fixtures. This repo
ships markdown / JSON / shell / TS as source with no build, test or lint step, so verification is by
executing the scripts against those fixtures and by reading the contract files against each other.

## Acceptance criteria
1. `collect_signals.sh` runs to completion against a multi-extension git repo on macOS/BSD awk: exit 0 and one JSON line per swept file.
2. Files whose paths git quotes under default `core.quotePath=true` (non-ASCII bytes) appear in the sweep output, and their extensions appear in the `sweep extensions:` stderr line.
3. An unreadable tracked file makes the sweep warn on stderr and continue; an unborn HEAD makes it exit non-zero with one explanatory message and no partial output. Neither truncates the stream silently.
4. Under `--with-dependents` a dotfile such as `.gitignore` does not receive a near-maximal `dependents` count.
5. `collect_signals.sh --with-dependents` works with either positional argument omitted, exactly as the script header documents.
6. `--min-impact` and `--min-opportunity` each gate their own axis: `--min-impact 5 --min-opportunity 3` excludes an impact-4 file, and `--min-impact 2 --min-opportunity 3` does not admit an opportunity-2 file.
7. Every file that clears the gate appears in `hotlist.json` and `hotlist.md`; the members of `counts` sum to `counts.scored`, and `--top N` caps dispatch, not the record.
8. `rank.ts` writes a stderr warning naming each scores path that matched no signals row.
9. `agents/scout.md` declares no write-capable tool; its output section states that `path` must be echoed byte-identically from the signal line; and its JSON-only rule sits in `## Hard rules` with the return route stated as the final message.
10. The clean-checkout recipe in `agents/detective.md` uses a caller-supplied unique path, carries no `--force`, includes recovery guidance for the stale-registration and orphaned-directory states, and is textually identical to the copy in `references/synthesis.md`; the detective declares no `Edit` tool and carries a hard rule against writing inside the target tree.
11. `agents/critic.md` exists, is listed in `.claude-plugin/plugin.json` `agents[]` and not in `skills[]`, has a verdict schema in `references/synthesis.md` covering every verdict value it can return, and is named in both `superfix/CLAUDE.md` and the root `CLAUDE.md`.
12. `SKILL.md` Phase 0 records the resolved target root; Phase 2 hands the scout the signal-line path as the single source of truth; Phase 4 resolves a hotspot path against that root before dispatch; Phase 3 passes `--run-id` and `--job`; Phase 5 dispatches `superfix:critic`.
13. `references/scoring.md` documents the `counts` object, the overflow bucket, the two independent minimums, the 50-row cap on the skipped table, and the 1..5 clamping of out-of-range scores.

