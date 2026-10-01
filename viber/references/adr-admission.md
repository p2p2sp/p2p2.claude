# ADR admission

The test a decision passes to become an architecture decision record under `docs/adr/`. Order: exclusions, then gates. A rule with no evidence is not met: each rule you rely on cites the plan text, the file or the line that proves it. Default: no record.

One record holds one decision, and only its part passing the test.

## Exclusions - any one true: not a record

- W1 - Behaviour-only difference: the rejected options differ only in what a user or the business sees, or in a business, security or privacy rule - never in mechanism, data structure or contract.
- W2 - Procedure, configuration, convention or scope: a configuration value, an operational procedure, a naming convention, test organisation without a tool choice, a scope or phase decision. No exception.
- W3 - Already recorded: a record under `docs/adr/` holds it. A change to it passes this same test; failing, the old record is deprecated with one sentence. A fragment changing a contract another record states is appended to that record.

## Gates - all hold, each with evidence

- B1 - Real choice: the rejected option is a different design of the same B2 category, feasible in this project; the record names the strongest one. "Later" or "without migration" never counts.
- B2 - Category: structure, runtime quality, dependencies, interfaces and contracts, or construction techniques (framework, library, tool, build and deploy process); name the category and the element.
- B3 - Reversal cost: reversal needs at least one of
  - changes in 2 or more components; a component is a separately deployed unit (an SPA and an API in one image or binary are one component) or a module whose contract others consume;
  - information loss or manual work on data; a mechanical reverse migration does not count;
  - a change to a contract consumed outside the component: an API, a token claim, a permission scope, a package format, a registration at an external party;
  - rebuilding a security boundary (tenant isolation, origin, trust in a third party) whose rationale spans several modules.
- B4 - Significance: surprising without context (a competent engineer would ask "why not the standard?"), or 2 or more of: high business value or risk, a key stakeholder concern, a new demanding runtime quality, an external dependency problem, cross-cutting impact, the first decision of its kind (never enough alone), an area that caused trouble before.
