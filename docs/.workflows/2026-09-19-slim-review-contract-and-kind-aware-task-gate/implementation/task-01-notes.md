# Task 1 notes

## Runs

- grep -n 'kept' docs/misc/review-contract-rule-inventory.md -> exit 0
- grep -n 'dropped' docs/misc/review-contract-rule-inventory.md -> exit 0

UNDERSPECIFIED: coverage of the contract's pre-heading title block (lines 1-29, no `## ` heading) - inventoried under a leading `## Preamble` heading, so the file carries thirteen headings against Approach 3's twelve; that block states obligations no other section repeats (single-owner/no-copy, the per-task gate's binding subset, stack-agnostic, the `<workdir>` definition) and criterion 9 admits no unaccounted rule.

UNDERSPECIFIED: how prose that is not a rule is handed to Task 2 - every rationale block got its own `dropped` row rather than no row at all, so Task 2 has one explicit instruction per block of the pre-change file instead of inferring deletion from silence; the row's rule clause names the rationale, not an obligation.

UNDERSPECIFIED: which section keeps a rule two sections state - the section that defines the label, the file or the report shape it belongs to keeps it, the other gets a `dropped` row naming that owner (e.g. `range:` exception kept in `## Labels`, dropped in `## Per-task gate`; the fix-mode note list kept in `## Notes line formats`, dropped in `## Implementor fix-mode input`).

UNDERSPECIFIED: how many rows qualify for `moved` under Approach 5 - two, both rationale with no runtime obligation left in them (the preamble's consumer list, the `minor:` deliberate-gap paragraph); every other rationale row is `dropped`, since `superdev/CLAUDE.md` is worth enlarging only where a later editor would otherwise undo a deliberate gap.

Approach 2's "twelve `## ` sections" count holds for the file as it stands: `## Labels`, `## Naming`, `## Finding IDs`, `## Report skeleton`, `## Gates`, `## Verdict rules`, `## Per-task gate`, `## Decisions file`, `## Notes line formats`, `## Implementor fix-mode input`, `## Implementor stop`, `## Dispatch strength`.

The `### Failure modes` conflict row was not needed: no two sections state a rule in terms that contradict each other, only in terms that repeat.
