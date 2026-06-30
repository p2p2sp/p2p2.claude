---
name: superspec
description: Specification writing expert with spec-driven-development practices. Use this skill whenever the user asks for a Spec, Specification, PRD, requirements document, feature spec, or user-story breakdown. Triggers include "spec", "specification", "prd", "requirements doc", "feature spec", "user story", "acceptance criteria". Do NOT write specs ad-hoc — use `superdev` skill first; it forbids TBD and forces working-backwards framing. Do NOT use for implementation plans — use the `superplan` skill instead.
model: opus
effort: xhigh
user-invocable: false
---

**CRITICAL**: Run `ExitPlanMode` first, if plan mode is active - you need to save the spec to the file.

## Pre-spec context

Do not re-interview the user — discovery belongs to the superdev skill (which may have run, or the user may have skipped). Use whatever context the session already holds; if invoked directly with no prior interview, run the `superdev:superdev` Skill.

## SuperSpec Checklist
Write specification document using superspec template. Use gathered infomration during interview. A good specification is short enough for a human to read in one sitting, yet precise enough to implement without guessing. It should be:

- **Outcome-driven** — states the observable result ("user can add a task, it persists"), not the feature name.
- **Scoped on both sides** — lists what's in scope and explicitly what's out of scope.
- **Concrete about the stack** — names tools and versions ("React 18 + TypeScript"), not "a React app".
- **Decisive** — locks in decisions already made (schema, libraries) so the agent doesn't re-decide.
- **Behaviorally precise** — defines inputs/outputs, error shapes, pre/postconditions, and state changes.
- **Verifiable** — gives concrete acceptance criteria ("400 with this exact JSON"), not "does it work".
- **Example-first** — one real code or output snippet beats three paragraphs of description.
- **Cleanly structured** — consistent Markdown headings the everyone can scan.
- **Right-sized** — detail matched to complexity; never over-specs a trivial task or under-specs a hard one.
- **The single source of truth** — spec is future intent, not live doc — after the feature ships it is archived, never kept as the standing description of what the feature does today.

## Smell test
- Is any ambiguous or conflicts with the codebase → STOP and run `superdev:superdev` Skill - do not invent scope.
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
1. Detect language, load template (Polish → `templates/specification.pl.md`, English or unclear → `templates/specification.en.md`). Do not translate the template.
2. Render into the template → final `<title>` + `<body>`.
3. Return the Issue URL. Stop — implement nothing.