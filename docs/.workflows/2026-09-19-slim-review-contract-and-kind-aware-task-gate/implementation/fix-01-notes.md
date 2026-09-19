# fix 01 notes

## Runs

- grep -n 'Kind: text' superdev/agents/superbuild-task-reviewer.md -> exit 0 (2 lines: 48, 73)
- grep -n 'Kind: scaffold' superdev/agents/superbuild-task-reviewer.md -> exit 0 (2 lines: 48, 69)

I1: fixed - no test: the finding is a prose contradiction between two paragraphs of an agent body; `tests/` asserts over scripts and over orphan closing tags only, and no assertion there can express that two tolerances agree.
M1: skipped - Minor, no `minor:` label in this dispatch.
M2: skipped - Minor, no `minor:` label in this dispatch.
M3: skipped - Minor, no `minor:` label in this dispatch.

touched: superdev/agents/superbuild-task-reviewer.md

UNDERSPECIFIED: which of I1's two offered fixes - took the alternative (shared rule deleted, `## Check` sole owner of both clauses) over the primary (exception added, `### Approach` half dropped), because the primary leaves the surviving half a verbatim restatement of `## Check`'s "Stays in bounds" first clause, which `.claude/rules/_common.md` forbids and which this change exists to remove; `## Failure pass` now says in one clause that it carries no shared point, so the deleted rule is not re-added by a later reader. Deviates from Task 3 `### Approach` step 2 ("one shared rule plus three variants"): the three `Kind:` variants and their selection are untouched, only the shared rule is gone.
