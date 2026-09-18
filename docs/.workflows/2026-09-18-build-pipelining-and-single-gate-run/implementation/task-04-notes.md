# Task 4 notes

## Runs
- grep -n 'range' superdev/agents/superbuild-task-reviewer.md -> 5 lines (19, 25, 31, 33, 36), exit 0
- grep -n 'git diff --name-only' superdev/agents/superbuild-task-reviewer.md -> 2 lines (31, 52), exit 0

Step 3: a deletion is told by the absent blob at the range's end commit, not by the diff output - `git diff --name-only` prints no status letter, and the task check pins that exact form of the command, so no second `--name-status` call was introduced.

Step 4: written as "the `range` lines", not "the `## range` lines" - `range` carries a value, not a file path, so `## Input`'s file-valued rule never turns it into a `## range` block to point at; the `range` entry says so explicitly.

Failure mode "commit does not exist" landed in `## Prerequisites` (the step that runs `git diff`) rather than in `## Output format` - `### Files` scopes this task to `## Input`, `## Prerequisites`, `## Scope`, `## Check`, and the existing first bullet of `## Output format` already carries the `REASON: missing input <label>` shape.
