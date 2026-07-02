---
name: superspec
description: Specification writing expert with spec-driven-development practices. Use this skill whenever the user asks for a Spec, Specification, PRD, requirements document, feature spec, or user-story breakdown. Triggers include "spec", "specification", "prd", "requirements doc", "feature spec", "user story", "acceptance criteria". Do NOT write specs ad-hoc — use this skill first; it forbids TBD and forces working-backwards framing. Do NOT use for implementation plans — use the `superplan` skill instead.
effort: xhigh
---

**CRITICAL**: Run `ExitPlanMode` first, if plan mode is active - you need to save the spec to the file.

## Pre-spec context

Do not re-interview the user — discovery belongs to the superdev skill (which may have run, or the user may have skipped). Use whatever context the session already holds; if invoked directly with no prior interview, MUST run the `superdev:superdev` Skill.

## SuperSpec Checklist
Write a specification document using the superspec template. Leverage the information gathered during the interview. A good specification is short enough that anyone can read it in one sitting, yet precise enough to be implemented without guesswork. It should be:

- **Outcome-driven** — states the observable result ("user can add a task, it persists"), not the feature name.
- **Scoped on both sides** — lists what's in scope and explicitly what's out of scope.
- **Concrete about the stack** — names tools and versions ("React 18 + TypeScript"), not "a React app".
- **Decisive** — locks in decisions already made (schema, libraries) so the agent doesn't re-decide.
- **Behaviorally precise** — defines inputs/outputs, error shapes, pre/postconditions, and state changes.
- **Verifiable** — gives concrete acceptance criteria ("400 with this exact JSON"), not "does it work".
- **Example-first** — one real code or output snippet beats three paragraphs of description.
- **Cleanly structured** — consistent Markdown headings that everyone can scan.
- **Right-sized** — detail matched to complexity; never over-specs a trivial task or under-specs a hard one.
- **The single source of truth** — spec is future intent, not live doc — after the feature ships it is archived, never kept as the standing description of what the feature does today.

## Smell test
- Is anything ambiguous or conflicting with the codebase → STOP and run `superdev:superdev` Skill - do not invent scope.
- Is any scope decision left open? → the agent will fill it in for you, usually wrong - run `superdev:superdev` Skill.
- Could an agent build the wrong thing and still satisfy the spec? → tighten the **outcome** and **acceptance criteria**.
- Are you describing style in prose? → replace with one **example**.

## Hard rules for the draft
- User stories: INVEST.
- Spec the area of change, not the whole system.
- Acceptance criteria = single declarative outcome statement (observable business outcome). NO Given/When/Then, NO UI mechanics. Good: "Checking out an empty cart ends with a validation error visible to the user."
- Max 3 AC per story; 4+ → split the story.
- Every AC testable — sketch its failing test; if you can't, fix the AC.
- WHAT/WHY = the specific persona who benefits + the concrete observable change for them + business value. No solutioning.
- HOW = full signature per new interface/method; one responsibility statement per module.
- Versions/dependencies explicit when they matter.
- Out of Scope ≥ 2 entries.
- No TBD / "later" / "details to follow" / Open questions.
- Before publishing: verify every rule above holds and no persona/edge case is missed; fix or ask — never publish while a rule fails.

## Authoring the spec
- Replace every `< ... >` placeholder with real content; delete any section that genuinely doesn't apply.
- Each filled-in block is a WORKED EXAMPLE (a fictional "Add Task" feature) showing the expected level of detail — read it, then overwrite it.
- Be specific. Vague specs produce vague code: write "React 18 + TypeScript", not "React".
- Right-size the detail to the task: don't over-spec something trivial, don't under-spec something hard.
- Resolve every open point before handing the spec off — a spec for an agent must contain answers, not questions.

## Publish
Save date (yyyyMMdd):
!`date +%Y%m%d`
1. Detect language, load template (Polish → `templates/specification.pl.md`, English or unclear → `templates/specification.en.md`). Do not translate the template.
2. Render into the template and save it in `.temp/.workflows/<date>-<slug>.md` (where `<date>` is the yyyyMMdd value above and `<slug>` is a short title as slug).

## Review gate
Immediately after saving — and BEFORE any handoff — run the reviewer and act on its verdict. Never hand off a spec that has not returned `REVIEW: PASS`. Track which invocation this is (round 1, round 2, …).

1. Run the `superdev:superspec-reviewer` Skill.
   - **Round 1** — pass the saved spec filepath as the sole argument.
   - **Round 2+, looping back from a fixable-in-draft FAIL** — pass the spec filepath on the first line, then append:
     ```
     --- Previous review (round <N-1>) ---
     <verbatim previous REVIEW: FAIL report>
     --- Fixes applied since ---
     - <what changed, one line per fix>
     ```
2. Read the first line of its output: `REVIEW: PASS` or `REVIEW: FAIL`.
3. `REVIEW: PASS` → proceed to **Handoff**.
4. `REVIEW: FAIL`:
   - **Fixable-in-draft blockers** → apply the returned corrections to the saved file, then go back to step 1 and re-run the reviewer.
   - **Needs-discovery blockers** → STOP looping. Run the `superdev:superdev` Skill (or ask the user) to obtain the missing decision, update the spec, then go back to step 1 as a fresh round 1 (no `Previous review` block) — the spec changed for a reason the prior reviewer report never covered.
- Do not advance to Handoff until the reviewer returns `REVIEW: PASS`.

## Handoff
Hanoff is not interview - use `AskUserQuestion` and let the user choose the next step:
- "Handoff to superplan" - run `superdev:superplan` skill and pass the specification filepath.
- "Done" - just stop.