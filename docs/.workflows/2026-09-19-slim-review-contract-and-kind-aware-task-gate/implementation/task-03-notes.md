# Task 3 notes

## Runs

- grep -n 'Kind: text' superdev/agents/superbuild-task-reviewer.md -> exit 0
- grep -n 'Kind: scaffold' superdev/agents/superbuild-task-reviewer.md -> exit 0

Step 5's pointer target came from the contract itself, not from Task 2's `### Contracts`: no `plan` label in this dispatch, so `superdev/references/review-contract.md` was read for its section names - the only way to write a pointer that resolves.
UNDERSPECIFIED: owner section the `## Scope` exclusion pointer names - pointed at the contract's `## Verdict rules`, which holds the rule (its line "everything under the run's own working directory ... never a finding of any severity") and which the contract's opening already binds to this gate for that exclusion.

Step 5 also turned the "BLOCKED outranks FAIL" clause of `## Output format` into a pointer at `## Verdict rules`; step 5 names only the `## Report skeleton` restatements there, but the DoD's "restates no rule the contract owns" covers the per-task BLOCKED condition and that clause is part of it.

Variant points carry the labels (f)(g) scaffold and (h)(i)(j) text, continuing (a)-(e), so `## Calibration`'s "a failed point above" stays referable across all three variants.

`skill-designer` step 6 lint on the agent file: FAIL=0, one WARN on `description` word count, left standing - `.claude/rules/agent-frontmatter.md` fixes that field as the routing guard alone, and frontmatter is outside the sections `### Files` names.

## Review notes

NOTE: plan defect - the shared rule Approach step 2 prescribes ("the diff delivers what the task's `### Approach` names and nothing beyond its `### Files` - a gap either way is a finding") duplicates two `## Check` bullets and contradicts one of them: `## Check`'s "Stays in bounds" allows test/config fallout outside `### Files`, the shared rule allows none and carries no severity of its own. A later gate can raise a finding on fallout the same file calls fine.
