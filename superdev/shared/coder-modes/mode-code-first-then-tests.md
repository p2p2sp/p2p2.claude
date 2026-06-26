# `code-first-then-tests` work order

Single source of truth for the `code-first-then-tests` work-order mode — `coder` SKILL.md Step 2/4 points here. The coder reads this file ONLY when the task file's `## Mode` is literally `code-first-then-tests`; the other `references/mode-*.md` do not apply.

Write the production code for the `## Deliverable` first, then write every test listed in `## Tests`. The test purpose here is post-hoc confirmation, not specification — **the `superdev:tdd` skill does NOT apply in this mode.**

## Work order

1. Write the production code for the `## Deliverable`, editing only files in `## Touches`.
2. Then for each entry in `## Tests`, dispatch the precise filename + method name (from the entry's `suggested location` + `naming per …` hint and the sibling test found in Step 3) and write the test asserting on the observable outcome stated in the entry's intent. Order: `integration` first if present, then `e2e`, then any listed `unit` smoke-tests.
3. The `superdev:tdd` skill is NOT used in this mode — the tests confirm code that already exists; there is no Red-Green-Refactor cycle.
