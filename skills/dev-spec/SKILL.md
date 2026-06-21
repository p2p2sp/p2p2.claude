---
name: dev-spec
description: Specification and PRD writing expert with spec-driven-development practices. Use this skill whenever the user asks for a Spec, Specification, PRD, requirements document, feature spec, or user-story breakdown. Triggers include "spec", "specification", "PRD", "requirements doc", "feature spec", "user story", "acceptance criteria". Enforces working-backwards framing, declarative outcome-statement AC, INVEST stories, explicit anti-patterns, no TBD. Do NOT write specs ad-hoc — use this skill first; it forbids TBD and forces working-backwards framing. Do NOT use for implementation plans — use the `extraplan` skill instead. Trigger applies in any language and to descriptive phrasing too.
model: opus
effort: xhigh
user-invocable: false
---

## 1: Deep codebase exploration (silent)
Run `Explore` agents and `Read` to map relevant modules + public APIs, existing patterns, `.claude/rules/*` conventions, integration points. Do NOT present findings — use them in later phases.

## 2: Working-backwards framing (forcing function)
Before any architectural discussion, answer in 1-2 sentences each:
- **Who is the specific customer / user that benefits?** (A persona, not "everyone".)
- **What changes for them when this ships?** (Concrete, observable change.)

If unable to answer these crisply, the spec is not ready — keep interviewing. This block must end up reflected in the WHAT/WHY section of the final draft.

## 3: Plan a Specification
Ask one question at a time. Propose 2-3 approaches with trade-offs, lead with the recommendation. Always number each option presented so that the user can easily point to the answer. Skip sub-phases that don't apply. Use `WebSearch` for technical research when needed.

### 3.1 Architectural decisions
Modules/classes to change/create, contracts, public API signatures. **Spec the area of change, not the whole system.**

### 3.2 Data flow & error handling
End-to-end flow (input → output, step by step). Error paths, edge cases, handling.

### 3.3 Testing strategy
What to test, which existing patterns to follow, acceptance criteria.

End each sub-phase with explicit user confirmation. Accommodate revisions to earlier decisions naturally.

## 4: Quality rules (every rule must hold in the final draft)
- **User stories: INVEST** — Independent, Negotiable, Valuable, Estimable, Small, Testable.
- **Acceptance criteria: outcome statement, declarative.** A single sentence describing the observable outcome / state that must be true after the change. No `Given/When/Then` keywords. Describe business outcome, not UI mechanics. Good: "Checking out an empty cart ends with a validation error visible to the user." Bad: "User clicks the checkout button and a popup appears."
- **Max 3 AC per story.** 4+ → split the story.
- **Every AC is testable** — sketch the failing test before implementation.
- **WHAT/WHY**: problem from user perspective + business value + the customer-facing change from Phase 2. **No solutioning here.**
- **HOW**: every new interface/method has a full signature; every module a single responsibility statement.
- **Versions / dependencies explicit when they matter** (e.g. "Node ≥ 20", "gh CLI ≥ 2.40", "Python 3.12").
- **Out of Scope is non-empty.** Listing fewer than 2 skips means insufficient thought.

## 5: Anti-patterns (forbidden in the final draft)
- Vague language: "make it better", "more robust", "improve performance" without targets.
- Imperative AC ("user clicks X") instead of behavioral outcomes.
- Acceptance criteria written with `Given/When/Then` keywords (use a single outcome statement instead).
- Implementation leakage in the WHAT/WHY section.
- "TBD" / "later" / "details to follow" / "we'll see".
- A single user story with 4+ AC.
- Empty Out-of-Scope.

## 6: Self-review (red team)
Re-read the draft as a hostile reviewer:
1. For every AC, sketch the failing test. If not possible, fix the AC.
2. Is there a persona / edge case the spec does not cover?
3. Does the Phase 2 working-backwards answer actually appear in WHAT/WHY?
4. Are all Quality rules and zero Anti-patterns satisfied?

Fill any gap directly or ask the user. Do NOT proceed to publication while any rule fails.

## 7: Issue publication
1. Detect language and load template:
   - Polish → `templates/specification.pl.md`
   - English → `templates/specification.en.md`
   - Unclear → ask. Do not translate the template.
2. Render the spec into the template — produce final `<title>` and `<body>`.
3. Return the Issue URL. MUST Stop — do not implement anything.

## 8: Spec → doc ship-time handoff (boundary)
A spec is **future intent**, not live documentation. After the feature ships, its *realized behaviour* promotes into `.superdev/documentation/` — the current-functional-truth layer — via the dev pipeline (`dev-improver` syncs each task's `## Docs`) or an interactive `superdev:mem-doc` run. The spec itself is then **archived, not kept as live docs**: do not treat this issue as the standing description of what the feature does today. Keep the spec lean and forward-looking; the "what it does now" lives in `.superdev/documentation/`.
