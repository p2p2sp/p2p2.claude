# Test strategy

Where a change's proof lives, how tasks are sliced so it can live there, and what never gets a test. Where two rules pull against each other, catching a real regression and surviving a refactor win over speed and convenience. A rule ending in `(blocking)` is a blocking finding for a reviewer.

## Where the proof lives

- Every acceptance criterion is proven by unit-level tests inside the task that delivers it. A criterion whose only proof is an integration task is mis-sliced: its behaviour sits behind a dependency instead of behind a seam. (blocking)
- An integration task proves wiring and nothing else. What it exercises is already green without it.
- Unit tests outnumber integration tests by a wide margin. An integration layer growing with the criteria instead of with the boundaries the change crosses means the seams were never built.
- Unit tasks first, integration tasks last, so the unit tasks run concurrently, none of them holding an external resource.
- A host with no test layer - no test tooling, or nothing with runtime behaviour to assert - gets `TDD: none` on every task and artefact checks for `Verification`. Never introduce a test framework the project does not have; name the boundary as unproven instead.

## What runs when

- A task runs its own `Verification` and nothing wider. The full suite belongs to the build's close: other tasks are live in the same tree.
- An integration task runs its own integration test, alone in its `Exclusive` slot. The integration layer as a whole runs once more in the close.

## Slicing

- Slice by behaviour, never by layer: one task carries one behaviour through every layer it needs, inside its own file map. A plan cut by layer where a behaviour slice was available proves no criterion until its last task lands and serialises the build. (blocking)
- The seam is a deliverable, not an improvisation. Where a behaviour touches a database, queue, clock or network, the port and the substitute its tests use belong to the file map of the first task that needs them, and the port's shape is a contract block.
- A deliverable with no decision inside it - a data shape, a re-export, a registration, a 1:1 mapping, a constant table - carries `TDD: none` and verifies its artefact. A test written for it asserts the language, not the change.

## Writing tests

- Never tested: accessors, trivial constructors, data holders without behaviour, 1:1 mappings, framework behaviour, third-party library internals, an assertion true by construction. Name the regression the test would catch; no answer means no test.
- Every test can fail on a regression, asserts something and carries one act: several actions in one body means several tests. (blocking)
- Isolation: no sleep, no fixture or other mutable state shared across tests, no dependence on execution order, no fixed port or other machine-wide resource, no database shared with another task's run. Several coders verify in the same tree at once. (blocking)
- Never pay for deliberately slow code the test does not assert - key derivation, retry backoff, waits. In a unit test lower its cost through configuration and keep its behaviour; the one test asserting that cost uses the real thing.
- No control flow in a test body - no branch, no loop, no switch. Cases belong in the framework's parameterised form, one row each. (blocking)
- Assert on what a caller observes: the returned value, the public state, the side effect through its own surface, the raised error. Never on log output, and never on data the test did not arrange itself. (blocking)
- Construct whatever can be constructed. A double for a value, a record or a single config lookup hides the real shape.
- An integration test runs against the real dependency, started disposable per run - containers wherever the host has them - never against an in-process substitute. (blocking)
- Real only at the boundary under test. The database, queue or network the task exists to exercise stays real; every other collaborator the path drags in is substituted by its cheapest honest stand-in - deliberately slow work first, and nothing that could simply be constructed. An integration test pays for the wiring it asserts and nothing else. (blocking)
- Build the expensive fixture once per run and reuse it across the tests it fits, resetting state between them. The `Exclusive` slot makes that safe: the layer runs alone, so reuse inside it is not the sharing the isolation rule forbids.

Three shapes raise none of the blocking findings: an end-to-end scenario whose steps model one user flow, a snapshot assertion, and a loop inside a property-based generator - control flow in the property body still counts. A test taking one of these carries a comment naming which; an undocumented one is a finding.
