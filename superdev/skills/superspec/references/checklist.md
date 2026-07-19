### Content Quality
- No implementation details (languages, frameworks, APIs)
- Focused on user value and business needs
- Outcome-driven — states the observable result, not the feature name
- Written for non-technical stakeholders
- Right-sized — detail matched to complexity (never over-spec trivial, nor under-spec hard)
- Cleanly structured — consistent, scannable Markdown headings
- Single source of truth — captures future intent; archived after ship, not a live description
- All mandatory sections completed

### Requirement Completeness
- Requirements are testable and unambiguous
- Success criteria are measurable and technology-agnostic (no implementation details)
- All acceptance scenarios are defined
- Edge cases are identified
- Scope is bounded on both sides — what's in scope and explicitly what's out
- Dependencies and assumptions identified

### Feature Readiness
- All functional requirements have clear acceptance criteria
- User scenarios cover primary flows
- Feature meets measurable outcomes defined in Success Criteria
- No implementation details leak into specification

### Severity classes

- Blocking (drives `VERDICT: FAIL`, cite the violated item plus a quote from the spec text as
  evidence): an implementation detail leaking into a requirement ("How" instead of "What/Why"); an
  acceptance criterion phrased as mechanics rather than an observable outcome; a user story with 4
  or more acceptance criteria (not right-sized); a TBD, placeholder, or unfilled mandatory section;
  an Out of Scope list with fewer than 2 entries; any checklist item above objectively violated.
- Advisory (NOTES on a PASS, never blocks): wording, structure, and right-sizing suggestions that
  do not violate a checklist item above.

### Never flag

- Content that already satisfies the checklist as written.
- Naming or phrasing preferences with no effect on testability or clarity.
- A hypothetical gap with no quoted spec text behind it.
- An alternative to a decision the spec has already fixed.

### Evidence rule

A Blocking finding must cite the violated checklist item plus a direct quote from the spec text
that shows the violation. A suspicion with no quotable spec text behind it is not Blocking: demote
it to NOTES, phrased as a question.