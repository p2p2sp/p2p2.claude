# Integration tests

What an integration test runs against and how the layer stays fast. A rule ending in `(blocking)` is a blocking finding for a reviewer.

## What it runs against

- An integration test runs against the real dependency, started disposable per run - containers wherever the host has them - never against an in-process substitute. (blocking)
- Real only at the boundary under test. The database, queue or network the task exists to exercise stays real; every other collaborator the path drags in is substituted by its cheapest honest stand-in - deliberately slow work first, and nothing that could simply be constructed. An integration test pays for the wiring it asserts and nothing else. (blocking)

## Time matters

- The layer's wall-clock is a design constraint: a slow layer is a missing strategy, never the price of real dependencies.
- Start each dependency once per run and apply its schema once, then reuse it across every test it fits; never restart it between tests. (blocking)
- Reset state between tests by the cheapest honest means - a rolled-back transaction, a truncate, a namespace of its own per test - so reuse costs no test its independence. The `Exclusive` slot makes the reuse safe: the layer runs alone, so it is not the sharing `test-strategy.md`'s isolation rule forbids.
- Wait for a dependency on its readiness signal, never on a fixed delay.
- Run the tests in parallel wherever the reset keeps them independent.
