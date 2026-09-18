
## Task 4 - Judge a commit range in the per-task reviewer
- TDD: none
- Kind: text
- Model: opus
- Covers: `Zakres sprawdzania bez zmian` (#2)

### Dependencies
- `Add the gates and range labels to the review contract and move the gate run to the orchestrator` (Task 1) - blocks: the `range:` label this agent reads

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Input`, `## Prerequisites`, `## Scope`, `## Check`)

### Task Checks
- grep -n 'range' superdev/agents/superbuild-task-reviewer.md
- grep -n 'git diff --name-only' superdev/agents/superbuild-task-reviewer.md

### Approach
1. `Model: opus` because this task decides how a two-mode input (a range, or its absence in a build without git) is read without leaving either mode ambiguous.
2. In `## Input`, add the `range` label entry between `refs` and `notes`, describing it as repeatable, each line one commit range this review judges, the review covering their union, and naming the absence of every such line as the no-git mode; update the closing sentence so the label set still reads as the whole of the input.
3. In `## Prerequisites`, replace the `git status --short` step: with `range` set, run one `git diff --name-only <range>` with `Bash` per handed range, then read each named file in full at the range's own end commit through `git show <end sha>:<path>`, never from the working tree, skipping a path the diff reports as deleted because no blob of it exists there; with `range` absent, keep today's `git status --short` reading of the working tree and its `Read` of the changed files.
4. In `## Scope`, restate the judged set as the union of the changes in the `## range` lines rather than the uncommitted work, keeping the no-git sentence beside it and keeping the run-directory exclusion exactly as it stands.
5. In the `Runs recorded` bullet of `## Check`, widen the sentence pinning `Bash` so it names both git reads and nothing else. Add one sentence to `## Scope`: with `range` set, read every file from the handed commits rather than from the working tree, because another task's implementor may be editing that tree while this review runs, and an undeclared touch of a file this task owns would otherwise reach the review as if it were part of it.
6. Add the `Kind` marker to the plan-task shape listed under the `task` label, which today names `TDD` but not `Kind`.

### Failure modes
- when any `range` line names a commit that does not exist -> response return line 1 `VERDICT: FAIL` and line 2 `REASON: missing input range`, writing no report, log that return line, test none - agent prose
- when no `range` line is present in a build that does have git -> response judge the working tree as in the no-git mode, so the review still happens rather than failing, log one `NOTE: <what>` line saying no range was handed in, test none - agent prose

### Contracts
- the per-task review's judged set: the union of `git diff <range>` over every handed range, the working tree against HEAD when none was handed - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6)

### DoD
`superbuild-task-reviewer.md` reads every `range` line, judges the union of those diffs when at least one is handed, keeps the working-tree reading when none is, and lists `Kind` in the plan-task shape.


### Covered criteria
2. Zakres sprawdzania bez zmian - Każde zadanie dostaje po zmianie dokładnie to sprawdzenie,
   które dostawało przed nią.
