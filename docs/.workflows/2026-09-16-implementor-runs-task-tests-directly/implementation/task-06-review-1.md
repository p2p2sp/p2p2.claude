# task review - task-06-review-1

## Findings

### Critical
- C1 - Unrecorded model override in repo settings - .claude/settings.json:5 - the working tree adds a `"modelOverrides": { "opus": "claude-opus-4-8" }` block to a file that is not under the task's `### Files` (the task touches `superdev/agents/superbuild-task-reviewer.md` only), is not test or config fallout of a markdown-only edit, and is recorded nowhere in `implementation/task-06-notes.md` - why it matters: it is an out-of-bounds, unrecorded change that would be swept into this task's commit, and it silently remaps the model every `Model: opus` dispatch in this repo resolves to, so later build steps would run on a model nobody chose - how to fix: restore the file to HEAD (`git checkout -- .claude/settings.json`); if the override is wanted, land it on its own outside this build and record it there.

### Important
- none

## Notes
- NOTE: plan defect - task-06 carries no `### Task Tests` section, although the new `Runs recorded` bullet (and `plan-review-checklist.md` B16 / the planner rules) assume every task has one; the check still reads correctly, this is a gap in the task file, not in the diff.
- The working tree also deletes the `#### Build` block from `tasks/task-06.md` and `tasks/task-07.md`. That path is under the run's working directory and therefore outside this gate, but it is worth the final review's attention: the notes' claim that the task file "carried the `#### Tests` block only" describes the edited file, not the one at HEAD.
- The recorded `CARRY:` (lint `WARN` on the frontmatter `description:`) is legitimate - the task scopes the file to `## Input` and `## Check`, and `lint_skill.sh` still exits 0.

## Assessment
The edit to `superdev/agents/superbuild-task-reviewer.md` itself delivers the `Approach` and the `DoD` - the `## Input` `notes` bullet and `task` shape describe `## Runs` and `Task Tests`, the `## Check` bullet carries the Important severity, the skipped-when-unset failure mode and the no-run sentence, and all three listed gates plus the full suite (537 pass, 0 fail) are green. It fails this gate only on the unrecorded out-of-bounds change to `.claude/settings.json` that rides along in the same working tree.

VERDICT: FAIL
