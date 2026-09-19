
## Task 2 - Compress the review contract to its rules alone
- TDD: none
- Kind: text
- Model: opus
- Review: opus
- Covers: `Kontrakt skrócony` (#1), `Reguły bez historii` (#8)

### Dependencies
- `Inventory every rule the review contract carries today` (Task 1) - blocks: the classification this task executes is written there and is not re-decided here

### Files
- modify - superdev/references/review-contract.md (the opening preamble and all twelve `## ` sections)
- modify - docs/misc/review-contract-rule-inventory.md
- modify - superdev/CLAUDE.md (`## Contracts & invariants`)

### Task Checks
- grep -n 'Rules only' superdev/references/review-contract.md
- grep -n 'build bookkeeping' superdev/references/review-contract.md

### Approach
1. `Model: opus` and `Review: opus` because this file is the public interface twelve consumers are written against, and a rule lost here fails silently - the repo has no build and no lint to catch it. Invoke `supercc:skill-designer` (Skill tool) first: `.claude/rules/_common.md` binds every edit to an agent-facing instruction file to its rules.
2. Rewrite `superdev/references/review-contract.md` section by section, executing `docs/misc/review-contract-rule-inventory.md` row by row: a `kept` row survives as its rule alone, a `moved` row leaves the file and lands in `superdev/CLAUDE.md` `## Contracts & invariants`, a `dropped` row leaves the file. Keep every rule's own wording where it is already rule-shaped; state it in one clause where it is buried in prose.
3. Keep all twelve `## ` headings verbatim and in their present order, and keep the token `### Needs decision` spelled exactly as it stands wherever the file names that report sub-heading - out-of-scope skills, agents and references cite both by name.
4. Add the working-directory exclusion rule to `## Verdict rules` in the shape of `### Contracts`, so the four copies the reviewers carry today have an owner to point at, and widen the per-task subset paragraph of the opening preamble in the same edit: that gate binds `## Verdict rules` for the exclusion rule as well as for the one BLOCKED condition it names today.
5. Open the file with the line `Rules only: no rationale, no history - the reason a rule exists belongs in CLAUDE.md.` under the title, so the next editor holds the file's own discipline.
6. Reconcile `docs/misc/review-contract-rule-inventory.md` in this same edit wherever the execution departed from a row's classification, rewriting that row's verdict and its reason.

### Failure modes
- when a rule the inventory marks `kept` has no place left in the compressed file within its 230-line bound -> response the rule stays in the file and its row is reclassified in the same edit, log the reclassified row in `docs/misc/review-contract-rule-inventory.md`, test none - contract prose
- when a `moved` row's rationale duplicates a line `superdev/CLAUDE.md` already carries -> response drop the rationale instead of appending it and reclassify that row `dropped`, log the reclassified row in `docs/misc/review-contract-rule-inventory.md`, test none - contract prose

### Contracts
- twelve `## ` section headings of `review-contract.md`, unchanged in name and order: `## Labels`, `## Naming`, `## Finding IDs`, `## Report skeleton`, `## Gates`, `## Verdict rules`, `## Per-task gate`, `## Decisions file`, `## Notes line formats`, `## Implementor fix-mode input`, `## Implementor stop`, `## Dispatch strength` - consumed by `Give the per-task gate a Kind-aware failure pass` (Task 3), `Strip the contract copies from the three build reviewers` (Task 4)
- working-directory exclusion rule, owned by `## Verdict rules` - everything under the run's own working directory (`docs/.workflows/<run>/`, its `implementation/` subdirectory included) is build bookkeeping written by the build's own workers, so it is never part of a task's diff, never scope creep, never a changed file mapping to no task's `### Files` and never a finding of any severity, whether or not a plan task lists it - consumed by `Give the per-task gate a Kind-aware failure pass` (Task 3), `Strip the contract copies from the three build reviewers` (Task 4)
- the one pointer line every consumer replaces its own copy of that rule with, verbatim between the quotation marks and with `## Verdict rules` as a backticked span: "The contract's ## Verdict rules owns the working-directory exclusion." - consumed by `Give the per-task gate a Kind-aware failure pass` (Task 3), `Strip the contract copies from the three build reviewers` (Task 4)

### DoD
`superdev/references/review-contract.md` is at most 230 lines, carries its twelve section headings unchanged, states no reason why a rule was adopted, owns the working-directory exclusion rule under `## Verdict rules`, and its preamble names that section for the per-task gate too; every rationale a `moved` row names stands in `superdev/CLAUDE.md` `## Contracts & invariants`; and every row of `docs/misc/review-contract-rule-inventory.md` matches what the two files now hold.


### Covered criteria
1. Kontrakt skrócony - Kontrakt czytany przez pracownika budowy liczy najwyżej 230 linii wobec dzisiejszych 587.
8. Reguły bez historii - Kontrakt podaje każdą regułę bez relacji z tego, dlaczego została przyjęta.
