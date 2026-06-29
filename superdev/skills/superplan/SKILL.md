---
name: superplan
description: Always-on default planning discipline for ANY plan drafted in plan mode — the silent default, engaged automatically (plugin presence is reason enough. Enforces a strict plan template (intent, model, files, assumptions, options, risk, out-of-scope) and forbids silent assumptions before the plan is presented. Asks exactly one question at finalization — implement via the superbuild pipeline or directly (self / vanilla) — recorded as the §0 implementation-mode marker; implementation decisions beyond that marker are NOT part of the plan. Skip planning entirely (no plan at all — never a looser one) only for trivial work: one-sentence diff, single-file typo / rename, pure read-only research / Q&A. Do NOT hijack memory-rules / memory-layers rules-bootstrap plan mode. Do NOT use for initial spec / PRD writing — use the `spec-writer` skill instead.
model: opus
effort: xhigh
---

**CRITICAL**: Run `EnterPlanMode` first, if plan mode is not already active.

# SuperPlan

Produce plans that survive contact with implementation. Default plan mode content drifts: missing files, hidden assumptions, no rollback story. SuperPlan closes that gap with a strict template plus mandatory pre-plan behavior before the plan is presented.

## 1. Pre-plan context

- Do not re-interview the user — discovery belongs to the superdev skill (which may have run, or the user may have skipped). Use whatever context the session already holds; if invoked directly with no prior interview, run the `superdev:superdev` Skill.

Apply these passive disciplines while drafting:

- **Read before writing.** Open every file the plan will touch — at minimum the call sites, the type definitions, and one neighbor using the same pattern. Never propose changes to a file not read this session.
- **State the system model in one paragraph** (§3 Mental model). If the user corrects it later during `superplan-reviewer`, the plan is wrong and must be redone — cheaper now than after implementation.
- **Check for a simpler approach.** If a 10-line fix exists, say so before proposing a 100-line one. Recommend the simpler path unless the session already ruled it out.
- **No silent assumptions.** Every claim about behavior / data / environment / intent NOT derivable from files read in (1) and NOT stated in the session goes into §5, marked `[load-bearing]` if the plan breaks when it's wrong. A candidate with no defensible default becomes an §6 Option, not a silent §5 guess.

## 2. Behavioral rules during planning

- **Never invent file paths.** Do not list a file not yet read — use search/glob to confirm first.
- **Never invent function or symbol names.** If one "should exist", check; if it doesn't, say so as part of the §4 change description.
- **Quote line numbers, not paraphrases**, when referencing existing code.
- **No "we'll see during implementation"** — a code smell. Resolve it now as an open question, or accept the risk explicitly in §8.
- **Time estimates are forbidden** unless the user asked — they will be wrong.
- **No silent assumptions.** Every §5 item explicit; surface an unstated default as `[load-bearing]` in §5 so `superplan-reviewer` and the user catch it. Never bury a guess in narrative.

## 3. Compose the plan

Reach this step only after the pre-plan context and behavioral disciplines above — the section-by-section contract lives in the template, loaded here, not earlier.

- The best plan leaves no unanswered questions; any remaining means digging deeper and needs interview again.
- **Ask the implementation-mode question first** (`AskUserQuestion`, in plan mode): implement via the `superbuild` pipeline, or directly in the main session (`self`)? The answer becomes the §0 marker — the ONLY thing §0 carries, and what routes (or does not route) `superbuild` after approval. Implementation decisions beyond that marker are NOT part of the plan.
- **Load `templates/plan.md` now** — it carries the full contract: the §0 marker variants plus the ten numbered sections §1–§10 (exact headings, in order), each with its inline filling guidance. Copy it verbatim, keep the single §0 variant matching the answer, delete the other, and fill every section per its inline note.
- The plan file's location is the harness's to own — never name or pick a save path. Write the plan into the path plan mode designates (its own default, under the home `~/.claude/plans/`) and let `ExitPlanMode` save it.
- Do NOT also write a repo-relative `.claude/plans/<slug>.md` copy — that leaves an orphan beside the plan the gate and `superbuild` actually read.
- **Self-run the review before `ExitPlanMode`.**
  - After the plan file is written (or after re-edition) and BEFORE calling `ExitPlanMode`, must invoke the `superdev:superplan-reviewer` Skill — bare argument = the plan file's absolute path.
  - On `Overall Verdict: FIX` or `BLOCK`: apply the Consolidated fixes to the plan file, then re-invoke in re-review mode as one line `<plan-path> ||| <fixes joined with " ;; ", newlines flattened to spaces>`.
  - Call `ExitPlanMode` only after `Overall Verdict: PASS`.

## 4. When the user pushes back

- Treat the edit as authoritative. Do not silently re-add removed items.
- If an edit makes the plan internally inconsistent (e.g. removed a file another change depends on), surface the conflict and ask — do not patch silently.
- If asked to skip a section, comply, but note which section was skipped so the trade-off is visible.

## 5. When to abandon the plan and re-plan

Do not patch around a broken plan. Replanning costs minutes; a partially-migrated codebase costs hours. Propose creating a prompt which will be contains converstion summary and conclusions for the new session.

## 6. One-line summary

- A plan is only good if a careful reader, with no extra context, could approve or reject it in under three minutes and predict 90% of the resulting diff.
- SuperPlan enforces exactly that bar — for what changes and why not how to execute.
