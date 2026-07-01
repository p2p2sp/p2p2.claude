---
name: superplan
description: >
  Use this skill in plan-mode to turn an accepted feature spec into a single, approvable implementation plan (the HOW) and hand it off via ExitPlanMode. Trigger whenever the user is in plan-mode on a spec, asks to "plan the implementation", "write the plan" — or whenever a spec already exists and the next step is implementation strategy rather than code. This produces the strategy layer that sits BETWEEN the spec (WHAT/contract) and the decomposer (atomic tasks): it is NOT a granular task breakdown and NOT code. Use it even if the user only says "let's plan" without naming a plan explicitly.
model: opus
effort: xhigh
---

**CRITICAL**: Run `EnterPlanMode` first, if plan mode is not already active.

# Superplan

Produce plans that survive contact with implementation. Default plan mode content drifts: missing files, hidden assumptions, no rollback story. SuperPlan closes that gap with a strict template plus mandatory pre-plan behavior before the plan is presented.

## Pre-plan context

Do not re-interview the user — discovery of *intent* belongs to the superdev skill (which may have run, or the user may have skipped).

- If invoked directly with no prior interview, MUST run the `superdev:superdev` Skill.
- If a spec filepath was passed (handoff from `superspec`), `Read` it first — it is the source of truth for WHAT; record its path in the plan's `> Spec:` header (that is how `superplan-reviewer` resolves it). Reference its sections; do not restate it.

## Explore the plan's open questions

Run this gate BEFORE drafting — discover the codebase facts the plan needs instead of assuming them.

- Enumerate the codebase facts each plan component needs:
   - real paths + symbol names,
   - integration / sequencing points,
   - codebase-dependent open decisions (where validation lives, the error-signalling pattern, test layout),
   - test locations + port seams.
- Subtract facts already confirmed this session. Explore only the delta — do NOT re-run the interview's broad sweep.
- For each remaining unknown, dispatch a scoped `Explore` agent via the `Agent` tool (read-only), each with a narrow brief = the single open decision it must resolve. Batch independent ones in parallel (one message, up to 3 agents).
- Draft only from confirmed facts. An unknown that Explore could not resolve becomes a `[load-bearing]` item or a plan option — never a silent guess.

## Behavioral rules during planning

The explore gate above is the primary mechanism (discover before you decide); these rules are the backstop for facts that surface only mid-draft, which the gate did not anticipate. A quick single path/symbol confirm may stay inline; broad or multi-question exploration goes through the gate.

- **Never invent file paths.** Do not list a file not yet read — use search/glob to confirm first.
- **Never invent function or symbol names.** If one "should exist", check; if it doesn't, say so as part of the §4 change description.
- **Quote line numbers, not paraphrases**, when referencing existing code.
- **No "we'll see during implementation"** — a code smell. Resolve it now as an open question, or accept the risk explicitly in §5.
- **Time estimates are forbidden** unless the user asked — they will be wrong.
- **No silent assumptions.** Every §5 item explicit; surface an unstated default as `[load-bearing]` in §5 so `superplan-reviewer` and the user catch it. Never bury a guess in narrative.

## Where this sits in the pipeline

Keep these boundaries sharp. Each layer answers a different question and re-deciding another layer's job is the most common failure mode.

- **Spec = WHAT** — external contract, scope, locked decisions, acceptance criteria. Input. Do not restate it; reference its sections.
- **Superplan = HOW** — the implementation strategy. This is the *approvable unit*. Output of this skill.
- **Decomposer = atoms** — turns the approved plan into small task files. Runs later.
- **Orchestrator = execution** — runs the atoms.

The plan is not a pass-through. `ExitPlanMode` is an approval gate; if the plan carried no decisions, there would be nothing to approve. The plan exists to make the approach reviewable before any code or task file is written.

## What the plan MUST contain

These are the components that are absent from the spec yet too coarse for the decomposer. Fill each with project specifics; omit a section only with an explicit one-line reason.

### Touch list (file-level change map)
Every file to create or modify, with code paths. The spec names modules to reuse but not the implementation surface — this is it.
`<list: path → create|modify → one-line purpose>`

### Sequencing & dependency order
The ordered phases and what blocks what (e.g. migration → data layer → handler → frontend). The decomposer makes atoms; the *order of phases* is decided here.
`<phase 1 → phase 2 → ... with blockers>`

### Open decisions not locked by the spec
Resolve every choice the spec left open so downstream layers don't re-decide and diverge: where validation lives, the optimistic-update mechanism, the rollback strategy, how each error surfaces in the UI, test layout.
`<decision → chosen option → why>`

### Acceptance-criteria → test strategy mapping + testing direction
For each spec criterion, name *where and how* it is verified (unit / integration / component / e2e). Then state the **testing direction** the decomposer treats as a binding floor (it may raise rigor, never lower it): which logic warrants test-first (TDD areas + why), the key edge cases / failure modes named concretely, and any port seams worth isolating against an in-memory fake. For a change with no decision logic (pure docs / config / trivial CRUD), say so in one line.
`<criterion → test type → location>` + `<TDD areas · edge cases/failure modes · port seams>`

### Risks, unknowns, assumptions
Anything ambiguous or implementation-only that lives in neither the spec nor the decomposer. Catching these is the plan's highest-leverage job.
<!--
   Example: spec says the client never sets `id` AND requires an optimistic
   insert. So the row must render before the server-generated uuid exists →
   plan a temp-id → swap-on-201 reconciliation and a rollback path for
   400/401. Neither the spec nor an atomic task surfaces this on its own.
-->
`<risk/assumption → decided handling>`

### Migration / data plan (when applicable)
Schema/migration steps and how they apply in dev, test, and CI.
`<migration steps + apply path>`

## What the plan MUST NOT contain

- No atomic task files or micro-steps — that is the decomposer's job.
- No line-by-line code. Reference code paths, don't write the implementation.
- No re-deciding what the spec already locked (schema, response shapes) — reference it.
- No file edits. Plan-mode is read-only; only the plan file itself is written.

## Self-containment (handoff requirement)

The plan is read later by the decomposer/orchestrator, in a fresh context. Make it self-sufficient relative to what the decomposer needs — decisions, sequence, and touch list — rather than relying on reasoning that only exists in this session's context.

## Output template

ALWAYS write the plan in the shape from `templates/plan.md` so the decomposer can parse it.

## Implementation mode (before handoff)

Set §0 from the user's choice — never assume it. Unless the user already explicitly picked the mode this session, call `AskUserQuestion` once with two options:

- **Use superbuild pipeline** — the orchestrated agentic pipeline (decompose → per-task coder / runner / reviewer / commit). → §0 VARIANT A, marker line `Implementation: superbuild`.
- **Implement directly (self)** — the agent implements in the main session, no pipeline. → §0 VARIANT B, marker line `Implementation: self`.

Then write §0 as the single matching variant (delete the other variant and the template comment). That marker line is the sole trigger `superbuild` reads, so it MUST match the user's answer.

## Review (immediately before handoff)

Before calling `ExitPlanMode`, run the `superdev:superplan-reviewer` skill, passing the plan file path as the bare argument. It reads the plan (and the spec the plan's `> Spec:` header points to), checks it against the known failure modes, and returns its findings to this (main) session — it does not call `ExitPlanMode` itself.

Show to the user critical or major findings summary as list, apply any fixes it returns, re-run reviewer (any change to the plan file will force a review via the hook anyway), and proceed to handoff only after `Verdict: PASS`. This gate exists so the human approves a plan that has already cleared the reviewer, not a raw first draft.

You must call `ExitPlanMode` ONLY AFTER `Verdict: PASS`.

## Handoff

1. Write the final plan (do not edit anything else).
2. Call `ExitPlanMode` to request approval.