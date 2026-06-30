# SuperPlan: <Feature Title>
> Spec: <path/to/spec.md> (source of truth for WHAT — referenced, not duplicated)

## 0. Implementation mode
<!-- Keep EXACTLY ONE of the two variants below — the one matching the implementation-mode answer. Delete the other (and this comment + the variant labels). -->

<!-- VARIANT A — superbuild pipeline:
Implementation: superbuild
> First thing you MUST do is USE the `superdev:superbuild` skill to implement this plan.
-->

<!-- VARIANT B — self (agent implements directly):
Implementation: self
> The user explicitly opted OUT of the superbuild pipeline for this plan — implement it directly in the main session; do NOT invoke `superbuild` even if the plan text mentions it.
-->

## 1. Touch list
- <path> — create|modify — <purpose>

## 2. Phases & dependencies
1. <phase> — blocks: <…>

## 3. Decisions resolved
- <decision>: <option> — <why>

## 4. Test strategy (maps to spec acceptance criteria)
- <criterion> → <unit|integration|component|e2e> @ <location>

Testing direction (binding floor for decomposer — may raise rigor, never lower it):
- TDD areas: <which logic / invariants / calculations / state transitions warrant test-first, and why>
- Edge cases / failure modes: <boundary inputs, rejected inputs, error paths — named concretely>
- Port seams to isolate: <external resource reached through a port/interface → test against an in-memory fake>

<!-- No decision logic (pure docs / config / trivial CRUD): say so in one line instead of leaving it blank, e.g. "no logic branches — covered by wiring tests at the task gate". -->

## 5. Risks & assumptions
- <risk/assumption> → <handling>

## 6. Migration / data (if any)
- <steps + apply path>