> First thing you MUST od is USE the `superdev:dev-orchestrator` skill to implement this plan.

## ExtraPlan: <one-line task name>

### 1. Scope
<one sentence: what this plan accomplishes. If it doesn't fit in one sentence, the plan is too big — split it.>

### 2. Context
<2–4 sentences: why this change is needed now — the problem, trigger, or goal it serves. NOT how the system works (that is §3) — why we are touching it at all.>

### 3. Mental model
<one paragraph: how the relevant subsystem works *today*. The user reads this first; if it is wrong, the rest is wasted.>

### 4. Files to change
<List or loose table — pick whichever reads best. For each file: path, what changes, why this file. No mandatory `Order` column — sequencing belongs to `decomposer`.>

- `path/to/file.ext` — <what changes> — <why this file>
- ...

<!-- Or a loose table:
| Path | Change | Why |
|---|---|---|
| `path/to/file.ext` | <what changes> | <why this file> |
-->

### 5. Assumptions
<!-- Every claim about behavior/data/environment/intent that is NOT derivable from files read in §3 and NOT explicitly stated in the session goes here. This skill does NOT interview to confirm them — mark an item [load-bearing] when the plan breaks if it is wrong, so dev-plan-reviewer and the user can re-verify at a glance. A candidate with no defensible default belongs in §6 Options, not here. -->
- ...
- ... [load-bearing]

### 6. Options
<omit if exactly one approach is defensible. One block per option:>
<!--
- **<Name>** — <approach in 2–3 sentences>
  - Files touched: <count> · Risk: <low/medium/high> · Reversibility: <trivial / non-trivial / one-way door>
- **Recommendation**: <which option and why>
-->

### 7. Risk & rollback
- Worst-case failure mode: ...
- Blast radius: <who/what is affected if this ships broken>
- Rollback trigger: <the observable condition that should initiate a rollback>
- Rollback strategy: <revert SHA / feature flag / migration-down / "cannot roll back — here is why">
- Pre-merge checks: <what the user should personally verify before merge>

### 8. Recommended testing approach & edge cases
<Testing solution direction — what to test and why, NOT framework / test-first ordering / task boundaries. This is a binding floor for `decomposer`: may raise rigor, never lower it.>
- Areas needing TDD & why: <which logic / invariants / calculations / state transitions warrant test-first, and the reason>
- Key edge cases / failure modes: <boundary inputs, rejected inputs, error paths — named concretely>
- Port seams worth isolating: <external resources reached through a port/interface to test against an in-memory fake>

<!-- For a change with no decision logic (pure docs / config / trivial CRUD), state that in one line instead of leaving the section empty, e.g.: "no logic branches — no TDD areas; covered by wiring tests at the task gate". -->

### 9. Definition of done
<!-- Observable, declarative exit criteria — what is TRUE when this is complete, phrased as outcomes a reviewer can check, not tasks. Keep to a short checklist. If the change involves runnable code, "the code runs without error" (build succeeds / app starts / script exits 0) is a MANDATORY item here. -->
- ...
- <if runnable code: runs without error — e.g. build succeeds / app starts / script exits 0>

### 10. Out-of-scope
- <thing adjacent to this work this plan deliberately does NOT do>
- ...
