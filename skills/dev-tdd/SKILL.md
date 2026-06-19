---
name: dev-tdd
description: >-
  Test-Driven Development discipline expert. Always use this BEFORE writing any production code or test code — for new features, bug fixes, refactors, or behavior changes. Enforces Red-Green-Refactor (iron law: no production code without a failing test first), mandatory VERIFY-RED and VERIFY-GREEN checkpoints, and a per-cycle stop-condition checklist. Triggers include "TDD", "test first", "red-green-refactor", "RGR", "failing test", "test before code", or any plan phase with `Mode: tdd`. Do NOT use for adding tests to already-written code — that is code-first-then-tests mode, not TDD. Trigger applies in any language and to descriptive phrasing too.
user-invocable: false
---

# Test-Driven Development

## Overview

Write the test first. Watch it fail. Write the minimal code that passes.

**Core principle:** if you didn't watch the test fail, you don't know whether it tests the right thing.

**Violating the letter of the rule is violating the spirit of the rule.**

## Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

Production code that exists before a failing test for it MUST be deleted in its entirety — no keeping it as reference, no adapting it line-by-line, no "just looking at it" while writing the test, no exceptions. The only way back to compliance is **delete-then-restart**: drop the unguarded code, write the failing test, watch it fail for the right reason, then rewrite the production code minimally to turn the test green.

Applies to every production language and every layer (backend, frontend, infrastructure, scripts) — whether adding, changing, fixing, or restoring behavior.

## Red-Green-Refactor cycle (mandatory)

Execute the cycle in this exact order for each delivered behavior. **VERIFY RED** and **VERIFY GREEN** are part of the cycle, not optional sanity checks — skipping either invalidates the work.

### RED — write one failing test

- One behavior, one test. Real code on both sides; mocks only at system boundaries (see `references/mocking.md`).
- Name the test after a behavior, not a structure: "user can checkout with valid cart", never "constructor returns instance". An "and" in the name means split it.
- Public interface only — no private methods, no internal collaborators in assertions.

### VERIFY RED — run it and watch it fail correctly (mandatory)

- **Actually run the test — never simulate it mentally.** Inside the `superdev:dev-code` skill, run it by invoking the `superdev:dev-run` skill (legacy mode — command only, never `Report path:`) with the **unit-scope command for just this test** (single test or single file — not the full `## Task gate`); outside the coder (main session, ad-hoc), run it directly or via the `superdev:dev-run` skill. The point of VERIFY RED is the observation, not the prediction.
- The test MUST fail, and fail because the behavior is missing — not from a syntax error, missing import, typo in the test, harness misconfig, or wrong fixture path.
- Passes immediately? It tested something already true (or tested nothing). Restart RED with a sharper assertion that exercises the not-yet-implemented behavior.
- Without watching it fail for the right reason, the test's actual coverage is unknown.

### GREEN — write the simplest code that passes

- Only enough code to pass THIS test. No over-engineering, no anticipating future tests, no opportunistic refactor of existing code.
- A hardcoded return is acceptable on the first cycle; the next RED forces generalization.

### VERIFY GREEN — confirm all tests pass, output pristine (mandatory)

- **Actually run the test — never simulate it mentally.** Inside the `superdev:dev-code` skill, re-invoke the `superdev:dev-run` skill with the same unit-scope command used in VERIFY RED; outside the coder, run it directly or via the `superdev:dev-run` skill.
- The target test passes; every previously-passing test still passes — no regressions.
- Output is pristine: no new warnings, no new lint errors, no stray prints, no flaky failures hidden behind retries.
- Not pristine? Something broke — fix it before the next cycle. A "small" regression is still a regression.

### REFACTOR — only on GREEN, only for real duplication

- Tests stay green at every step. Refactor concrete duplication, not speculative cleanness.
- Never refactor while RED — get to GREEN first, then choose to refactor or move on.

## Per-cycle stop-condition checklist

After each RED → VERIFY-RED → GREEN → VERIFY-GREEN → (optional REFACTOR), every box below MUST be checkable:

- [ ] The test names a behavior, not a structure or an implementation step.
- [ ] The test uses the public interface only — no internal-collaborator mocks, no private-method calls, no asserting call counts or order.
- [ ] I watched the test fail in VERIFY RED and confirmed the failure reason was the missing behavior (not a typo, import miss, or harness error).
- [ ] I wrote the simplest possible code to turn the test green — no speculative features, no anticipating the next test.
- [ ] VERIFY GREEN passed: target test green, all other tests still green, output pristine.
- [ ] Any refactor preserved green at every step and removed real duplication.

**Can't check every box? TDD skipped. Delete the new code, start over.**

## Anti-patterns (forbidden)

Wrong *moves and structures* — distinct from the willpower excuses below.

- **Horizontal slicing** — writing ALL tests first, then ALL implementation. This produces tests for *imagined* behavior, decoupled from the code that will actually exist. Always work vertical: one test → one implementation → repeat, each test responding to the previous cycle's findings.

  ```
  WRONG (horizontal):              RIGHT (vertical):
    RED:   test1 .. test5            RED→GREEN: test1 → impl1
    GREEN: impl1 .. impl5            RED→GREEN: test2 → impl2
                                     RED→GREEN: test3 → impl3 …
  ```

- **Test that passes immediately on RED** — it tested something already true, or nothing. Restart RED with a stronger assertion that exercises the not-yet-implemented behavior.
- **Mocking internal collaborators** — couples tests to implementation; they break on refactor without behavior change. Mock only at system boundaries. See `references/mocking.md`.
- **Testing implementation details** — private methods, call counts, call order, internal data shapes. Test observable behavior through the public interface. The diagnostic: a test that breaks on an internal refactor with no behavior change was testing implementation, not behavior. See `references/tests.md`.

## Common rationalizations

Every excuse to skip the failing-test-first step, and why it is wrong:

| Excuse | Reality |
|--------|---------|
| "I'll add tests later" | Tests written after assert what the code already does, not what it should — they freeze bugs in place. You never saw them catch anything. |
| "Just this once / it's a quick fix" | Every bypass is a precedent and erodes the next reviewer's trust in the suite. Rationalization, not a reason. |
| "I already manually tested it" | Ad-hoc ≠ systematic. No record, can't re-run on change, easy to forget cases under pressure. |
| "Deleting hours of work is wasteful" | Sunk cost. The unverified code you can't trust is the waste — it is technical debt. |
| "Keep it as reference, write tests first" | You will adapt it — that is testing after. Delete means delete. |
| "Too simple to test" | Simple code still breaks. The test costs seconds. |
| "Tests-after achieve the same goal" | Tests-after ask "what does this do?"; tests-first ask "what should this do?". Tests-after are biased by the implementation you wrote. |
| "The test is hard to write" | Listen to the test: hard to test = hard to use. Fix the design, not the test. |
| "TDD is dogmatic, I'm being pragmatic" | TDD finds bugs before commit and enables fearless refactoring. Shortcuts = debugging in production = slower. |
| "Existing code has no tests" | You are improving it — add tests for the behavior you touch. |

## Red flags — STOP and start over

Catch yourself thinking or doing any of these and the cycle is already broken:

- Production code written before its failing test
- A test written after the implementation
- A test that passes on its very first run
- Can't explain why the test failed
- "I'll add tests later" / "just this once"
- "Keep it as reference" / "adapt the existing code"
- "Already spent hours, deleting is wasteful"
- "TDD is dogmatic, I'm being pragmatic"
- "This case is different because…"

**All of these mean: delete the code and start over from RED — unless you hold explicit bypass authorization (below).**

## Bypass authorization

The Iron Law applies always — **UNLESS** the user explicitly authorizes a specific bypass for a specific change, with reasoning. Implicit signals ("it's just a quick fix", "we're behind schedule", "no one will notice") do not count and MUST be refused.

Acceptable bypass authorization:
> "Skip TDD for this one-line constant rename — no behavior change, just propagating the new name."

Unacceptable:
> "Just write it, we don't need tests for this."

If the request is ambiguous, stop and ask. Never assume authorization.

## When stuck

The friction is feedback — a test that is hard to write is telling you the design is hard to use:

| Problem | Fix |
|---------|-----|
| Don't know how to test it | Write the wished-for API, or the assertion, first. |
| Test is too complicated | The design is too complicated. Simplify the interface. |
| Must mock everything | Code is too coupled. Inject dependencies instead. |
| Test setup is huge | Extract helpers; still complex ⇒ simplify the design. |

## Workflow

1. **Plan.** Decide the public interface and which behaviors matter *before* coding. Design for testability (`references/interface-design.md`) and for deep modules — small interface, deep implementation (`references/deep-modules.md`). List the behaviors to test (not implementation steps); you can't test everything, so prioritize critical paths and complex logic, not every edge case. Working interactively, confirm the interface and priorities with the user and get approval.
2. **Tracer bullet.** Run the full cycle on ONE test for ONE behavior first — it proves the path works end-to-end before scaling up.
3. **Loop.** Repeat the full cycle for each remaining behavior, running the stop-condition checklist after each.
4. **Refactor.** Once all tests are green, look for refactor candidates (`references/refactoring.md`) and consider what the new code reveals about existing code.
