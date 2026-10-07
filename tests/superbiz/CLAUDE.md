# tests/superbiz - regression suite for superbiz's report builder

Owns the tests of `superbiz/skills/idea-validator/scripts/build_report.mjs` and their shared fixture. It does not own the script, the skill around it, nor the helpers in `tests/harness/`.

## Relationships

- Both test files import `validate`, `mergeLabels`, `render` and `main` straight from `build_report.mjs` and call them in-process: nothing is spawned.
- `fixture.ts` holds `validReport()` (a report-data.json passing every check) and `capture()` (a `log` for `main` that keeps the printed lines); it registers no test.
- `build_report.unit.test.ts`: unit tier, no fixture on disk. `build_report.test.ts`: the `main` cases that read and write files through `withTempDir`, integration tier, CI only.

## Contracts

- `RULES` in `build_report.unit.test.ts` holds one row per validation rule: the mutation applied to `validReport()` and the problem text it must produce.
- `main(argv, log)` returns the exit code and never sets `process.exitCode`; the script sets it only when run as the process entry, so importing it stays side-effect free.

## Commands

- Unit tier of this suite: `node --test "tests/superbiz/*.unit.test.ts"`.
- The integration file, as CI runs it: `CI=true node --test tests/superbiz/build_report.test.ts`.

## Change together

- A new or changed check in `build_report.mjs` gets its row in `RULES`; a new required field also goes into `validReport()`, or every other case starts failing on it.
