## Runs
- node --test tests/superdev/read-config.test.ts -> tests 16, pass 16, fail 0
- node --test tests/superdev/bootstrap.test.ts -> tests 9, pass 9, fail 0

## Deltas
- Approach step 5 also required extending the pre-existing "idempotence" test in bootstrap.test.ts (its hardcoded second-run stdout array of grep'd switch lines) beyond the `seed-when-absent` line the Files annotation named, since the grep alternation now matches all nine documented keys against the now-nine-line seeded config.yml - otherwise that test would fail on the extra qa/e2e-ui/e2e-api lines the grep now returns. Still inside tests/superdev/bootstrap.test.ts, already listed under Files.
- UNDERSPECIFIED: config.yml's exact new-line wording was fixed by Approach step 2 verbatim; the only decision left was column alignment for the three new keys (`qa:`, `e2e-ui:`, `e2e-api:`) - padded so `false` starts at the same column as the six existing keys (col 11), matching the file's existing layout.
no other deviations
