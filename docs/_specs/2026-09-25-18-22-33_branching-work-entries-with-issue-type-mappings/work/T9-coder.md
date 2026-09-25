# T9 - coder notes

- Template's `branching:` group now nests `mode`, a `work.main` entry (base/name/target, all `main`,
  pattern `'{type}/{slug}'` - `{issue}` dropped since Part 1 only fills `{type}`/`{slug}`) and a
  commented, indented `issue-type-mappings` example (`# bug: main`), so bootstrap's whole-group
  append still carries every line verbatim.
- `bootstrap.sh` was left untouched (out of T9's Files): its merge only ever checks whether the
  top-level key `branching` exists and copies the whole block when missing, so it needed no change
  for the new nested shape - confirmed by re-running the full bootstrap suite.
- Only one assertion in bootstrap.test.ts referenced the block's literal content (the "older
  version" merge test); the other tests that embed a pre-existing `branching:` block use the OLD
  flat shape on purpose (they test that an already-present top-level key is left untouched
  regardless of its contents) and needed no edit.
- config.sh/run-branch.sh still read the old flat `branching.base`/`branching.name` fields (T4's
  scope) - `tests/viber/config.test.ts`'s "shipped template" test only checks switches/dirs/tiers,
  not branching, so it is unaffected by the schema change.
- Full `tests/viber/*.test.ts` suite (638 tests) is green; two flaky-looking failures on a first
  concurrent run (plan-path.test.ts, unrelated to the template) did not reproduce on a clean rerun.
