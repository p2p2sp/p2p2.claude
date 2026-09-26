# Test strategy

How a test is written. Where two rules pull against each other, catching a real regression and surviving a refactor win over speed and convenience. A rule ending in `(blocking)` is a blocking finding for a reviewer.

- Never introduce a test framework the project does not have.
- An end-to-end test - a browser, or the running application driven from outside - is written or run only by a task whose acceptance criterion states that the user asked for one in their own words. (blocking)
- Never tested: accessors, trivial constructors, data holders without behaviour, 1:1 mappings, framework behaviour, third-party library internals, an assertion true by construction. Name the regression the test would catch; no answer means no test.
- Every test can fail on a regression, asserts something and carries one act: several actions in one body means several tests. (blocking)
- Isolation: no sleep, no fixture or other mutable state shared across tests, no dependence on execution order, no fixed port or other machine-wide resource, no database shared with another task's run. Several coders verify in the same tree at once. (blocking)
- Never pay for a collaborator the scenario does not assert. One whose work is slow or heavy - hashing, key derivation, retry backoff, waits, rendering, a large computation - gets a stub or fake returning what the scenario needs, or a cheap configuration of the real one where it offers one: a login test stubs the password hasher. Only that collaborator's own tests use the real thing. (blocking)
- No control flow in a test body - no branch, no loop, no switch. Cases belong in the framework's parameterised form, one row each. (blocking)
- Assert on what a caller observes: the returned value, the public state, the side effect through its own surface, the raised error. Never on log output, and never on data the test did not arrange itself. (blocking)
- Construct whatever can be constructed. A double for a value, a record or a single config lookup hides the real shape.

Three shapes raise none of the blocking findings except the end-to-end rule: an end-to-end scenario whose steps model one user flow, a snapshot assertion, and a loop inside a property-based generator - control flow in the property body still counts. A test taking one of these carries a comment naming which; an undocumented one is a finding.
