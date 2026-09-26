- The `--chore` commit (memory+rules paths) and the generic "agent of this step DENIED" rule stay in
  the main body, not in a fragment: they must fire regardless of which of memory/rules/qa loaded,
  and a fragment-only copy would vanish whenever its own switch was off.
- Step 3's task-list entries and step 6's `--chore`/`TaskUpdate` timing rely on the model having
  already read the whole document (all `!` preloads run at skill-load, before step 1 executes), so
  "one entry per close part loaded below" needs no switch check of its own - an empty preload leaves
  no dispatch text to open an entry for.
- Verified live against this repo's own `.claude/viber.yml` (`qa: false`, others `true`):
  `switch-text.sh qa ...` prints 0 lines while memory/rules/cleanup print their full fragment,
  confirming DoD.2/DoD.3 empirically, not just by inspection.
- `qa.true.md` folds in the `--qa` commit and the `qa.e2e.md` summary-line hint that used to sit in
  step 7's final-summary paragraph; step 7's paragraph no longer mentions it.
