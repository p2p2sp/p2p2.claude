# `tdd` work order

Single source of truth for the `tdd` work-order mode — `coder` SKILL.md Step 2/4 points here. The coder reads this file ONLY when the task file's `## Mode` is literally `tdd`; the other `references/mode-*.md` do not apply.

The Red-Green-Refactor **inner loop** runs on `unit`-Kind entries in `## Tests` **only**. These are the fast tests that drive the design one decision branch at a time. **Invoke the `superdev:dev-tdd` skill BEFORE writing any test or production code** — it enforces the iron law and the VERIFY-RED / VERIFY-GREEN checkpoints. The decomposer maps one `unit` intent per decision branch / failure mode named in `## Deliverable` (1:1), so the inner loop walks the branches.

`integration` and `e2e` entries are **slow tests written after-green** — they are NOT in the RGR inner loop and are NOT re-run per cycle. They are written once after every `unit` test is green and the `Deliverable`'s production code is complete, and they run **once at the task gate** (the runner exercises them there). Never pull a slow integration/e2e test into the per-branch RGR loop.

## Inner loop — per `unit`-Kind test in `## Tests`, in the order they appear

1. Dispatch the precise test filename and method name from the entry's `suggested location` + `naming per …` hint and the sibling test found in Step 3. Write the failing test. Mirror the structure and assertions of the sibling. Honor the `superdev:dev-tdd` skill's VERIFY-RED checkpoint — invoke `superdev:dev-runner` with the unit-scope command for just this test (single test or single file, not the full `## Task gate`) and confirm the verdict is `FAIL` for the expected reason. If it greens unexpectedly, the test is mis-written.
2. Write the minimum production code to turn the test green. Honor the `superdev:dev-tdd` skill's VERIFY-GREEN checkpoint — re-invoke `superdev:dev-runner` with the same unit-scope command and confirm the verdict is `PASS`.
3. Refactor only when duplication is real, then re-verify via `superdev:dev-runner` (same unit-scope command) to confirm still green.

After every `unit` test is green:

4. Write each `integration` test, then each `e2e` test. No Red-Green-Refactor cycle for these — they verify end-to-end behavior against the running stack and run once at the task gate.

## Port-seam split (when this task is a port-seam logic task)

When the decomposer split a port-dependent task into a logic task and a separate adapter task (see its Step 3 port-seam rule), the `## Touches` + `## Tests` of *this* task tell you which side you are on:

- **Logic task** — the unit tests drive the logic against an **in-memory fake** of the port (interface / abstraction) declared in the test project, never against the real external resource. The RGR inner loop stays fast and offline; do not reach for the concrete adapter or a live DB / HTTP / queue / clock / filesystem. The seam (the port interface) is the unit boundary; mirror the host's existing fake/stub pattern found in Step 3.
- **Adapter task** — this is the concrete implementation of the port. Its `## Mode` will be `code-first-then-tests` or `e2e-first` (not `tdd`); follow that mode's work order. Its `integration` / `e2e` tests verify the real resource at the task gate; there is no per-branch RGR loop for the adapter.

If a host `.claude/rules/` testing convention prescribes a different fake / seam / layering strategy, follow it (Step 3 reads those rules) — the host rule wins over this default.

## Mode-specific notes

- The `superdev:dev-tdd` skill applies in THIS mode only. The VERIFY-RED / VERIFY-GREEN checkpoints inside this inner loop are unit-scope, per-phase, and do **not** consume the Step 5 pre-`PASS` gate 3-cap — the two budgets are independent.
