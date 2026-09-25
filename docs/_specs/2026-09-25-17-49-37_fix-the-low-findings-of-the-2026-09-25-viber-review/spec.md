# Fix the low findings of the 2026-09-25 viber review

Build: skill `implementor`

## Goal

The 2026-09-25 review of the viber plugin (`.temp/viber-review/report.md`) left nineteen low findings, one informational note and two drifts in the dev-time rules open; the medium ones were closed by the previous run. Each is a small edge case in a bundled script, an agent or skill contract that does not match what its caller sends, or documentation that says something the plugin does not do. This run closes every one of them, one finding per task, so each fix is reviewed and committed on its own.

## Acceptance criteria

1. L1: landing again the same plan-mode source whose `into:` draft already holds that plan reports the run as already existing, a different plan onto a non-draft is still refused, and the implementor reports the reason and stops on any landing failure it does not handle by name.
2. L2: `commit-task.sh --landed` records a task done when the named commit is a merge commit whose first-parent diff touches the task's files.
3. L3: `plan-index.sh` rejects a `<!-- TASK -->` block that sits above the `## Tasks` heading.
4. L4: the `--split` decomposition commit carries only `plan.md`, `spec.md`, `tasks/` and `status.md`, never a `work/` trail file.
5. L5: a Skill tool call to another plugin's `planner` (`xyz:planner`) does not arm the plan gate; `viber:planner` and bare `planner` still do.
6. L6: `memory-map.sh` treats a tracked `CLAUDE.md` that is deleted in the tree as absent, and prints nothing on stderr for it.
7. L7: `issue-templates.sh` reads a YAML block list whose `- item` lines sit in the key's own column.
8. L8: the `create-issue.sh` header states that `gh` resolves the repository from the cwd.
9. L9: no viber agent carries `color: red`.
10. L10: `task-coder` treats a report with no task file as a test-run report: every failure is Blocking and the failing tests are re-run as proof.
11. L11: the plan gate's refusal for the planner branch names the plan path, `refs:` and `memory:`.
12. L12: `rules-auditor` scores `GONE` from the tracked-file count the rules map measured, which the rules skill passes in its dispatch, and `rules-writer` removes a rule on the map's count, not on a `Glob`.
13. L13: `task-reviewer` and `test-runner` open with "Input is fully resolved - never ask the user."
14. L14: the planner's `plan-index.sh` line double-quotes the plan path.
15. L15: the viber README says the script calls made after a prose question (triage, intent, prototype, ADR tasks) rely on the bare `Bash` allow that `/viber:setup` installs.
16. L16: the `commit` skill's `allowed-tools` carries one pattern each for `commit.sh` and `commit-selfcheck.sh`.
17. L17: the `fixer` description excludes a fix the user asked to apply directly.
18. L18: the planner states the branch question once.
19. L19a: the viber README and `usage.html` describe the `reset` mode of `/viber:memory` and `/viber:rules`.
20. L19b: `usage.html` describes the settings merge as viber's value winning a conflict, as the README does.
21. L19c: `templates/viber.yml`, `usage.html` and the `bootstrap.sh` header say a removed child of `tiers:` or `branching:` is not restored and resolves to its default.
22. L19d: the README `issues` switch row names `/viber:prototype`.
23. L19e: the viber README and `usage.html` say how to continue a draft and how to resume an interrupted build.
24. L19f: the root README drops the retired "same trip" comparison and names viber's optional `node` and Playwright.
25. Informational: the `issue-facts.sh` and `issue-templates.sh` headers name their system temp file and its trap cleanup.
26. Dev-time rules: `shell-preload-contract.md` and `shell-script-header.md` name `scripts/open-page.sh` at its real path and the `${CLAUDE_PLUGIN_ROOT}` prefix setup really uses.
27. Dev-time rules: `shell-preload-contract.md` names `prototype` among the callers of `issue-facts.sh` and `post-comment.sh` and among the call sites.

## Scope

### File map

- modify - viber/scripts/plan-path.sh - `--land` idempotence for a re-landed `into:` source
- modify - viber/skills/implementor/SKILL.md - handling of every `--land` exit
- modify - viber/scripts/commit-task.sh - `--landed` on a merge commit
- modify - viber/scripts/plan-index.sh - TASK position check, `--split` staging
- modify - viber/hooks/scripts/plan-gate.sh - planner match, refusal wording
- modify - viber/skills/memory/scripts/memory-map.sh - deleted tracked node, stderr
- modify - viber/scripts/issue-templates.sh - unindented list items, temp file note
- modify - viber/scripts/create-issue.sh - header cwd line
- modify - viber/scripts/issue-facts.sh - temp file note
- modify - viber/agents/memory-node-writer.md, task-coder.md, rules-auditor.md, rules-writer.md, task-reviewer.md, test-runner.md - agent contracts
- modify - viber/skills/rules/SKILL.md, planner/SKILL.md, commit/SKILL.md, fixer/SKILL.md - skill contracts
- modify - viber/README.md, viber/skills/setup/assets/usage.html, viber/skills/setup/templates/viber.yml, viber/skills/setup/scripts/bootstrap.sh, README.md - documentation
- modify - .claude/rules/shell-preload-contract.md, .claude/rules/shell-script-header.md - dev-time rules
- modify - tests/viber/plan-path.test.ts, commit-task.test.ts, plan-index.test.ts, plan-gate.test.ts, memory-map.test.ts, issue-templates.test.ts - regression tests

### Out of scope

- The medium findings, already closed by the previous run.
- Any version bump; the release workflow owns it.
- Changing the form of questions: prose questions stay.
- `viber/CLAUDE.md`: the memory switch reserves it for the build's close, which folds in L15's dependency note, L16's `allowed-tools` change and L5's narrowed planner match on the "Plan gate" line.
- Every plugin other than viber.
