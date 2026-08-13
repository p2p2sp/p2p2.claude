# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "<title>"

---
<!-- HEADER -->

## Goal
<observable end-state behavior from the interview>

## Context
<short description of plan context, 3-5 sentences max>

## Acceptance criteria
1. <numbered, testable, observable true/false condition>
2. …

<!-- /HEADER -->

---

<!-- TASK -->

## Task <N> - <title which become a commit message>
- Covers: criteria #<n>[, #<m>]
- TDD: <marker>

### Dependencies
- <task N> - blocks: <…>

### Files
- <add | modify | delete> - <path> (<symbol>)
<one line per file touched>

### Test Commands
#### Build
- <build command which agent can run to verify build>

#### Tests
-  <test command which agent can run to verify tests>
<one line per test command>

### Approach
<2–5 imperative steps - symbol + signature, algorithm (name the symbol, never a line number). No prose, no "figure out">

### Edge cases
<error / boundary behavior this task must handle (or "none")>

### Contracts
<data shapes / signatures this task introduces or consumes (or "none")>

### DoD
<observable done condition; impl = code + related tests green>.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->