---
name: fixer
description: Traces a reported bug to its root cause and proves it with a failing test, then hands the diagnosis to the planner - it applies no fix itself. Use whenever user reports a bug and wants to fix it.
argument-hint: "[bug report, or an issue number/URL when issues is on]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Skill, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/config.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/issue-facts.sh:*)
user-invocable: true
disable-model-invocation: false
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/config.sh"
```

# fixer

## Overview
A traced diagnosis, proven by a failing test: that is the output. The plan and the fix are made downstream.

## The Iron Law

Three laws, in this order. None substitutes for another.

**1. Trace the entire code flow, step by step - no assumptions, no shortcuts.** Locate the entry point, follow execution line by line reading the code (never infer it), and at each step state the actual value, type or condition - never "should", "probably" or "likely". Stop at the first point where actual diverges from expected: that is the root cause, not the symptom. Confirm the divergence produces the reported symptom downstream. Symptom fixes are failure.

**2. No handoff without a failing test that reproduces the divergence.** Reading code proves what it says, never what it does. Until a test fails on the divergence found, the root cause is unconfirmed and the fix has nothing to verify it.

**3. Never apply the fix here.** Edit nothing but the reproduction test. The fix is built through `viber:planner` -> `viber:implementor`. "It is trivial" and "it is one line" are the same violation.

## The Process
1. Resolve the report (below).
2. Trace per Law 1 to the confirmed divergence.
3. Write the reproduction test and see it RED (below).
4. Write up the diagnosis (below) from the confirmed root cause.
5. When more than one fix approach is defensible, settle the choice with the user in prose before handing off.
6. Hand off (below).

## Resolving the report
- The config block above carries `issues: true` or `issues: false`.
- `issues: true` and the argument is a single token that is a number, `#<N>` or an issue URL -> run `"${CLAUDE_PLUGIN_ROOT}/scripts/issue-facts.sh" "<argument>"` as one literal Bash line. Exit 0 -> its block, body and comments included, is the bug report: trust it, never fetch it again. Exit 1 or 2 -> report its `ERROR` line and stop; never trace or hand off on a failed fetch.
- Any other argument, or `issues: false`, is the bug report as plain text - trace from what the user wrote.

## The reproduction test
- Narrowest level that reproduces the divergence - unit at the diverging layer, not an end-to-end run of the symptom.
- Test the divergence, not the symptom reported by the user.
- **Actually run it - never simulate it mentally.**
- It must fail because the defect is present - not from a syntax error, missing import, typo, harness misconfig, or wrong fixture path.
- Passes immediately? The diagnosis is wrong or the test misses it. Return to step 1 - never weaken the assertion to force a failure.
- The test stays in the repo, RED, as the handoff evidence and the regression guard afterwards.
- It opens with a header comment of at most 5 lines: root cause as file + symbol, actual vs expected at the diverging step, fix direction. Nothing else goes in.

## The diagnosis
The handoff payload - state it in context, in this order. No report file: the part worth keeping already rides in the reproduction test's header.
- **Root cause** - file + symbol, the diverging step, actual vs expected state at that step.
- **Symptom link** - how that divergence produces what the user reported.
- **Reproduction test** - its path, the exact command that runs it, and the RED output observed. It is already in the tree; the fix must turn it GREEN, not rewrite it.
- **Fix direction** - which symbol changes and to what behavior. Name symbols, never line numbers.
- **Blast radius** - other callers or behavior that depend on the current (wrong) behavior.
- **Done condition** - repro test GREEN, every previously-passing test still green.
- **Spec shape** - `spec-lite`, always: a fixer diagnosis never proposes `spec-full`.
- **Issue** - `Issue: <full issue URL>`, the `URL=` value of `issue-facts.sh`, present only when the report was read through it.

## Handoff [GATE]
Invoke the `viber:planner` skill, restating all seven parts of the diagnosis verbatim in that invocation, plus the Issue line when it is present. Stop there - do not implement, do not "just apply the one-liner first".

## Bypass authorization
The reproduction test is unconditional. When reproduction is genuinely infeasible (hard race, rendering artifact, unreachable third-party state), stop and ask the user for explicit authorization to hand off without it, stating what blocks reproduction. Never decide this alone; "hard to test" is not infeasible.
