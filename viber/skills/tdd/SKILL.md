---
name: tdd
description: >-
  Red-Green-Refactor discipline for a plan task marked `TDD: required`: iron law (no production code without a failing test first - violations are deleted and restarted), mandatory VERIFY-RED and VERIFY-GREEN checkpoints, no horizontal slicing, per-cycle stop-condition checklist. Invoked by `viber:task-coder` before the first line of production code, never directly.
user-invocable: false
---

# Test-Driven Development

Write the test first. Watch it fail. Write the minimal code that passes. Refactor. If you did not watch the test fail, you do not know whether it tests the right thing. Violating the letter of the rule is violating its spirit.

## Iron Law

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

Production code that exists before a failing test for it MUST be deleted in its entirety - no keeping it as reference, no adapting it line by line, no "just looking at it" while writing the test, no exceptions. The only way back to compliance is delete-then-restart: drop the unguarded code, write the failing test, watch it fail for the right reason, then rewrite the production code minimally to turn the test green.

Applies to every production language and every layer (backend, frontend, infrastructure, scripts) - whether adding, changing, fixing or restoring behavior.

`TDD: required` on the task IS the authorization, decided before this skill loads: nothing reopens it here. "It's just a quick fix", "the change is trivial", "no one will notice" are refused, not weighed.

## Red-Green-Refactor cycle (mandatory)

Execute the cycle in this exact order for each delivered behavior. VERIFY RED and VERIFY GREEN are part of the cycle, not optional sanity checks - skipping either invalidates the work.

### RED - write one failing test

- One behavior, one test. Real code on both sides; mocks only at system boundaries.
- The driving test is a unit test: no database, queue, broker, browser or network. A behavior you cannot make fail without the real service needs its seam built first.
- Name the test after a behavior, not a structure: "user can checkout with valid cart", never "constructor returns instance". An "and" in the name means split it.
- Public interface only - no private methods, no internal collaborators in assertions.

### VERIFY RED - run it and watch it fail correctly (mandatory)

- Actually run the test - never simulate it mentally. The point is the observation, not the prediction.
- The test MUST fail, and fail because the behavior is missing - not from a syntax error, missing import, typo in the test, harness misconfig or wrong fixture path.
- Passes immediately? It tested something already true, or tested nothing. Restart RED with a sharper assertion that exercises the not-yet-implemented behavior.

### GREEN - write the simplest code that passes

- Only enough code to pass THIS test. No over-engineering, no anticipating future tests, no opportunistic refactor of existing code.
- A hardcoded return is acceptable on the first cycle; the next RED forces generalization.

### VERIFY GREEN - confirm the cycle's own test file passes, output pristine (mandatory)

- The target test passes, and so does every test already sitting in that same test file - that file, not the whole suite, is what a cycle proves green.
- The task's own `Verification` is the end-of-task proof, and the widest run a cycle ever triggers. The whole suite belongs to whoever closes the run: other tasks are live in the same tree, so a suite run from here reports failures that are not yours to fix.
- Output is pristine: no new warnings, no new lint errors, no stray prints, no flaky failures hidden behind retries. Not pristine? Something broke - fix it before the next cycle. A "small" regression is still a regression.

### REFACTOR - only on GREEN, only for real duplication

- Tests stay green at every step. Refactor concrete duplication, not speculative cleanness.
- Never refactor while RED - get to GREEN first, then choose to refactor or move on.

## Per-cycle stop-condition checklist

After each RED -> VERIFY-RED -> GREEN -> VERIFY-GREEN -> (optional REFACTOR), every box below MUST be checkable:

- [ ] The test names a behavior and uses the public interface only - no private calls, no internal-collaborator mocks, no asserting call counts or order.
- [ ] It ran with no database, queue, broker, browser or network behind it.
- [ ] I watched it fail in VERIFY RED, for the missing behavior and not for a typo, an import miss or a harness error.
- [ ] I wrote the simplest code that turned it green - nothing speculative.
- [ ] VERIFY GREEN passed: the target test and the rest of its own file green, output pristine.
- [ ] Any refactor preserved green at every step and removed real duplication.

Can't check every box? TDD skipped. Delete the new code, start over.

## Anti-patterns (forbidden)

Wrong moves and structures, distinct from the excuses the Iron Law refuses.

- Horizontal slicing - all tests first, then all implementation. It produces tests for imagined behavior, decoupled from the code that will actually exist. Always work vertical: one test -> one implementation -> repeat, each test responding to the previous cycle's findings.
- Mocking internal collaborators - couples tests to implementation, so they break on a refactor that changed no behavior. Mock only at system boundaries.
- Testing implementation details - private methods, call counts, call order, internal data shapes. The diagnostic: a test that breaks on an internal refactor with no behavior change was testing implementation, not behavior.

## Workflow

1. Plan. Decide the public interface and which behaviors matter before coding. Design for testability and for deep modules - small interface, deep implementation. List the behaviors to test, not implementation steps; you cannot test everything, so prioritize critical paths and complex logic over every edge case. The spec and the task file are the approval: where they leave a choice open, take it; where they leave the behavior under test unnameable, stop and report the task failed with that reason instead of guessing an interface.
2. Tracer bullet. Run the full cycle on ONE test for ONE behavior first - it proves the path works end to end before scaling up.
3. Loop. Repeat the full cycle for each remaining behavior, running the stop-condition checklist after each.
4. Refactor. Once all tests are green, refactor only code this task wrote. Record what the new code reveals about existing code in the coder's notes file, not as a refactor.
