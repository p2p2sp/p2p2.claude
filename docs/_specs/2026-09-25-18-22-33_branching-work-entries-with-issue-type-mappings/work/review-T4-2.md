# Review T4 - round 2

Verification `node --test tests/viber/plan-path.test.ts tests/viber/config.test.ts` passes (176/176). The three round-1 findings are fixed. DoD.1-DoD.5 are implemented (`branch_entry`, `branch_is_base`, `branch_land` in `viber/scripts/run-branch.sh`; the plain block in `viber/scripts/config.sh`), and each clause has a test that would fail without it. The creation-under-a-C1-error reason is T6's DoD.3, so leaving it out here is correct.

## Blocking

1. tests/viber/plan-path.test.ts:1416 - This task rewrote the test "an entry name pattern with a separator at either edge never leaves a leading or trailing / on landing" (new name, new rows `/{slug}` and `{slug}/`, a new work-entry config). It still runs a `for (const [name, expected] of [...])` loop in its body, which means two landings (two acts) in one test. That breaks two test-strategy rules tagged `(blocking)`: "No control flow in a test body" and "Every test ... carries one act". Fix: move the rows into a top-level parameterised form, `for (const [name, expected] of [...] as const) test(\`... ${name} ...\`, () => { ... })`, with one test per pattern, the same way the DoD.2 rows are now written at line 1442.
