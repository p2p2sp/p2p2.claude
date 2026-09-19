# task review

## Findings

### Important

- I1 - Undeclared deletions in the task commit - docs/notes.md:1 - the task's commit `0a5ee26` deletes 28 files outside its `### Files` set (`docs/notes.md`, `docs/auto-mode-permissions-2026-09-17.md`, `docs/competitive-analysis-2026-09-17.md`, `docs/playwright-smoke-tests.md`, `docs/misc/intent-handoff-context-reset.md`, `docs/misc/plan-mode-harnes.md` and the whole `docs/misc/ui-notes/` tree, a 12 MB PDF and 15 PNGs among them), and the notes carry no `touched:` line for any of them - the one line that mentions the matter names only `docs/misc/` and does so as context for recreating the inventory, not as a declaration. `docs/misc/ui-notes/` and the four `docs/` root files are named nowhere - why it matters - the contract's `## Notes line formats` makes `touched:` the declared set `commit-task.sh --notes` stages, so an undeclared path riding into a commit is exactly the case that declaration exists to catch; the decisions file's `C1` closed this class of fold-in for `Inventory every rule the review contract carries today` (Task 1), but it names the 535 `docs/.workflows/` files and the `.claude/rules/_common.md` line, not these paths, so nothing on record says the user meant this set to go - how to fix - add one `touched: <path>` line per deleted path to `docs/.workflows/2026-09-19-slim-review-contract-and-kind-aware-task-gate/implementation/task-02-notes.md` with the reason on the line above, or, where the deletions were not the user's own pre-build tree state, restore the paths from `543615f` and re-commit without them.

## Notes

NOTE: the `UNDERSPECIFIED:` line on contract line width calls a ~200-column wrap a departure from "the repo's ~100"; it is not. `superdev/references/plan-review-checklist.md` runs to 220 columns and `changelog-entry-format.md` to 210, and every build agent file runs far wider, so the choice follows the pattern this repo already uses for agent-facing prose and raises nothing.

## Assessment

The contract compression itself holds - 225 lines against the 230 bound, the twelve headings unchanged in name and order, no adoption rationale left in the file, the working-directory exclusion owned by `## Verdict rules` and named for the per-task gate in the preamble, both `moved` rows landed in `superdev/CLAUDE.md` `## Contracts & invariants`, and the inventory reconciled - but the commit carries 28 deletions no line of the notes declares.

VERDICT: FAIL
