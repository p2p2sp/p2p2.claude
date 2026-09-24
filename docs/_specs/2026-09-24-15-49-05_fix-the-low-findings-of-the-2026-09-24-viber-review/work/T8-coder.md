# T8 - coder notes

- `--skip`/`--defer` id checks now share a new `task_ids_of()` helper (scoped to inside TASK
  blocks only) with `grep -Fxq`, so a `## Contracts` heading (`### C3 - <name>`) or a regex
  metacharacter in the id can never be mistaken for a task id - the pre-existing bug was that the
  old `--skip`/`--defer` checks ran a plain `grep -E` over the WHOLE file, not scoped to TASK
  blocks, so a Contracts appendix heading (shaped exactly like a task's) matched too.
- Trap for the next session: a bare `.*`/`*` argv value reaching a bash script through
  `spawnSync("bash", [...])` on Windows gets glob-expanded by the MSYS runtime before the script
  ever sees it (already noted in `plan-path.test.ts`). Proved DoD.2 with `"T."` (a regex
  metachar, no glob chars) instead of the finding's literal `.*` example - same underlying
  fixed-string contract, portable across OS.
- `--skip` on an already-done task now checks `done_ids()` before `mark_status`, exiting 2 with
  `error: task '<id>' is already done - it cannot be skipped` (new behavior, C4).
- C3's anchored marker regex (`^[[:space:]]*<!--...-->[[:space:]]*$`) is now applied at all four
  parse sites in this file: `task_total`, `plan_files`, `claimants`, `task_ids_of`, and the main
  `parsed` awk block - kept identical across all five so a future marker-shape change only needs
  one pattern edited five times, not reinvented per site.
- Full `node --test tests/viber/commit-task.test.ts` run: 66/66 pass.
