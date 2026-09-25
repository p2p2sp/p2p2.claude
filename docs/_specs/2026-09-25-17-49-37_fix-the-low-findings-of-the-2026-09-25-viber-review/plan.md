---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-25-17-49-37_fix-the-low-findings-of-the-2026-09-25-viber-review/plan.md
---

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
## Tasks

<!-- TASK -->
### T1 - Keep a re-landed draft round idempotent
- TDD: required
- Covers: #1
- Uses: none
- Depends-on: none
- Files: viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts, viber/skills/implementor/SKILL.md
- Delivers: `--land` of a plan-mode source carrying `into:`, whose target `plan.md` already holds that same plan (identical apart from its `source:` line), prints the target with `state: existing` and exits 0; a source differing from that target, onto a target with tasks, a decomposition or progress, still exits 4; the script header's idempotence and exit lines match; the implementor's landing step reports stderr and stops on any non-zero `--land` exit other than 3 and 6.
- Verification: node --test tests/viber/plan-path.test.ts && grep -n "Exit 3\|Exit 6\|non-zero" viber/skills/implementor/SKILL.md -> every test passes, including a new one landing the same `into:` source twice and one landing a changed source onto a decomposed draft, and the implementor's landing step names the stop on any other non-zero exit
- DoD: re-landing the same `into:` source exits 0 with `state: existing`; a changed source onto a non-draft exits 4; the header describes both; implementor/SKILL.md names the stop on any other non-zero exit
<!-- /TASK -->

<!-- TASK -->
### T2 - Accept a merge commit as the landed commit
- TDD: required
- Covers: #2
- Uses: none
- Depends-on: none
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: `--landed <sha>` compares the task's files against the commit's first parent, so a merge commit that brought them in marks the task done; a merge touching none of them still exits 4.
- Verification: node --test tests/viber/commit-task.test.ts -> every test passes, including a new one landing a task through a `--no-ff` merge commit
- DoD: `--landed` with a merge commit carrying the task's files records the task done; a merge carrying none of them exits 4; the header's `--landed` paragraph mentions merge commits
<!-- /TASK -->

<!-- TASK -->
### T3 - Refuse a task block above the Tasks heading
- TDD: required
- Covers: #3
- Uses: none
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: validation fails with an error naming the task when a `<!-- TASK -->` marker comes before the first `## Tasks` heading, with the same exit as the other validation failures, writing nothing.
- Verification: node --test tests/viber/plan-index.test.ts -> every test passes, including a new one with a TASK block above `## Tasks`
- DoD: a plan with a TASK block above `## Tasks` is refused with a non-zero exit and an error naming it; no `spec.md` or `tasks/` is written for it; the header lists the refusal
<!-- /TASK -->

<!-- TASK -->
### T4 - Stage only the decomposition when splitting a plan
- TDD: required
- Covers: #4
- Uses: none
- Depends-on: T3
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: the `--split` commit stages `plan.md`, `spec.md`, `tasks/` and `status.md` of the run directory and nothing else, so a `work/` trail file stays out of it.
- Verification: node --test tests/viber/plan-index.test.ts -> every test passes, including a new one where an untracked `work/T3-notes.md` stays out of the decomposition commit
- DoD: the decomposition commit lists no `work/` path; the `work/` file stays untracked; the existing "committed with the plan" test still passes
<!-- /TASK -->

<!-- TASK -->
### T5 - Arm the plan gate only for viber's planner
- TDD: required
- Covers: #5
- Uses: none
- Depends-on: none
- Files: viber/hooks/scripts/plan-gate.sh, tests/viber/plan-gate.test.ts
- Delivers: the Skill tool match arms the gate for `viber:planner` and bare `planner` only; another plugin's `planner` leaves `ExitPlanMode` allowed.
- Verification: node --test tests/viber/plan-gate.test.ts -> every test passes, including a new one where `xyz:planner` does not arm the gate
- DoD: `xyz:planner` yields allow; `viber:planner` and `planner` still arm the gate
<!-- /TASK -->

<!-- TASK -->
### T6 - Count a deleted memory node as absent
- TDD: required
- Covers: #6
- Uses: none
- Depends-on: none
- Files: viber/skills/memory/scripts/memory-map.sh, tests/viber/memory-map.test.ts
- Delivers: an ancestor or root `CLAUDE.md` that is tracked but deleted in the tree adds no size to a chain and does not make the state `complete`; measuring a missing file writes nothing to stderr.
- Verification: node --test tests/viber/memory-map.test.ts -> every test passes, including a new one with the root `CLAUDE.md` deleted but not staged
- DoD: with the root node deleted the state is not `complete`; stderr is empty; the existing unstaged-reset test still passes
<!-- /TASK -->

<!-- TASK -->
### T7 - Read unindented YAML list items in issue templates
- TDD: required
- Covers: #7
- Uses: none
- Depends-on: none
- Files: viber/scripts/issue-templates.sh, tests/viber/issue-templates.test.ts
- Delivers: with a list key open, a `- item` line in the key's own column is an item, for labels, assignees and projects alike.
- Verification: node --test tests/viber/issue-templates.test.ts -> every test passes, including a new one with `labels:` followed by `- bug` in the same column
- DoD: `LABELS=bug` for the unindented list; the indented and inline forms still parse the same
<!-- /TASK -->

<!-- TASK -->
### T8 - State the cwd create-issue really depends on
- TDD: none
- Covers: #8
- Uses: none
- Depends-on: none
- Files: viber/scripts/create-issue.sh
- Delivers: the header's `cwd` line says `gh` resolves the repository from the cwd, as `issue-facts.sh` states it.
- Verification: grep -n "cwd\|gh issue create" viber/scripts/create-issue.sh -> the header `cwd` line names the repository of the cwd, beside the `gh issue create` call carrying no `--repo`
- DoD: the header no longer says the cwd is irrelevant; it names `gh` resolving the repository from the cwd
<!-- /TASK -->

<!-- TASK -->
### T9 - Give memory-node-writer a color other than red
- TDD: none
- Covers: #9
- Uses: none
- Depends-on: none
- Files: viber/agents/memory-node-writer.md
- Delivers: the agent's `color:` is `orange`.
- Verification: grep -n "^color:" viber/agents/*.md -> no line reads `red`, and memory-node-writer.md reads `orange`
- DoD: memory-node-writer.md carries `color: orange`; no viber agent carries `color: red`
<!-- /TASK -->

<!-- TASK -->
### T10 - Tell the repair coder how to read a test-run report
- TDD: none
- Covers: #10
- Uses: none
- Depends-on: none
- Files: viber/agents/task-coder.md
- Delivers: one sentence stating that a report with no task file is a test-run report: every failure in it is Blocking, and re-running the failing tests is the proof; the repair sentence shared with `.claude/rules/review-findings.md` stays verbatim.
- Verification: grep -n "test-run report" viber/agents/task-coder.md && grep -n "Repair dispatch" viber/skills/implementor/SKILL.md -> the coder names the test-run report beside the implementor's repair dispatch carrying no `task:`
- DoD: task-coder.md names a report without a task file as a test-run report; it makes every failure Blocking; it names re-running the failing tests as proof; the shared repair sentence is unchanged
<!-- /TASK -->

<!-- TASK -->
### T11 - Name refs and memory in the plan gate's refusal
- TDD: required
- Covers: #11
- Uses: none
- Depends-on: T5
- Files: viber/hooks/scripts/plan-gate.sh, tests/viber/plan-gate.test.ts
- Delivers: on the planner branch, every refusal asking for a `planner-review` dispatch names the plan path, `refs:` and `memory:`, as `planner-review.md` expects its input; the plain branch's wording is unchanged.
- Verification: node --test tests/viber/plan-gate.test.ts -> every test passes, including a new one asserting the planner refusal names `refs:` and `memory:`
- DoD: the planner refusal names the plan path, `refs:` and `memory:`; the plain-plan-review refusal is unchanged
<!-- /TASK -->

<!-- TASK -->
### T12 - Score gone rules from the map's tracked count
- TDD: none
- Covers: #12
- Uses: C1
- Depends-on: none
- Files: viber/skills/rules/SKILL.md, viber/agents/rules-auditor.md, viber/agents/rules-writer.md
- Delivers: the rules skill's auditor dispatch carries the map's tracked-file count per rule; the auditor scores `GONE` from that count instead of a `Glob`; the writer's "globs now match no file" removal case rests on the map's `matches 0` or `dead:` line instead of a `Glob` confirmation, and its "convention the build removed" case stays as it is.
- Verification: grep -n "matches" viber/skills/rules/SKILL.md viber/agents/rules-auditor.md viber/agents/rules-writer.md viber/skills/rules/scripts/rules-map.sh -> the dispatch and both agents name the `matches` count the map's `rule:` line declares
- DoD: the dispatch block carries a `matches:` line and its line count is updated; the auditor's `GONE` rests on that line; the writer's removal rests on the map, not on `Glob`
<!-- /TASK -->

<!-- TASK -->
### T13 - Open task-reviewer and test-runner with the resolved-input line
- TDD: none
- Covers: #13
- Uses: none
- Depends-on: none
- Files: viber/agents/task-reviewer.md, viber/agents/test-runner.md
- Delivers: each agent's opening paragraph carries "Input is fully resolved - never ask the user." right after its role sentence.
- Verification: grep -n "Input is fully resolved - never ask the user" viber/agents/task-reviewer.md viber/agents/test-runner.md .claude/rules/agent-frontmatter.md -> both agents carry the sentence the rule requires
- DoD: task-reviewer.md carries the sentence in its opening paragraph; test-runner.md does too
<!-- /TASK -->

<!-- TASK -->
### T14 - Quote the plan path passed to plan-index
- TDD: none
- Covers: #14
- Uses: none
- Depends-on: none
- Files: viber/skills/planner/SKILL.md
- Delivers: the planner's `plan-index.sh` line double-quotes `<plan-path>`, like its `plan-path.sh` lines.
- Verification: grep -n 'plan-index.sh" "<plan-path>"' viber/skills/planner/SKILL.md && grep -n 'plan-index.sh" "<plan>"' viber/skills/implementor/SKILL.md -> both skills quote the argument
- DoD: the planner's plan-index line quotes the plan path; no unquoted `plan-index.sh" <plan-path>` remains
<!-- /TASK -->

<!-- TASK -->
### T15 - Document the bare Bash allow the prose-question calls rely on
- TDD: none
- Covers: #15
- Uses: none
- Depends-on: none
- Files: viber/README.md
- Delivers: one sentence in the README's install notes: script calls made after a prose question in triage, intent, prototype and the ADR tasks rely on the bare `Bash` allow `/viber:setup` installs, and without it each asks for permission once.
- Verification: grep -n '"Bash",' viber/skills/setup/templates/settings.json && grep -n "Bash" viber/README.md -> the README names the bare `Bash` allow the settings template really carries
- DoD: the README names the bare `Bash` allow; it names the four callers; it says what happens without it
<!-- /TASK -->

<!-- TASK -->
### T16 - Pre-approve the commit skill's runtime scripts
- TDD: none
- Covers: #16
- Uses: none
- Depends-on: none
- Files: viber/skills/commit/SKILL.md
- Delivers: `allowed-tools` gains `Bash(${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh:*)` and `Bash(${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-selfcheck.sh:*)`, keeping the bare `Bash` its inline preloads need.
- Verification: grep -n "commit.sh\|commit-selfcheck.sh" viber/skills/commit/SKILL.md && ls viber/skills/commit/scripts/commit.sh viber/skills/commit/scripts/commit-selfcheck.sh -> each script called in the body has its pattern in `allowed-tools`
- DoD: the commit.sh pattern is in `allowed-tools`; the commit-selfcheck.sh pattern is in `allowed-tools`; the bare `Bash` stays
<!-- /TASK -->

<!-- TASK -->
### T17 - Keep direct fixes out of the fixer
- TDD: none
- Covers: #17
- Uses: none
- Depends-on: none
- Files: viber/skills/fixer/SKILL.md
- Delivers: the description ends with a sentence excluding a fix the user asked to apply directly, in the phrasing the intent description uses for a direct change.
- Verification: grep -n "^description:" viber/skills/fixer/SKILL.md viber/skills/intent/SKILL.md -> both descriptions exclude a change the user asked to make directly
- DoD: the fixer description excludes a direct fix; the rest of the description is unchanged
<!-- /TASK -->

<!-- TASK -->
### T18 - State the planner's branch question once
- TDD: none
- Covers: #18
- Uses: none
- Depends-on: T14
- Files: viber/skills/planner/SKILL.md
- Delivers: the branch question lives in one paragraph reached by both paths: a draft asks it and goes to step 3, a full plan asks it once `plan-index.sh` has passed and before the review; every condition of the two current copies survives.
- Verification: grep -c 'plan-path.sh" --branch' viber/skills/planner/SKILL.md && grep -n -- "--branch" viber/scripts/plan-path.sh -> the skill counts 1 `--branch` call, and the script declares that option
- DoD: `--branch` appears in one paragraph; the draft path still reaches step 3 after it; the full plan still asks it after `plan-index.sh` passes and before the review
<!-- /TASK -->

<!-- TASK -->
### T19 - Describe the reset mode of memory and rules
- TDD: none
- Covers: #19
- Uses: none
- Depends-on: T15
- Files: viber/README.md, viber/skills/setup/assets/usage.html
- Delivers: the README and both languages of `usage.html` say that `/viber:memory` and `/viber:rules` also offer `reset`, which deletes the whole layer and starts from zero, refused while a target holds uncommitted work.
- Verification: grep -n "reset" viber/README.md viber/skills/setup/assets/usage.html viber/skills/memory/SKILL.md viber/skills/rules/SKILL.md -> the README and usage.html name the `reset` mode both skills declare
- DoD: the README names reset for both skills; usage.html names it in English; usage.html names it in Polish
<!-- /TASK -->

<!-- TASK -->
### T20 - Describe the settings merge as viber winning a conflict
- TDD: none
- Covers: #20
- Uses: none
- Depends-on: T19
- Files: viber/skills/setup/assets/usage.html
- Delivers: both languages of `usage.html` describe the merge as the README does: viber's value wins a conflict and permission lists only gain entries.
- Verification: grep -n "wins" viber/README.md viber/skills/setup/assets/usage.html viber/skills/setup/SKILL.md -> usage.html states the conflict rule the setup skill and README state
- DoD: the English text no longer says "fill in what is missing" alone; the Polish text matches it
<!-- /TASK -->

<!-- TASK -->
### T21 - Say which removed config keys setup restores
- TDD: none
- Covers: #21
- Uses: none
- Depends-on: T20
- Files: viber/skills/setup/templates/viber.yml, viber/skills/setup/assets/usage.html, viber/skills/setup/scripts/bootstrap.sh
- Delivers: the template header, both languages of `usage.html` and the `bootstrap.sh` header say a removed top-level key or `directories:` child is restored, while a removed child of `tiers:` or `branching:` is not and resolves to its default.
- Verification: grep -n "tiers\|branching" viber/skills/setup/templates/viber.yml viber/skills/setup/assets/usage.html viber/skills/setup/scripts/bootstrap.sh -> each text names the group exception the `bootstrap.sh` code applies to `directories` only
- DoD: viber.yml's header states the exception; usage.html states it in English and Polish; the bootstrap.sh header's restore sentence states it; tests/viber/bootstrap.test.ts still passes
<!-- /TASK -->

<!-- TASK -->
### T22 - Name prototype in the issues switch row
- TDD: none
- Covers: #22
- Uses: none
- Depends-on: T19
- Files: viber/README.md
- Delivers: the README `issues` row says `prototype` can start from an issue and post its mockup to it, as `usage.html` already lists it.
- Verification: grep -n "issues" viber/README.md viber/skills/prototype/SKILL.md -> the README row names prototype, which reads the `issues` switch
- DoD: the `issues` row names `prototype`; the rest of the row is unchanged
<!-- /TASK -->

<!-- TASK -->
### T23 - Say how to continue a draft and resume a build
- TDD: none
- Covers: #23
- Uses: none
- Depends-on: T21, T22
- Files: viber/README.md, viber/skills/setup/assets/usage.html
- Delivers: the README and both languages of `usage.html` say a draft continues with `/viber:intent` pointed at it, and an interrupted build resumes by asking Claude to continue the build, which reopens the run most recently worked on.
- Verification: grep -n "draft\|resume" viber/README.md viber/skills/setup/assets/usage.html viber/skills/implementor/SKILL.md -> the docs name the draft and resume paths the implementor skill states
- DoD: the README names both paths; usage.html names both in English; usage.html names both in Polish
<!-- /TASK -->

<!-- TASK -->
### T24 - Correct viber's row and requirements in the catalog README
- TDD: none
- Covers: #24
- Uses: none
- Depends-on: none
- Files: README.md
- Delivers: viber's catalog row describes viber on its own, with no comparison to the retired plugin; viber's requirements row names `gh` plus optional `node` (settings merge) and Playwright (`/viber:e2e`).
- Verification: grep -n "viber" README.md && grep -n "command -v node" viber/skills/setup/scripts/merge-settings.sh -> the catalog names the optional node the merge script checks for
- DoD: "The same trip" is gone; the requirements row names node and Playwright as optional
<!-- /TASK -->

<!-- TASK -->
### T25 - Note the system temp file in the issue script headers
- TDD: none
- Covers: #25
- Uses: none
- Depends-on: T7
- Files: viber/scripts/issue-facts.sh, viber/scripts/issue-templates.sh
- Delivers: each header's contract says the script keeps one temp file from `mktemp` in the system temp directory (issue-templates falling back to `$TMPDIR` or `/tmp`), removed by its `EXIT` trap, outside the host repository by design.
- Verification: grep -n "mktemp" viber/scripts/issue-facts.sh viber/scripts/issue-templates.sh -> each file shows a header line and the code line it describes
- DoD: the issue-facts.sh header names its temp file and trap; the issue-templates.sh header names its temp file, fallback and trap
<!-- /TASK -->

<!-- TASK -->
### T26 - Correct open-page and merge-settings paths in the shell rules
- TDD: none
- Covers: #26
- Uses: none
- Depends-on: none
- Files: .claude/rules/shell-preload-contract.md, .claude/rules/shell-script-header.md
- Delivers: both rules name `scripts/open-page.sh` at its real path and say setup calls `merge-settings.sh` and `open-page.sh` through `${CLAUDE_PLUGIN_ROOT}`; every script count on the lines touched matches the tree.
- Verification: grep -n "open-page\|merge-settings" .claude/rules/shell-preload-contract.md .claude/rules/shell-script-header.md viber/skills/setup/SKILL.md -> the rules name the paths and prefix setup/SKILL.md really uses
- DoD: no rule names `skills/setup/scripts/open-page.sh`; the preload rule names `${CLAUDE_PLUGIN_ROOT}` for both setup scripts; the counts match the tree
<!-- /TASK -->

<!-- TASK -->
### T27 - Name prototype among the issue script callers
- TDD: none
- Covers: #27
- Uses: none
- Depends-on: T26
- Files: .claude/rules/shell-preload-contract.md
- Delivers: the rule lists `prototype` as a caller of `issue-facts.sh` and `post-comment.sh`, and `prototype/SKILL.md` among the call sites.
- Verification: grep -n "issue-facts.sh\|post-comment.sh" .claude/rules/shell-preload-contract.md viber/skills/prototype/SKILL.md -> the rule names prototype, which calls both scripts
- DoD: prototype is listed for issue-facts.sh; prototype is listed for post-comment.sh; prototype/SKILL.md is among the call sites
<!-- /TASK -->

## Contracts

### C1 - Rules auditor dispatch

File: viber/skills/rules/SKILL.md, viber/agents/rules-auditor.md

```
target: <the rule's own path, or the literal none for a scope with no rule>
scope: <the globs the map printed for that rule, or the directory to propose for>
matches: <the n of that rule's `matches <n>` field, or the literal none for a scope with no rule>
out: .temp/viber/<id>/
refs: ${CLAUDE_PLUGIN_ROOT}/references
```
