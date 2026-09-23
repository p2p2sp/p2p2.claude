Cut from 26312 to 11942 chars (55% reduction): removed several bullets restating single-file
mechanics (setup/viber.yml merge details, "Seven deterministic scripts", the manifest-injection
and superdev-conflict bullets both already stated verbatim in root CLAUDE.md), and merged/trimmed
the rest to one contract sentence each, dropping rationale clauses throughout.

Cut "Source files change through Edit/Write..." bullet outright: it was a near-verbatim restate
of task-coder.md's own "Implement" bullet (DoD.2 violation risk), kept only the cross-file
"git never moves" half, folded into the permissions-template bullet.

New/changed facts added per T1-T8: the TDD resume/reason exception (tdd/task-coder/implementor),
task-reviewer's open-decision Blocking rule (near its exact wording, since DoD.4 mandates it),
plan-rules.md as the fourth plugin-level reference with planner + planner-review as its two
readers, and the three agents (closeup, memory-auditor, rules-auditor) pinned to effort: medium
alongside the pre-existing "effort only from frontmatter" rule.

Dropped facts (still true, cut only for space): `<!-- source: -->` back-compat spelling, the
Files:/contract-block bracket-SHAPE App-Router aside, `adr` being weighed in planner alone, the
commit-subject-derivation bullet, the glossary-term bullet, chromium-only and e2e-test-dir
bullets (the latter duplicates root CLAUDE.md's own e2e paragraph). None of these are covered by
any T9 DoD clause.
