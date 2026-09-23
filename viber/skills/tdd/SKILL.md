---
name: tdd
description: >-
  Red-Green-Refactor discipline for a plan task marked `TDD: required`: no production code before a test that has been watched to fail, mandatory verify-red and verify-green checkpoints, no horizontal slicing. On `resume`, `reason` or `report` input the code already in the tree is kept and tested, never deleted. Invoked by `viber:task-coder` before the first line of production code, never directly.
user-invocable: false
---

# Test-Driven Development

Write the test first. Watch it fail. Write the minimal code that passes. Refactor. If you did not watch the test fail, you do not know whether it tests the right thing.

## Iron law

New behavior gets no production code before a failing test for it exists and has been watched to fail. `TDD: required` on the task is the authorization, decided before this skill loads: nothing reopens it here.

On `resume`, `reason` or `report` input, the code already in the tree is existing work, not a violation: keep it. For each of its behaviors that no existing test covers, write that test, see it fail once by breaking its own assertion, confirm the failure names the gap, then restore the code so the test passes. Leave every test already in the tree as it is. A behavior new to this cycle still goes through red before green.

## Red-Green-Refactor cycle

### Red - write one failing test
One behavior, one test, named after the behavior ("user can checkout with valid cart", never "constructor returns instance"). Public interface only.

### Verify red - watch it fail
Run it. It must fail for the missing behavior, not a typo, import miss or harness error. Passes immediately? Sharpen the assertion and restart red.

### Green - simplest code that passes
Only enough to pass this test. No anticipating future tests, no opportunistic refactor of surrounding code.

### Verify green - the cycle's own file, pristine
The target test and every test already in that file pass. No new warnings, no stray prints, no flaky failures hidden behind a retry.

### Refactor - only on green, only for real duplication
Never refactor while red.

## Anti-patterns

- Horizontal slicing - all tests first, then all implementation. Work vertical: one test, one implementation, repeat.
- Mocking internal collaborators - couples a test to implementation so it breaks on a refactor that changed no behavior.
- Testing implementation details - private methods, call counts, call order.

## Workflow

1. Decide the public interface and which behaviors matter before coding. Where the task leaves a choice open, take it; where it leaves the behavior under test unnameable, stop and report the task failed with that reason.
2. Run the full cycle on one behavior first.
3. Repeat for each remaining behavior.
4. Once every test is green, refactor only code this task wrote.
