# SuperPlan
To build this plan use the `superbuild` skill.

Title: "<title>"
Spec: <full/path/to/spec.md> <!-- `What & Why` specification -->

---

<!-- TASK -->

## Task <N> - <title which become a commit message>
- TDD: <marker>
- Covers: criteria #<n>[, #<m>]

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
