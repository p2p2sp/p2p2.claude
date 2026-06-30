---
name: superplan
description: >
  Use this skill in plan-mode to turn an accepted feature spec into a single,
  approvable implementation plan (the HOW) and hand it off via ExitPlanMode.
  Trigger whenever the user is in plan-mode on a spec, asks to "plan the
  implementation", "write the plan" — or whenever a spec already exists and the next step
  is implementation strategy rather than code. This produces the strategy layer
  that sits BETWEEN the spec (WHAT/contract) and the decomposer (atomic tasks):
  it is NOT a granular task breakdown and NOT code. Use it even if the user only
  says "let's plan" without naming a plan explicitly.
model: opus
effort: xhigh
---

**CRITICAL**: Run `EnterPlanMode` first, if plan mode is not already active.

# Superplan

Produce plans that survive contact with implementation. Default plan mode content drifts: missing files, hidden assumptions, no rollback story. SuperPlan closes that gap with a strict template plus mandatory pre-plan behavior before the plan is presented.

## Pre-plan context
Do not re-interview the user — discovery belongs to the superdev skill (which may have run, or the user may have skipped). Use whatever context the session already holds; if invoked directly with no prior interview, MUST run the `superdev:superdev` Skill.
- If a spec filepath was passed (handoff from `superspec`), `Read` it first — it is the source of truth for WHAT and the spec input `superplan-reviewer` requires. Reference its sections; do not restate it.

## Behavioral rules during planning

- **Never invent file paths.** Do not list a file not yet read — use search/glob to confirm first.
- **Never invent function or symbol names.** If one "should exist", check; if it doesn't, say so as part of the §4 change description.
- **Quote line numbers, not paraphrases**, when referencing existing code.
- **No "we'll see during implementation"** — a code smell. Resolve it now as an open question, or accept the risk explicitly in §8.
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

1. **Touch list (file-level change map).** Every file to create or modify, with code paths. The spec names modules to reuse but not the implementation surface — this is it.
   `<list: path → create|modify → one-line purpose>`

2. **Sequencing & dependency order.** The ordered phases and what blocks what (e.g. migration → data layer → handler → frontend). The decomposer makes atoms; the *order of phases* is decided here.
   `<phase 1 → phase 2 → ... with blockers>`

3. **Open decisions not locked by the spec.** Resolve every choice the spec left open so downstream layers don't re-decide and diverge: where validation lives, the optimistic-update mechanism, the rollback strategy, how each error surfaces in the UI, test layout.
   `<decision → chosen option → why>`

4. **Acceptance-criteria → test strategy mapping.** For each criterion in the spec, name *where and how* it is verified (unit / integration / component / e2e).
   `<criterion → test type → location>`

5. **Risks, unknowns, assumptions.** Anything ambiguous or implementation-only that lives in neither the spec nor the decomposer. Catching these is the plan's highest-leverage job.
   <!-- Example: spec says the client never sets `id` AND requires an optimistic
        insert. So the row must render before the server-generated uuid exists →
        plan a temp-id → swap-on-201 reconciliation and a rollback path for
        400/401. Neither the spec nor an atomic task surfaces this on its own. -->
   `<risk/assumption → decided handling>`

6. **Migration / data plan (when applicable).** Schema/migration steps and how they apply in dev, test, and CI.
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

## Review (immediately before handoff)

Before calling `ExitPlanMode`, run the `superdev:superplan-reviewer` skill, passing it three inputs: the plan draft (inline or the plan file path), the spec filepath, and the original user request verbatim. It checks the plan against the known failure modes and returns its findings to this (main) session — it does not call `ExitPlanMode` itself.

Apply any fixes it returns, re-run it if the changes were substantive, and proceed to handoff only once it reports no blocking issues. This gate exists so the human approves a plan that has already cleared the reviewer, not a raw first draft.

You must call `ExitPlanMode` only after `Verdict: PASS`.

## Handoff
1. Write the final plan (do not edit anything else).
2. Call `ExitPlanMode` to request approval.