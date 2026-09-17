# final review

## Gates
- Build - none - the plugin ships markdown, JSON and bash only; there is no build step in this repo
- Tests - pass - 8s
- Integration - pass - 73s

## Findings

### Important

- I1 - Blocked notes declare nothing - superdev/agents/vibe-implementor.md:112 - on `VERDICT: BLOCKED` the agent is told the notes file "carries the `DECISION:` lines and nothing else", while step 1 has it stop "at the point it surfaced" with the working tree left exactly as it stands, so files it already changed are never written as `touched:` lines - why it matters: every downstream consumer of this run reads the declared set off those lines and only those, so a BLOCKED run leaves `vibe-guard.sh` measuring `files: 0 new: 0 lines: 0` over a tree that was really changed, the `## Guard` sensitive-path check never sees the touched path at all, and `## Stop`'s revert has nothing to take back; the only backstop left is `commit-task.sh`'s exit 2, which asks a question instead of applying a guard verdict - how to fix: have step 4 write the `## Runs` section's `touched:` lines on BLOCKED too (the `DECISION:` lines plus one `touched:` line per file already changed), and have the re-dispatch after an answered `DECISION:` declare the whole run rather than only its second pass.
- I2 - Touched parser duplicated - superdev/scripts/vibe-guard.sh:92 - `trim()` (92), `normalise_path()` (152) and the `touched:` cut loop (188-207) are verbatim copies of `superdev/scripts/commit-task.sh:75`, `:156` and `:229-253`; no test asserts the two agree and neither file sources the other, although this repo already ships that mechanism (`superdev/scripts/lib_label.sh`, sourced by `label.sh` and `resolve-input.sh`, whose own header records the drift bug that created it) - why it matters: the vibe track's whole guarantee is that the guard measures exactly the set the commit stages, and that now rests on two independent copies staying identical; change the cut rule in one of them (say it also has to cut at " [") and the guard reduces `foo.ts [note]` to a path that exists nowhere, prints `dropped: foo.ts [note]`, counts it in no threshold and returns `RESULT: OK`, while `commit-task.sh` stages `foo.ts` - a file the guard never measured lands in the commit and no test goes red - how to fix: extract the three shared pieces into a `superdev/scripts/lib_touched.sh` on the `lib_label.sh` pattern, source it from both scripts, and keep each script's own `add_declared` policy (`commit-task.sh`'s `.temp/` drop and `.` handling, `vibe-guard.sh`'s dedupe) local to it.

## Debt

- M1 - Revert reports a no-op - superdev/skills/vibe/SKILL.md:193 - `### The declared paths` works off the `touched:` lines of `<run dir>/notes.md` and says nothing about the file being absent or carrying none, a state `## Verdict` itself enumerates ("It does not exist -> ... `## Stop` ... `counters unmeasured`"); the revert option then restores nothing, lists no skipped path, and `## Done` still prints `reverted`. Reverting blind would be worse, so the fix is one sentence: on an absent or `touched:`-free notes file the revert option says the run declared no path and nothing was restored, and `## Done` carries that instead of `reverted`.

## Notes
- NOTE: plan defect - `I1`'s rule comes straight from Task 2's `### Approach` step 6 ("on BLOCKED only the `DECISION:` lines"), so fixing the agent means correcting that step too, not just the shipped file.
- CARRY closed - `tests/harness/run.ts` (task-01-notes.md): `tests/superdev/resolve-input.test.ts:47,57` is the only other suite passing a glob-bearing argument (`'?plan'`) without `MSYS=noglob`. Under Git-Bash the MSYS runtime leaves an unmatched glob literal, so the case passes today and is latent rather than broken; it is test-harness scope, outside this build's `### Files`, and needs no change here.
- CARRY closed - `CLAUDE.md` (task-05-notes.md): the `## Repository layout (top level)` line "two task implementors, one task reviewer and three closeout writers" was already stale before this build (it counts neither `qa-writer` nor `e2e-writer`), so `vibe-implementor` going uncounted there is pre-existing drift, not a regression. The self-documentation invariant's own agents list and `plugin.json` `agents[]` were both updated correctly.
- `vibe-guard.sh`'s `add_declared` does not drop `.temp/` paths the way `commit-task.sh`'s does, so a `touched: .temp/<file>` line would count toward `new:` and `files:` in the guard and be staged by neither. The agent prompt forbids declaring scratch files, so nothing reaches that path today.

## Assessment
The delivery is careful and its test suite proves every threshold on both sides, but two seams between tasks are unsound: a BLOCKED run declares none of the files it changed, which disarms the guard and the revert alike, and the `touched:` parser the guard and the commit script must agree on exists as two uncoupled copies with no test binding them.

VERDICT: FAIL
