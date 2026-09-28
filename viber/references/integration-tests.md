# Integration tests

What an integration test runs against and how the layer stays fast. A rule ending in `(blocking)` is a blocking finding for a reviewer.

## What it runs against

- An integration test covers one adapter - the code that talks to one external dependency - against that real dependency, started disposable for the run, never against an in-process substitute; an entry point that calls data access directly counts as the adapter. (blocking)
- Real only at the boundary under test. Every other collaborator the path drags in is substituted by its cheapest honest stand-in. An integration test pays for the wiring it asserts and nothing else. (blocking)
- An integration test that asserts a case a unit or component test already proves is a finding: it proves only what the real dependency itself can reveal. (blocking)

## Time matters

- The layer's wall-clock is a design constraint: a slow layer is a missing strategy, never the price of real dependencies.
- Start each dependency once per run, on a random port, and apply its schema once, then reuse it across every test it fits; never restart it between tests. (blocking)
- Reset state between tests by the cheapest honest means - a rolled-back transaction, a truncate, a namespace of its own per test - so reuse costs no test its independence: each run's own disposable instance keeps the sharing safe.
- Wait for a dependency on its readiness signal, never on a fixed delay.
- Run the tests in parallel wherever the reset keeps them independent.
