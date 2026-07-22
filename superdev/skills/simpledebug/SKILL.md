---
name: simpledebug
description: Use ALWAYS when the user reports a bug, error, crash, regression, or unexpected behavior, or asks to fix, investigate, debug, diagnose, apply the fix from review, trace a value, or verify that code works correctly. Fires before diagnosing — enforces tracing the entire code flow step by step instead of guessing the cause, proving the diagnosis with a failing test, then handing the proven fix plan to `simpleplan`.
---

# SimpleDebug

## Overview
Investigate by tracing, not guessing. Pattern-matching a symptom to a "likely" cause is what makes debugging slow and wrong. Then prove it: a diagnosis you never watched fail in a test is a hypothesis, not a root cause. The proven diagnosis plus a fix plan is the output — the fix itself is planned and built downstream.

## The Iron Law

Three laws, in this order. None substitutes for another.

**1. Trace the entire code flow, step by step — no assumptions, no shortcuts.** The bug sits at the first point where actual behavior diverges from what you assumed; the only way to find that point is to walk every step, because the step you skip is the one where you'd have stopped guessing and started seeing. ALWAYS find root cause before proposing a fix. Symptom fixes are failure.

**2. NO FIX PLAN WITHOUT A FAILING TEST THAT REPRODUCES THE DIVERGENCE.** Reading code proves what it says, never what it does. Until a test fails on the divergence you found, the root cause is unconfirmed and the fix has nothing to verify it. Reasoning is not evidence — a failing test is.

**3. NEVER APPLY THE FIX HERE.** Edit nothing but the reproduction test. The fix leaves this skill as a plan and is built through `simpleplan` -> `simplebuild`, never by hand — that route is what commits the work and records project memory. A hand-applied fix, however small, loses both.

## The Process
1. Locate the exact entry point that triggers the behavior — the call, request, or event.
2. Follow execution line by line from there: every branch, call, mutation, and return. Read the code; never infer it.
3. At each step state the ACTUAL state (values, types, conditions), not the assumed one.
4. Stop at the first place where actual diverges from expected — that is the root cause, not the symptom.
5. Confirm the divergence produces the observed symptom downstream.
6. Write the reproduction test and see it RED (below). The diagnosis is unproven until this happens.
7. Draft the fix plan (below) from the confirmed root cause.
8. When more than one fix approach is defensible, settle the choice with the user in prose before handing off — the plan needs decisions closed, not open.
9. Hand off (below).

## The reproduction test
- Narrowest level that reproduces the divergence — unit at the diverging layer, not an end-to-end run of the symptom. The trace already told you which layer; use it.
- Test the divergence found in step 4, not the symptom reported by the user. The symptom is downstream evidence; the divergence is the defect.
- **Actually run it — never simulate it mentally.** The point is the observation, not the prediction.
- It MUST fail because the defect is present — not from a syntax error, missing import, typo in the test, harness misconfig, or wrong fixture path.
- Passes immediately? The diagnosis is wrong or the test misses it. Return to step 2 — do NOT weaken the assertion to force a failure.
- The test stays in the repo, RED, as the handoff evidence. It is the regression guard for this bug afterwards.

## The fix plan
The handoff payload — state it in context, in this order. No file, no report.
- **Root cause** — file + symbol, the diverging step, actual vs expected state at that step.
- **Symptom link** — how that divergence produces what the user reported.
- **Reproduction test** — its path, the exact command that runs it, and the RED output observed. It is already in the tree; the fix must turn it GREEN, not rewrite it.
- **Fix direction** — which symbol changes and to what behavior. Name symbols, never line numbers.
- **Blast radius** — other callers or behavior that depend on the current (wrong) behavior.
- **Done condition** — repro test GREEN, every previously-passing test still green.

## Handoff [GATE]
Invoke `simpleplan` (Skill) with the fix plan in context. Stop there — do not implement, do not "just apply the one-liner first".

## Bypass authorization
The reproduction test is unconditional. When reproduction is genuinely infeasible (hard race, rendering artifact, unreachable third-party state), STOP and ask the user for explicit authorization to hand off without it, stating what blocks reproduction. Never decide this alone; "hard to test" is not infeasible.

## Red flags — stop and trace
- Proposing a fix before reaching the diverging line.
- Drafting the fix plan before the reproduction test is RED.
- Editing anything other than the reproduction test.
- Skipping the handoff because the fix "is trivial" or "is one line".
- Saying "should", "probably", or "likely" about runtime behavior.
- "I verified it by reading the code" — that is the hypothesis, not the proof.
- The reproduction test passed on its first run and you moved on anyway.
- Reading only the function named in the error, not its callers and callees.
- Random fixes waste time and create new bugs. Quick patches mask underlying issues.
- Issue seems simple (simple bugs have root causes too).
