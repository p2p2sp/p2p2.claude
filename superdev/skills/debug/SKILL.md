---
name: debug
description: Use when the user reports a bug, error, crash, regression, or unexpected behavior, or asks to fix, investigate, debug, diagnose, trace a value, or verify that code works correctly. Fires before diagnosing — enforces tracing the entire code flow step by step instead of guessing the cause, then proving the diagnosis with a failing test before any fix.
---

# Debugger

## Overview
Investigate by tracing, not guessing. Pattern-matching a symptom to a "likely" cause is what makes debugging slow and wrong. Then prove it: a diagnosis you never watched fail in a test is a hypothesis, not a root cause.

## The Iron Law

Two laws, in this order. Neither substitutes for the other.

**1. Trace the entire code flow, step by step — no assumptions, no shortcuts.** The bug sits at the first point where actual behavior diverges from what you assumed; the only way to find that point is to walk every step, because the step you skip is the one where you'd have stopped guessing and started seeing. ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**2. NO FIX WITHOUT A FAILING TEST THAT REPRODUCES THE DIVERGENCE.** Reading code proves what it says, never what it does. Until a test fails on the divergence you found, the root cause is unconfirmed and the fix has nothing to verify it. Reasoning is not evidence — a failing test is.

## The Process
1. Locate the exact entry point that triggers the behavior — the call, request, or event.
2. Follow execution line by line from there: every branch, call, mutation, and return. Read the code; never infer it.
3. At each step state the ACTUAL state (values, types, conditions), not the assumed one.
4. Stop at the first place where actual diverges from expected — that is the root cause, not the symptom.
5. Confirm the divergence produces the observed symptom downstream.
6. Write the reproduction test and see it RED (below). The diagnosis is unproven until this passes.
7. Consult the fix with the user — a quick interview to get confirmation of the solution.
8. Fix until the test is GREEN, every previously-passing test stays green, and output is pristine.

## The reproduction test
- Narrowest level that reproduces the divergence — unit at the diverging layer, not an end-to-end run of the symptom. The trace already told you which layer; use it.
- Test the divergence found in step 4, not the symptom reported by the user. The symptom is downstream evidence; the divergence is the defect.
- **Actually run it — never simulate it mentally.** The point is the observation, not the prediction.
- It MUST fail because the defect is present — not from a syntax error, missing import, typo in the test, harness misconfig, or wrong fixture path.
- Passes immediately? The diagnosis is wrong or the test misses it. Return to step 2 — do NOT weaken the assertion to force a failure.
- The test stays in the repo after the fix. It is the regression guard for this bug.

## Bypass authorization
The reproduction test is unconditional. When reproduction is genuinely infeasible (hard race, rendering artifact, unreachable third-party state), STOP and ask the user for explicit authorization to fix without it, stating what blocks reproduction. Never decide this alone; "hard to test" is not infeasible.

## Red flags — stop and trace
- Proposing a fix before reaching the diverging line.
- Proposing a fix before the reproduction test is RED.
- Saying "should", "probably", or "likely" about runtime behavior.
- "I verified it by reading the code" — that is the hypothesis, not the proof.
- The reproduction test passed on its first run and you moved on anyway.
- Reading only the function named in the error, not its callers and callees.
- Random fixes waste time and create new bugs. Quick patches mask underlying issues.
- Issue seems simple (simple bugs have root causes too).
