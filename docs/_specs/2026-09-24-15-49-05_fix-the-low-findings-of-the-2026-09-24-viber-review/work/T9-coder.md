# T9 - coder notes

- Leading `./` is now stripped at four sites: `plan_files()`, `claimants()` and the main task-Files
  awk block (all via `sub(/^\.\//, "", p)`, matching `plan-index.sh:368`'s single-strip
  contract - not repeated `./..//` collapsing), plus every caller-supplied path argument
  (`--with`, the path half of `--defer` entries, a fix commit's file list, and the shared
  `--repair`/`--chore`/`--qa`/`--e2e` loop) via bash `${f#./}`.
- The real bug `claimants()` normalization fixes: without it, a plan `Files:` entry spelled
  `./src/a.ts` was invisible to a later `--with src/a.ts` ownership check (string mismatch), so an
  open task's file could be silently stolen into another task's commit instead of refused. Proved
  red first with that exact scenario before the fix.
- The trail glob fix is `review-$task_id-[0-9]*.md` (was `review-$task_id-*.md`): the round after
  the id is always numeric, so this still matches `review-T1-12.md` but no longer matches a
  differently-shaped id sharing the same prefix (`review-T1-b-1.md`).
- Verification: `node --test tests/viber/commit-task.test.ts` - 72/72 pass; full
  `node --test --test-concurrency=4 "tests/viber/*.test.ts"` - 384/384 pass.
- `docs/reviews/2026-09-24_viber-review.md` already carried an unrelated uncommitted edit at
  session start (not in this task's Files line) - left untouched, per the task's file map.
