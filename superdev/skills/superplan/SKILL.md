---
name: superplan
description: Always-on default planning discipline for ANY plan drafted in plan mode — the silent default, engaged automatically (plugin presence is reason enough; do NOT ask plain-vs-super, do NOT announce with a "Using…" line). Enforces a strict plan template (intent, model, files, assumptions, options, risk, out-of-scope) and forbids silent assumptions before the plan is presented. Asks exactly one question at finalization — implement via the orchestrator pipeline or directly (self / vanilla) — recorded as the §0 implementation-mode marker; implementation decisions beyond that marker are NOT part of the plan. Skip planning entirely (no plan at all — never a looser one) only for trivial work: one-sentence diff, single-file typo / rename, pure read-only research / Q&A. Do NOT hijack memory-rules / memory-layers rules-bootstrap plan mode. Do NOT use for initial spec / PRD writing — use the `spec-writer` skill instead. Trigger applies in any language and to descriptive phrasing too.
model: opus
effort: xhigh
---

**CRITICAL**: Run `EnterPlanMode` first, if plan mode is not already active.

# SuperPlan

Produce plans that survive contact with implementation. Default plan mode is read-only and structured, but plan content drifts: missing files, hidden assumptions, no rollback story. SuperPlan closes that gap with a strict template plus mandatory pre-plan behavior before the plan is presented.

---

## 1. When to use SuperPlan

- Always-on default: when a plan is drafted, it IS the plan discipline — there is no plain-plan alternative.
- The only open question is whether the work needs a plan at all. `references/when-to-use.md` is the single source of truth (plan-worthy vs. skip-entirely — never a looser plan).
- If unsure → write the plan. Overhead is one extra section; the cost of skipping is an unrecoverable bad merge.

---

## 2. Pre-plan context

- SuperPlan never re-interviews the user — discovery belongs to the superdev interview skill (which may have run, or the user may have skipped). Use whatever context the session already holds; if invoked directly with no prior interview, run the `superdev:superdev` Skill.

Apply these passive disciplines while drafting:

1. **Read before writing.** Open every file the plan will touch — at minimum the call sites, the type definitions, and one neighbor using the same pattern. Never propose changes to a file not read this session.
2. **State the system model in one paragraph** (§3 Mental model). If the user corrects it later during `superplan-reviewer`, the plan is wrong and must be redone — cheaper now than after implementation.
3. **Check for a simpler approach.** If a 10-line fix exists, say so before proposing a 100-line one. Recommend the simpler path unless the session already ruled it out.
4. **No silent assumptions.** Every claim about behavior / data / environment / intent NOT derivable from files read in (1) and NOT stated in the session goes into §5, marked `[load-bearing]` if the plan breaks when it's wrong. A candidate with no defensible default becomes an §6 Option, not a silent §5 guess.

**Testing direction is a floor (canonical).**
- Do NOT interview about execution-style decisions — test framework, test-first vs test-after ordering, per-task test naming, task boundaries, edit order. `decomposer` derives those from plan + project rules + project skills.
- DO capture the testing *solution direction* the session surfaced — which areas need TDD and why, the edge cases / failure modes that matter, the port seams worth isolating — into §8. That is *what to test and why*, not *how to execute it*.
- Fold any explicit session directive verbatim (e.g. "validation layer needs TDD"). `decomposer` reads §8 as a binding floor: it may raise rigor (push a borderline area to TDD, add an edge case) but never lower it below the TDD baseline. A volunteered execution directive ("ship the migration first") is captured verbatim and read as a binding override.

**Architectural reasoning (prose only — no ADR here).**
- Make the reasoning behind any architectural decision the change locks in legible in plan prose: the trade-off, the rejected alternatives, why this direction (§3, §6 if present, §7).
- The implementation-time recorder reads the approved plan + the code it touches to judge ADR-worthiness and writes the record itself — richer reasoning here yields a better ADR. Never write an ADR file from this skill.

---

## 3. The SuperPlan template

The best plan leaves no unanswered questions; any remaining means digging deeper.

**Before composing §0, ask the implementation-mode question** (`AskUserQuestion`, in plan mode): implement via the orchestrator pipeline, or directly in the main session (self / vanilla)? Record the answer as the §0 marker — the ONLY thing §0 carries, and what routes (or does not route) `orchestrator` after approval.

Every SuperPlan output MUST contain the §0 marker plus these ten numbered sections (§1–§10), in this order, with these exact headings:

### 0. Implementation mode
Exactly one marker, set from the question above — copy the matching variant verbatim from `templates/plan.md`, invent no other wording:
- **orchestrator** → the line `Implementation: orchestrator`, then the preamble `> First thing you MUST do is USE the superdev:orchestrator skill to implement this plan.`
- **self / vanilla** → the line `Implementation: self`, then the hard opt-out `> The user explicitly opted OUT of the orchestrator pipeline for this plan — implement it directly in the main session; do NOT invoke orchestrator even if the plan text mentions it.`

### 1. Scope
One sentence: what this plan accomplishes. If it doesn't fit in one sentence, the plan is too big — split it.

### 2. Context
2–4 sentences on *why* this change is needed now — the problem, trigger, or goal. Motivation, kept distinct from §3 (how the subsystem works today). From §1 + §2 alone, a reader who knows the codebase but not the backstory should be able to tell whether the work is worth doing.

### 3. Mental model
One paragraph: how the relevant subsystem works today. The user reads this first; if it's wrong, the rest is wasted.

### 4. Files to change
List or loose table. For each file: **path**, **what changes**, **why this file**. No mandatory `Order` column — sequencing is `decomposer`'s job. Use whichever format reads best.

Example bullet form:
```
- `<module>/<Feature>Service.<ext>` — add `<Method>` — needed for <deliverable> deliverable
- `<module>/Validators/<Validator>.<ext>` — new file — encodes the <rule-name> rule
```

Or a loose table:
```
| Path | Change | Why |
|---|---|---|
| `<module>/<Feature>Service.<ext>` | add `<Method>` | needed for <deliverable> deliverable |
```

### 5. Assumptions
Bulleted, explicit. Every claim NOT derivable from files read in §3 and NOT stated in the session goes here. Mark each `[load-bearing]` if the plan breaks when it's wrong, so the user can re-verify at a glance during `superplan-reviewer`. Contract: reviewer PASS + the user's review of this section catches wrong assumptions — SuperPlan does not chase confirmations interactively (that is the interview skill's job).

### 6. Options (only if >1 approach is defensible)
Per option: **Name** (short); **Approach** (2–3 sentences); **Files touched** (count); **Risk** (low / medium / high); **Reversibility** (trivial / non-trivial / one-way door); **Recommendation** (which and why). Skip this section if there is genuinely one obvious path.

### 7. Risk & rollback
- **Worst-case failure mode**: one sentence
- **Blast radius**: who/what is affected if this goes wrong in prod
- **Rollback trigger**: the observable condition that should initiate a rollback (the signal to act, not just the mechanism)
- **Rollback strategy**: revert SHA / feature flag / migration-down / "cannot rollback, here's why"
- **Pre-merge checks** the user should personally do

### 8. Recommended testing approach & edge cases
Testing *solution direction* — what to test and why, never how to execute it:
- **Areas needing TDD & why** — parts carrying decision logic / invariants / calculations / state transitions that warrant test-first, and the reason (a wrong branch here is silent and costly).
- **Key edge cases / failure modes** — boundary inputs, rejected inputs, error paths; name them concretely (e.g. "transition from a terminal state is rejected", "empty payload returns 400").
- **Port seams worth isolating** — external resources (DB, HTTP, queue, clock, filesystem) reached through a port/interface, tested against an in-memory fake so the logic stays unit-testable.

Do NOT prescribe the test framework, test-first vs test-after ordering, per-task test names, or task boundaries — those are `decomposer`'s job. This section is a binding floor for the decomposer: it may raise rigor, never lower it. For a change with no decision logic at all (pure docs / config / trivial CRUD passthrough), state that in one line (e.g. "no logic branches — no TDD areas; covered by wiring tests at the task gate") rather than leaving the section empty.

### 9. Definition of done
Observable, declarative exit criteria — what is **true** when this work is complete, phrased as outcomes a reviewer can check, not tasks. Keep it a short checklist. If the change involves runnable code, "the code runs without error" (build succeeds / app starts / script exits 0) is a mandatory item here. For a pure docs / config change with nothing to run, say so in one line.

### 10. Out-of-scope
Explicit list of things adjacent to this work that this plan does NOT do — prevents scope creep mid-implementation and gives the user a chance to add back anything wrongly excluded.

---

## 4. Behavioral rules during planning

- **Never invent file paths.** Do not list a file not yet read — use search/glob to confirm first.
- **Never invent function or symbol names.** If one "should exist", check; if it doesn't, say so as part of the §4 change description.
- **Quote line numbers, not paraphrases**, when referencing existing code.
- **No "we'll see during implementation"** — a code smell. Resolve it now as an open question, or accept the risk explicitly in §8.
- **Time estimates are forbidden** unless the user asked — they will be wrong.
- **No silent assumptions.** Every §5 item explicit; surface an unstated default as `[load-bearing]` in §5 so `superplan-reviewer` and the user catch it. Never bury a guess in narrative.

---

## 5. When the user pushes back

- Treat the edit as authoritative. Do not silently re-add removed items.
- If an edit makes the plan internally inconsistent (e.g. removed a file another change depends on), surface the conflict and ask — do not patch silently.
- If asked to skip a section, comply, but note which section was skipped so the trade-off is visible.

---

## 6. When to abandon the plan and re-plan

Re-enter plan mode and produce a fresh SuperPlan when **any** of these happen mid-implementation:
- A change fails in a way that invalidates a later change's assumptions
- You discover a file that needs to change which was not in §4
- An assumption in §5 turns out to be wrong
- Tests you didn't expect to break, break

Do not patch around a broken plan. Replanning costs minutes; a partially-migrated codebase costs hours. Dig deeper and interview the user so the same trap doesn't recur.

---

## 7. Output skeleton

See `templates/plan.md`. Copy it verbatim, keep the single §0 variant matching the implementation-mode answer, and fill each section.

The plan file's location is the harness's to own — never name or pick a save path. Write the plan into the path plan mode designates (its own default, under the home `~/.claude/plans/`) and let `ExitPlanMode` save it. Do NOT also write a repo-relative `.claude/plans/<slug>.md` copy — that leaves an orphan beside the plan the gate and `orchestrator` actually read.

---

## 8. Publish the approved plan as an artifact (optional)

When the user wants to **share** the approved plan as a live link (not just the harness-saved plan file) and an artifact-publishing skill is available, hand it the assembled `.md`. Opt-in, main session only — never in a fork or the orchestrator pipeline. It does not gate, replace, or feed `decomposer` / `orchestrator`. If no publishing skill is available, skip this — the harness-saved plan file is itself a valid handoff.

Assemble ONE `.md`, then hand it over with a title:
1. **Prepend a `## Review verdict` block** to the plan body — the `Overall Verdict:` line (PASS / FIX / BLOCK) plus the consolidated fix list (Critical / Major / Minor) from the `superplan-reviewer` output already present in this session. Do NOT re-run the reviewer and do NOT parse the transcript — use the verdict it already returned. The block sits above the plan body; the body follows verbatim.
2. **Write the assembled `.md`** (verdict block + plan body) to disk.
3. **Hand the file** to the artifact-publishing skill with its path and a short title (e.g. the §1 Scope sentence). That skill validates it is a single, size-bounded, external-reference-free `.md`, asks before publishing, and either publishes a private shareable page or reports the local path.

**Fallback — no verdict available** (plan approved in an earlier session, or review skipped): do NOT fabricate one and do NOT parse the transcript. Either publish the plan body without the `## Review verdict` block, or offer to re-run `superplan-reviewer` first and prepend the fresh verdict — let the user choose. A published plan with no verdict block is valid; one with an invented verdict is not.

---

## 9. One-line summary

A plan is only good if a careful reader, with no extra context, could approve or reject it in under three minutes and predict 90% of the resulting diff. SuperPlan enforces exactly that bar — for *what changes and why*. *How to execute* is the next step, owned by `decomposer`.
