---
name: dev-debug
description: Use when the user reports a bug, error, crash, regression, or unexpected behavior, or asks to fix, investigate, debug, diagnose, trace a value, or verify that code works correctly. Triggers include "debug this", "why does X happen", "investigate the bug", "find the root cause", "check if it works", "is this correct". Fires before diagnosing — enforces tracing the entire code flow step by step instead of guessing the cause. Trigger applies in any language and to descriptive phrasing too.
---

# Debugger

## Overview
Investigate by tracing, not guessing. Pattern-matching a symptom to a "likely" cause is what makes debugging slow and wrong.

## The Iron Law

Trace the entire code flow, step by step — no assumptions, no shortcuts. The bug sits at the first point where actual behavior diverges from what you assumed; the only way to find that point is to walk every step, because the step you skip is the one where you'd have stopped guessing and started seeing.

## The Process
1. Locate the exact entry point that triggers the behavior — the call, request, or event.
2. Follow execution line by line from there: every branch, call, mutation, and return. Read the code; never infer it.
3. At each step state the ACTUAL state (values, types, conditions), not the assumed one.
4. Stop at the first place where actual diverges from expected — that is the root cause, not the symptom.
5. Confirm the divergence produces the observed symptom downstream before proposing a fix.

## Red flags — stop and trace
- Proposing a fix before reaching the diverging line.
- Saying "should", "probably", or "likely" about runtime behavior.
- Reading only the function named in the error, not its callers and callees.
