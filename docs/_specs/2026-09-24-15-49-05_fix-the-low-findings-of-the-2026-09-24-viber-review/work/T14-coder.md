### T14 coder notes

- `description:` dropped "one-line" (now "returns a verdict") to stop contradicting the
  multi-line `FAIL`/`DENIED` output shapes below it.
- Removed the `FAILED: <count>` return line entirely (implementor never read it, and it wasn't
  in `viber/CLAUDE.md`'s output-vocabulary list); `VERDICT:` + `REPORT:` are now the full FAIL
  return.
- Report-write instruction changed from "write one line to the report path (... otherwise one
  line per failure ...)" to "write to the report path (...)" - keeps "one line per failure" as
  the per-failure format without calling the whole report one line.
- `viber/CLAUDE.md:38`'s output-vocabulary list already omitted `FAILED:`, so no follow-on edit
  needed there; it's out of this task's `Files` regardless (memory layer, per the run's out-of-
  scope note).
- Verified: `grep -c 'FAILED:'` -> 0 on both named files; `lint_skill.sh` on `test-runner.md` ->
  `FAIL=0 WARN=0`.
