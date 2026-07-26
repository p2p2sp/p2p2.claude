Title: "Fix all 9 audit findings in the superfix plugin"


## Goal
Every defect confirmed by the 2026-07-26 superfix audit is repaired in the plugin source: the clean-checkout verification recipe is anchored to the audited repo instead of the session cwd, both ranking gates survive off-spec and BOM-prefixed input, `collect_edges.sh` stops silently dropping filenames written at the end of a sentence, `edges.md` renders the degree list it promises with escaped path cells, and the five drifted documentation contracts (Phase 5 fold restatement, the edge-record key list, the degree scope claim, the `scoring.md` edges example, the `scout.md` sentinel) once again match what the scripts actually do.

## Context
The `/superfix:code-auditor` self-audit swept the plugin on both tracks and produced 9 critic-verified findings (`.temp/code-reviewer/2026-07-26-superfix/findings.md`), severity 5.0 down to 1.5. Three of them share one failure mode - a rule written in two or three files, then edited in only one - which is why the fixes cluster in `SKILL.md`, `synthesis.md` and the two agent definitions. The plugin ships markdown and scripts only: there is no build, test or lint step anywhere in this repo and no `package.json`, so every task is verified by executing the real script against fixtures under `.temp/superfix-fix/` or by a grep / `node -e` assertion against the edited file. Every test command below writes `node`; run `sh superfix/skills/code-auditor/scripts/check_node.sh` first and substitute the command it reports after `NODE_OK` - on Node 22.6 to 23.5 that is `node --experimental-strip-types`, and bare `node` will not run the `.ts` gates there. Each task removes its own `.temp/superfix-fix/` fixtures when it finishes. No skill or agent is added, removed or renamed, so `.claude-plugin/plugin.json` and `superfix/CLAUDE.md` need no change.

## Acceptance criteria
1. Every verification-worktree command in `detective.md`, `critic.md` and `synthesis.md` is anchored with `git -C <target-root>`; running the recipe from a directory whose repo is NOT the audited repo yields a worktree of the audited repo, with the audited file present.
2. `rank.ts` exits 0 and writes both outputs when its scores file contains a line that is valid JSON but not an object, warning on stderr instead of throwing; and `rank.ts` and `rank_edges.ts` both parse a BOM-prefixed first line instead of discarding it.
3. `SKILL.md` Phase 5 step 2 no longer restates the per-verdict fold rules - it defers to the table in `synthesis.md` only.
4. `collect_edges.sh` emits the candidate pair for a filename written at the end of a sentence (`report.md.`), and the emitted `via` carries no trailing punctuation.
5. `SKILL.md` Phase 1 lists all six keys `collect_edges.sh` emits per edge record (`a`, `b`, `via`, `vias`, `fanout`, `shared`) and states the record is handed to the edge-scout verbatim.
6. `edges.md` contains the structural degree list, and every A/B cell is markdown-escaped like the Via/Reason cells already are.
7. `scoring.md`'s `edges.json` example satisfies `counts.match == match.length` and `counts.no_contract == no_contract.length`; `SKILL.md` no longer claims the degree list reports every path.
8. `scout.md` states that `dependents` is always present and that `-1` means "not computed", not low reach.
9. `synthesis.md`'s severity self-check is a command that produces output (fails) when `findings.md` is not severity-sorted.

