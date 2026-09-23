---
name: fixer
description: Traces a reported bug to its root cause and proves it with a failing test, then hands the fix plan to the planner - it applies no fix itself. Use whenever user reports a bug and wants to fix it.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Skill
user-invocable: true
disable-model-invocation: false
---

# fixer

## Overview
A traced diagnosis, proven by a failing test, plus a fix plan: that is the output. The fix itself is planned and built downstream.

## The Iron Law

Three laws, in this order. None substitutes for another.

**1. Trace the entire code flow, step by step - no assumptions, no shortcuts.** The bug sits at the first point where actual behavior diverges from what you assumed, and the step you skip is the one where you would have stopped guessing and started seeing. Symptom fixes are failure. Never describe runtime behavior as "should", "probably", or "likely" - state the actual observed value.

**2. NO FIX PLAN WITHOUT A FAILING TEST THAT REPRODUCES THE DIVERGENCE.** Reading code proves what it says, never what it does. Until a test fails on the divergence you found, the root cause is unconfirmed and the fix has nothing to verify it. Reasoning is not evidence - a failing test is.

**3. NEVER APPLY THE FIX HERE.** Edit nothing but the reproduction test. The fix is built through `viber:planner` -> `viber:implementor`, the route that commits the work and records project memory; a hand-applied fix, however small, loses both. "It is trivial" and "it is one line" are the same violation.

## The Process
1. Locate the exact entry point that triggers the behavior - the call, request, or event.
2. Follow execution line by line from there: every branch, call, mutation, and return. Read the code; never infer it.
3. At each step state the ACTUAL state (values, types, conditions), not the assumed one.
4. Stop at the first place where actual diverges from expected - that is the root cause, not the symptom.
5. Confirm the divergence produces the observed symptom downstream.
6. Write the reproduction test and see it RED (below).
7. Draft the fix plan (below) from the confirmed root cause.
8. When more than one fix approach is defensible, settle the choice with the user in prose before handing off - the plan needs decisions closed, not open.
9. Hand off (below).

## The reproduction test
- Narrowest level that reproduces the divergence - unit at the diverging layer, not an end-to-end run of the symptom. The trace already told you which layer; use it.
- Test the divergence found in step 4, not the symptom reported by the user. The symptom is downstream evidence; the divergence is the defect.
- **Actually run it - never simulate it mentally.** The point is the observation, not the prediction.
- It MUST fail because the defect is present - not from a syntax error, missing import, typo in the test, harness misconfig, or wrong fixture path.
- Passes immediately? The diagnosis is wrong or the test misses it. Return to step 2 - do NOT weaken the assertion to force a failure.
- The test stays in the repo, RED, as the handoff evidence. It is the regression guard for this bug afterwards.
- It opens with a header comment of at most 5 lines: root cause as file + symbol, actual vs expected at the diverging step, fix direction. That is the only part of the diagnosis that outlives this context, and it tells a later reader what the guard guards. Nothing else goes in - no trace, no blast radius, no done condition.

## The fix plan
The handoff payload - state it in context, in this order. No report file: the part worth keeping already rides in the reproduction test's header.
- **Root cause** - file + symbol, the diverging step, actual vs expected state at that step.
- **Symptom link** - how that divergence produces what the user reported.
- **Reproduction test** - its path, the exact command that runs it, and the RED output observed. It is already in the tree; the fix must turn it GREEN, not rewrite it.
- **Fix direction** - which symbol changes and to what behavior. Name symbols, never line numbers.
- **Blast radius** - other callers or behavior that depend on the current (wrong) behavior.
- **Done condition** - repro test GREEN, every previously-passing test still green.
- **Spec shape** - `spec-lite`, always: a fixer diagnosis never proposes `spec-full`.

## Handoff [GATE]
Invoke the `viber:planner` skill, restating all seven parts of the fix plan verbatim in that invocation - repeated in the newest turn they survive a compaction the trace behind them does not. Stop there - do not implement, do not "just apply the one-liner first".

## Bypass authorization
The reproduction test is unconditional. When reproduction is genuinely infeasible (hard race, rendering artifact, unreachable third-party state), STOP and ask the user for explicit authorization to hand off without it, stating what blocks reproduction. Never decide this alone; "hard to test" is not infeasible.
