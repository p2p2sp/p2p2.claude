---
name: superspec
description: Invoked by superdev skill only.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Skill, AskUserQuestion, ExitPlanMode
---

CRITICAL: Run `ExitPlanMode` first, if plan mode is active.

# SuperSpec
Write a specification document using the superspec template. Leverage the information gathered during the interview. A good specification is short enough that anyone can read it in one sitting, yet precise enough to be implemented without guesswork. Never describes `How` (that is superplan).

## Inputs
Do not re-interview the user — discovery belongs to the superdev skill (which may have run, or the user may have skipped). Use whatever context the session already holds; if invoked directly with no prior interview, MUST run the `superdev` Skill.

What should be delivered:
- superdev interview context
- the spec track was chosen at handoff (this is medium/large work; if it turns out small → stop; hand back to `superdev`, which owns the simple-track route)

## Smell test
- Is anything ambiguous or conflicting with the codebase → STOP and run `superdev` Skill - do not invent scope.
- Is any scope decision left open? → the agent will fill it in for you, usually wrong - run `superdev` Skill.
- Could an agent build the wrong thing and still satisfy the spec? → tighten the **outcome** and **acceptance criteria**.
- Are you describing style in prose? → replace with one **example**.

## Hard rules for the draft
- User stories: INVEST.
- Spec the area of change, not the whole system.
- Acceptance criteria = single declarative outcome statement (observable business outcome). NO Given/When/Then, NO UI mechanics. Good: "Checking out an empty cart ends with a validation error visible to the user."
- Max 3 AC per story; 4+ → split the story.
- Every AC testable — sketch its failing test; if you can't, fix the AC.
- Spec = `What & Why` - the specific persona who benefits + the concrete observable change for them + business value. No How. If you think "we'll do it via X", that belongs in superplan.
- Out of Scope ≥ 2 entries.
- No TBD / "later" / "details to follow" / Open questions - if you have any → STOP and run `superdev` Skill.
- Before publishing: verify every rule above holds and no persona/edge case is missed; fix — never publish while a rule fails.

## Authoring the spec
- Replace every `< ... >` placeholder with real content; delete any section that genuinely doesn't apply.
- Each filled-in block is a WORKED EXAMPLE (a fictional "Add Task" feature) showing the expected level of detail — read it, then overwrite it.
- Be specific. Vague specs now → produce vague code later.
- Right-size the detail to the task: don't over-spec something trivial, don't under-spec something hard.
- Resolve every open point before handing the spec off — a spec must contain answers, not questions.
- Read `references/checklist.md` (relative to this skill's directory) and apply every checklist item to craft an extraordinary spec.

## Publish
Save date (yyyyMMdd):
!`date +%Y%m%d`

- Load spec from `templates/spec.md`.
- **Refining an existing spec** — when an existing spec file path is in context (the user asked to work on that spec), render into it and overwrite that file in place; skip the date/slug step.
- **New spec** — render into the template and save it as `.superdev/.workflows/<date>-<slug>.md` (`<date>` = the yyyyMMdd value above; `<slug>` = a short title as slug).

## Review gate
Immediately after saving — and BEFORE any handoff — run the reviewer and act on its verdict. Never hand off a spec that has not returned `VERDICT: PASS`. Track which invocation this is (round 1, round 2, …).

Checklist path (for the reviewer): !`printf '%s' "${CLAUDE_SKILL_DIR}/references/checklist.md"`

1. Invoke `superspec-reviewer` (Skill). The `args` MUST be a labeled block — one `label: value` per line, NOT a bare path:
   ```
   spec: <saved spec filepath>
   checklist: <checklist path above>
   ```
   - **Round 1** — send exactly those two lines.
   - **Round 2+, looping back from a fixable-in-draft FAIL** — first save the round context to a sibling file `<saved spec filepath>.review-<N-1>.md` with exactly:
     ```
     --- Previous review (round <N-1>) ---
     <verbatim previous VERDICT: FAIL report>
     --- Fixes applied since ---
     - <what changed, one line per fix>
     ```
     then add `previous-review: <that sibling file path>` as a third line.
2. Read the first line of its output: `VERDICT: PASS` or `VERDICT: FAIL`.
3. `VERDICT: PASS` → proceed to **Handoff**.
4. `VERDICT: FAIL` — classify by the reviewer's channels: resolvable DEFECTS are fixable-in-draft; QUESTIONS (open clarifications) or defects needing a product decision are needs-discovery.
   - **Fixable-in-draft blockers** → apply the returned corrections to the saved file, then go back to step 1 and re-run the reviewer.
   - **Needs-discovery blockers** → STOP looping. Run the `superdev` Skill (or ask the user) to obtain the missing decision, update the spec, then go back to step 1 as a fresh round 1 (no `Previous review` block) — the spec changed for a reason the prior reviewer report never covered.
- Do not advance to Handoff until the reviewer returns `VERDICT: PASS`.

## Hand off
Handoff is not the interview — use `AskUserQuestion`. The user's confirmation is the gate; never route yourself past it.
- **SuperPlan** — run the `superplan` Skill, passing the saved spec filepath (`.superdev/.workflows/<date>-<slug>.md`) as the sole argument.
- **Done for now** — STOP. Do not do anthing more.
