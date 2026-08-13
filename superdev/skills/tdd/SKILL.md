---
name: tdd
description: >-
  Test-Driven Development discipline expert. Use for a plan task marked `TDD: required`, or when the user explicitly asks for test-first work. Enforces Red-Green-Refactor (iron law: no production code without a failing test first - violations are deleted and restarted), mandatory VERIFY-RED and VERIFY-GREEN checkpoints, no horizontal slicing, and a per-cycle stop-condition checklist. Triggers include "TDD", "test first", "red-green-refactor", "RGR". Do NOT use for a task marked `TDD: none`, for adding tests to already-written code, or as a default gate on every code change.
user-invocable: false
---

# Test-Driven Development

## Overview

Write the test first. Watch it fail. Write the minimal code that passes.

**Core principle:** if you didn't watch the test fail, you don't know whether it tests the right thing.

**Violating the letter of the rule is violating the spirit of the rule.**

## Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

Production code that exists before a failing test for it MUST be deleted in its entirety - no keeping it as reference, no adapting it line-by-line, no "just looking at it" while writing the test, no exceptions. The only way back to compliance is **delete-then-restart**: drop the unguarded code, write the failing test, watch it fail for the right reason, then rewrite the production code minimally to turn the test green.

Applies to every production language and every layer (backend, frontend, infrastructure, scripts) - whether adding, changing, fixing, or restoring behavior.

## Red-Green-Refactor cycle (mandatory)

Execute the cycle in this exact order for each delivered behavior. **VERIFY RED** and **VERIFY GREEN** are part of the cycle, not optional sanity checks - skipping either invalidates the work.

### RED - write one failing test

- One behavior, one test. Real code on both sides; mocks only at system boundaries.
- Name the test after a behavior, not a structure: "user can checkout with valid cart", never "constructor returns instance". An "and" in the name means split it.
- Public interface only - no private methods, no internal collaborators in assertions.

### VERIFY RED - run it and watch it fail correctly (mandatory)

- **Actually run the test - never simulate it mentally.**
- The point of VERIFY RED is the observation, not the prediction.
- The test MUST fail, and fail because the behavior is missing - not from a syntax error, missing import, typo in the test, harness misconfig, or wrong fixture path.
- Passes immediately? It tested something already true (or tested nothing). Restart RED with a sharper assertion that exercises the not-yet-implemented behavior.
- Without watching it fail for the right reason, the test's actual coverage is unknown.

### GREEN - write the simplest code that passes

- Only enough code to pass THIS test. No over-engineering, no anticipating future tests, no opportunistic refactor of existing code.
- A hardcoded return is acceptable on the first cycle; the next RED forces generalization.

### VERIFY GREEN - confirm all tests pass, output pristine (mandatory)

- The target test passes; every previously-passing test still passes - no regressions.
- Output is pristine: no new warnings, no new lint errors, no stray prints, no flaky failures hidden behind retries.
- Not pristine? Something broke - fix it before the next cycle. A "small" regression is still a regression.

### REFACTOR - only on GREEN, only for real duplication

- Tests stay green at every step. Refactor concrete duplication, not speculative cleanness.
- Never refactor while RED - get to GREEN first, then choose to refactor or move on.

## Per-cycle stop-condition checklist

After each RED → VERIFY-RED → GREEN → VERIFY-GREEN → (optional REFACTOR), every box below MUST be checkable:

- [ ] The test names a behavior, not a structure or an implementation step.
- [ ] The test uses the public interface only - no internal-collaborator mocks, no private-method calls, no asserting call counts or order.
- [ ] I watched the test fail in VERIFY RED and confirmed the failure reason was the missing behavior (not a typo, import miss, or harness error).
- [ ] I wrote the simplest possible code to turn the test green - no speculative features, no anticipating the next test.
- [ ] VERIFY GREEN passed: target test green, all other tests still green, output pristine.
- [ ] Any refactor preserved green at every step and removed real duplication.

**Can't check every box? TDD skipped. Delete the new code, start over.**

## Anti-patterns (forbidden)

Wrong *moves and structures* - distinct from the willpower excuses below.

- **Horizontal slicing** - writing ALL tests first, then ALL implementation. This produces tests for *imagined* behavior, decoupled from the code that will actually exist. Always work vertical: one test → one implementation → repeat, each test responding to the previous cycle's findings.

  ```
  WRONG (horizontal):              RIGHT (vertical):
    RED:   test1 .. test5            RED→GREEN: test1 → impl1
    GREEN: impl1 .. impl5            RED→GREEN: test2 → impl2
                                     RED→GREEN: test3 → impl3 …
  ```

- **Test that passes immediately on RED** - it tested something already true, or nothing. Restart RED with a stronger assertion that exercises the not-yet-implemented behavior.
- **Mocking internal collaborators** - couples tests to implementation; they break on refactor without behavior change. Mock only at system boundaries.
- **Testing implementation details** - private methods, call counts, call order, internal data shapes. Test observable behavior through the public interface. The diagnostic: a test that breaks on an internal refactor with no behavior change was testing implementation, not behavior.

## Bypass authorization

The Iron Law applies always - **UNLESS** the user explicitly authorizes a specific bypass for a specific change, with reasoning. Implicit signals ("it's just a quick fix", "we're behind schedule", "no one will notice") do not count and MUST be refused.

Acceptable bypass authorization:
> "Skip TDD for this one-line constant rename - no behavior change, just propagating the new name."

Unacceptable:
> "Just write it, we don't need tests for this."

If the request is ambiguous, stop and ask. Never assume authorization.

## Workflow

1. **Plan.** Decide the public interface and which behaviors matter *before* coding. Design for testability and for deep modules - small interface, deep implementation. List the behaviors to test (not implementation steps); you can't test everything, so prioritize critical paths and complex logic, not every edge case. Working interactively, confirm the interface and priorities with the user and get approval.
2. **Tracer bullet.** Run the full cycle on ONE test for ONE behavior first - it proves the path works end-to-end before scaling up.
3. **Loop.** Repeat the full cycle for each remaining behavior, running the stop-condition checklist after each.
4. **Refactor.** Once all tests are green, look for refactor candidates and consider what the new code reveals about existing code.
