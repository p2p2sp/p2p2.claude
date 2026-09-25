# Review T4 - round 1

Verification `node --test tests/viber/plan-path.test.ts tests/viber/config.test.ts` passes (172/172). DoD.1-DoD.5 are implemented in `viber/scripts/run-branch.sh` (`branch_entry`, `branch_is_base`, `branch_land`) and `viber/scripts/config.sh`, and each clause has a test. The findings below are test-strategy rules tagged `(blocking)`: "Every test ... carries one act" and "No control flow in a test body - no branch, no loop, no switch. Cases belong in the framework's parameterised form, one row each."

## Blocking

1. tests/viber/config.test.ts:404 - The DoD.5 test uses a `for (const body of [...])` loop in its body, plus `if (body) writeConfig(...)` and `body ? "allowed" : "off"` branches. That puts three acts into one test and adds control flow. Fix: switch to the file's existing parameterised form, a top-level `for (const [label, body, mode] of [...]) test(...)` with one row per case (no file, flat keys, a work entry). Each row should carry its expected mode, so there is no branching inside the test body. For the no-file row, use a separate test or a row whose body is written unconditionally.

2. tests/viber/plan-path.test.ts:1707 - The DoD.2 test "several entries and a plan recording no work: key ..." loops over `[["allowed", ...], ["required", []]]` inside one test body, which gives two acts in one test. Fix: move the rows into a top-level parameterised `for (...) test(...)`, one test per mode.

3. tests/viber/plan-path.test.ts:1763 - The DoD.4 test "a plan naming develop is refused as the base, a plan naming main is not" loops over two rows inside its body and branches with `if (status === 6) ... else ...`. Fix: split it into two tests, or a parameterised row per case that carries its own expected assertion data. The body must not branch.
