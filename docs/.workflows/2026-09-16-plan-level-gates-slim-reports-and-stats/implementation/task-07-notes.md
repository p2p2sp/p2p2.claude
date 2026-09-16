# Task 7 notes

## Runs
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-change -> FAIL=0 WARN=2
- none - fork skill text only, no test file changes

Approach step 2's "drop any sentence about collecting commands from tasks" had nothing to remove: no
fork carried one. The same rewrite instead dropped two clauses of the old gates paragraph that named
concepts the rewritten contract no longer owns - the re-run of the integration or e2e command on
`re-review` (now the stage mapping's business) and the single sentence for a host that documents none
(now `none - <reason>` per subsection).

Approach step 3's `none - <reason>` handling is a paragraph of its own only in
`superbuild-reviewer-spec`, where the coverage line has to carry the missing run; in
`superbuild-reviewer-change` and `simplebuild-reviewer` it is one clause of the gates paragraph
pointing at the contract, since neither owns a criterion verdict.

The lint's two WARNs stand and are pre-existing: the five-word description is the routing guard a
fork carries, and the "possible italics" hit is the `**...**` of the `## Review` axis labels.
