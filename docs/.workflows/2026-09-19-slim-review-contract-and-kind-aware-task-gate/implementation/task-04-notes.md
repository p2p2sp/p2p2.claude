# Task 4 - Strip the contract copies from the three build reviewers

## Runs
- grep -n 'where the changed file is of that nature' superdev/agents/superbuild-reviewer-change.md -> exit 0 (match at :53)
- grep -n 'where the changed file is of that nature' superdev/agents/simplebuild-reviewer.md -> exit 0 (match at :64)
- grep -n 'owns the working-directory exclusion' superdev/agents/superbuild-reviewer-spec.md -> exit 0 (match at :54)

Step 1: the one-line replacement absorbed two further sentences of each `## Gates` body beyond the two paragraphs named - "you run no gate command yourself" and, in the spec reviewer, the all-`none` paragraph's "never met by assumption" - both already owned by the contract's `## Gates` (its Transport paragraph and its bullet on a criterion whose confirmation needs a run); leaving them standing would have been the copy the step removes.

Step 3: the `**Architecture:**` block is dropped, not trimmed, in both files. What survives removing general engineering knowledge is cross-unit contracts and seams, and each file already owns that twice - `## Scope`'s `final` integration mandate and `## Calibration`'s "judge the whole delivery" line. `**Code quality:**` absorbed its one repo-specific clause (consistency with the surrounding code's established patterns). Three axis blocks remain per file, and the step 4 line reads "Every axis above" over those three.

Step 3 in `simplebuild-reviewer.md`: `all tests passing` dropped from the testing axis - the round's gate block settles it, and `## Gates` is its owner.

UNDERSPECIFIED: wording of the exclusion pointer line - Task 2's `### Contracts` text was not among this dispatch's labels; wrote `The contract's `## Verdict rules` owns the working-directory exclusion.` into all three files, `## Verdict rules` being the section of `superdev/references/review-contract.md` that actually carries the `<workdir>` rule after Task 2.

Step 6: `superdev/agents/CLAUDE.md` calls the reviewer the `Kind:` marker's "third reader", continuing the count the `superbuild-task-reviewer.md` entry point opened with "a second reader here".

`superdev/agents/superbuild-reviewer-spec.md` and `superbuild-reviewer-change.md` still lint WARN "possible italics with *...*" on their pre-existing `**Label:**` axis headers - the shape the whole agent dir uses, untouched.
