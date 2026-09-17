# final review

## Gates

- Build - none - repo to markdown, JSON i bash; nie ma kroku budowy (root CLAUDE.md: "Editing markdown / JSON IS shipping")
- Tests - pass - 29s
- Integration - pass - 59s

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | `B22 table copied into both planners` | ADDRESSED | superdev/skills/superplan/SKILL.md:109 |
| I2 | `ADR task block lacks Kind` | ADDRESSED | superdev/references/adr-task.md:33 |
| M1 | `B22 rows shadow the text row` | NOT ADDRESSED | superdev/references/plan-review-checklist.md:135 |
| M2 | `ADR task pays a per-task review` | NOT ADDRESSED | superdev/references/adr-task.md:35 |
| M3 | `Kind: text limits fight the agent's own steps` | NOT ADDRESSED | superdev/agents/superbuild-task-implementor.md:37 |

The three open IDs are Minor; no fix round ran after `checkpoint-02`, and none of the three files
is in this delta.

## Findings

### Important

- I3 - `Scaffold discipline blocks the ADR task` - superdev/references/adr-task.md:33 - the shipped
  ADR task block now carries `Kind: scaffold` (I2's fix), and B22 derives that same kind from its
  `### Task Checks` line `ls docs/adr/ | grep -q -- '-<slug>.md$'` (plan-review-checklist.md:141,
  the `ls` of a directory row), yet its `### Approach` (adr-task.md:50-58) names no generator: step
  2 is a `Write` of content the block carries verbatim. Both implementors turn exactly that pair
  into a stop - "A `Kind: scaffold` task whose `### Approach` names no generator or tool -> this is
  a `DECISION:` in notes and a `VERDICT: BLOCKED` return"
  (superbuild-task-implementor.md:40, simplebuild-task-implementor.md:38) - so every build of a
  plan whose intent carried a `## ADR` section stops at Task 1 and has to be answered by the user
  before any task runs. The root is a seam between two tasks: B22 derives the kind from the shape
  of the task's PROOF (`ls`, a path grep), while the implementor discipline reads the same word as
  a statement about how the OUTPUT is produced (a generator ran), and a task proved by an existence
  check but written by hand falls between them - the ADR block is the one such task the plugin
  itself ships. Fix: give B22 a row sending a section whose only proof is an existence check of a
  file the `### Approach` carries verbatim to `text`, and cite it from the ADR block's `Kind:`; or,
  if the kind stays `scaffold`, add the matching clause to the scaffold sub-bullet in both
  implementors ("output the `### Approach` carries verbatim is written as given"), so the stop
  fires only where a generator was really meant.

## Debt

- M4 - `process.exit can drop the result line` - superdev/skills/setup/scripts/merge-settings.sh:89-92,
  163-164 - `stop()` and the "already up to date" path call `process.exit()` in the same tick as
  their `console.log`. Node's stdout is asynchronous for a pipe on macOS, and the setup skill reads
  this script through a pipe, so the one line that is the whole contract can be lost while the exit
  code still arrives. Fix: set `process.exitCode` and return instead of exiting.
- M5 - `unreadable-target branch has no test` - superdev/skills/setup/scripts/merge-settings.sh:101-106 -
  the EACCES branch and its new line `settings.json: unreadable - left untouched (<message>)` are the
  implementor's own addition (task-12-notes.md `UNDERSPECIFIED:`), and the ten cases of
  `tests/superdev/merge-settings.test.ts` do not cover it, although `tests/harness/perms.ts` exposes
  `denyRead()` / `canDenyRead()` for exactly this and the file's neighbours use it.
- M6 - `template parse error reported as missing` - superdev/skills/setup/scripts/merge-settings.sh:98 -
  the shell already proved the template readable (line 56), so this branch fires only on a template
  that is present but not valid JSON, and reports it as `template missing at <path>`. A future edit
  that breaks the shipped asset would be reported as the wrong cause.
- M7 - `Effort sentence contradicts its own block` - superdev/skills/superplan/SKILL.md:101,
  superdev/skills/simpleplan/SKILL.md:104 - the opening sentence of `**Build strength**` still reads
  "the model and effort the task's implementor runs at", which the same block's `Effort:` paragraph
  then denies ("the dispatched agent's own frontmatter sets the effort it actually runs at"). Both
  planners carry the identical wording, so the fix is the same edit twice.

## Notes

- NOTE: plan defect - the BLOCKED branch behind I3 is Task 6's own `### Failure modes` entry, so the
  branch itself is a recorded decision and is not what I3 faults; I3 is the shipped ADR block landing
  in the state that trips it. Closing I3 means changing B22 or the scaffold clause, not that
  failure mode.
- The two `UNDERSPECIFIED:` lines naming the same rule (`Effort` default for `scaffold` / `text`, in
  task-04-notes.md and task-05-notes.md) resolve identically: neither planner invents a per-kind
  effort default and both keep the pre-existing reasoning, with the `Effort:` paragraph word for word
  the same in superplan/SKILL.md:105 and simpleplan/SKILL.md:108. No divergence to fix.
- Every `CARRY:` line of the notes directory is closed: the two from task-03-notes.md (`B1-B21` in
  both planners' self-review) leave no `B1-B21` anywhere outside `docs/`, and task-12-notes.md's
  (setup's Node dependency and the new script) is answered by superdev/CLAUDE.md:42-45 and the
  `decompose.sh` inventory row at :54.
- The cross-task contracts of this delta hold in fact: `stats-report.sh`'s `strength()` returns the
  model alone on `effort == "-"` (line 145) and still renders `-` for a task with no reviewer event,
  which is Task 8's `Review: none` contract, and the new case in stats-report.test.ts:163-189 asserts
  both cells in one row. The template asset is a byte-faithful copy of this repo's `.claude/settings.json`
  lists (34 allow entries, the `mcp__*` one dropped, all 70 deny entries, `defaultMode: acceptEdits`),
  and merge-settings.sh keeps host order, appends once, never overwrites a mode and rewrites nothing
  when nothing changed.
- The runtime-call invariant closes for the whole build: `vibe/SKILL.md` and `e2e/SKILL.md` now call
  their scripts directly with a pattern each, no `bash "${CLAUDE_PLUGIN_ROOT}` form survives in any
  shipped skill, and `merge-settings.sh` is `100755` with a `#!/usr/bin/env bash` shebang like the
  eight plugin-level scripts.

## Assessment

The delta itself is sound and the gates are green, but the integration pass over the whole build
finds one seam that stops an ADR-enabled build at its first task.

VERDICT: FAIL
