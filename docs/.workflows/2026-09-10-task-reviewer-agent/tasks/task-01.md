
## Task 1 - refactor(superbuild-task-reviewer): move from skill to agent with labeled-path input
- Covers: criteria #1, #2, #3
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none

### Files
- add - superdev/agents/superbuild-task-reviewer.md (agent frontmatter + body; content derived from the current skill)
- delete - superdev/skills/superbuild-task-reviewer/SKILL.md (the whole `superdev/skills/superbuild-task-reviewer/` directory goes with it)
- modify - superdev/.claude-plugin/plugin.json (`skills[]`, `agents[]`)

### Test Commands
#### Build
- `node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"` - exits 0 (valid JSON)

#### Tests
- `test -f superdev/agents/superbuild-task-reviewer.md && test ! -e superdev/skills/superbuild-task-reviewer && echo MOVED` - prints `MOVED`
- `` ! grep -q -F '!`' superdev/agents/superbuild-task-reviewer.md && echo NO_PRELOAD `` - prints `NO_PRELOAD` (no preload anywhere in the body, inline ones included)
- `grep -c -E '^(tools: Read, Write, Grep, Glob, Bash|model: opus|effort: high|name: superbuild-task-reviewer)$' superdev/agents/superbuild-task-reviewer.md` - prints `4`
- `! grep -q -E '^(context|background|allowed-tools|user-invocable):' superdev/agents/superbuild-task-reviewer.md && echo CLEAN_FM` - prints `CLEAN_FM`
- `grep -c -E 'REASON: missing input <label>|git status --short|VERDICT: PASS|REVIEW: <report path>' superdev/agents/superbuild-task-reviewer.md` - prints a number `>= 4`
- `grep -c 'superbuild-task-reviewer' superdev/.claude-plugin/plugin.json` - prints `1`
- `grep -n -A1 'simplebuild-task-implementor.md' superdev/.claude-plugin/plugin.json | grep -q 'agents/superbuild-task-reviewer.md' && echo ORDERED` - prints `ORDERED`

### Approach
1. Use `git mv superdev/skills/superbuild-task-reviewer/SKILL.md superdev/agents/superbuild-task-reviewer.md`, then remove the now-empty `superdev/skills/superbuild-task-reviewer/` directory.
2. Rewrite the frontmatter to the agent shape of `superdev/agents/superbuild-task-implementor.md`: keep `name: superbuild-task-reviewer`; replace `description:` with one full-sentence description (a fast per-task gate that judges the uncommitted work of one plan task against its task file and the plan header, writes a findings report on FAIL, input is a labeled block of file paths: plan-header, task, optional notes, a report path to write; invoked only by the superbuild skill through the Agent tool, never directly and never on its own initiative); set `tools: Read, Write, Grep, Glob, Bash`, `model: opus`, `effort: high`, `color: purple` (the implementors carry `color: orange` / `color: blue`); drop `context`, `background`, `allowed-tools`, `user-invocable`.
3. Replace the `## Prerequisites` + `## Input` preload block (lines with `` !` `` and the two `<!-- no Bash pattern here ... -->` comments) with a `## Input` section: the verbatim first paragraph of the implementor's `## Input` (labeled `label: value` lines; read each file-valued label now and treat it as the `## <label>` block; a required label absent or file unreadable -> `VERDICT: FAIL` with `REASON: missing input <label>` and change nothing), then a bullet list: `plan-header` (required) - the change's global boundaries; `task` (required) - the task whose implementation is reviewed; `notes` (optional) - when set, Read it as the implementor's recorded plan->code deviations, claims to verify not truth; `report` (required) - the path the findings are WRITTEN to on FAIL, may not exist yet, never read as input.
4. Add a `## Prerequisites` section after `## Input` instructing: run `git status --short` with `Bash` and treat its output as the uncommitted work under review (working tree vs HEAD plus untracked files); read the changed files in full before judging.
5. Keep `## Scope`, `## Check`, `## Calibration` and `## Output format` verbatim except: `## Output format` refers to the `report` label path instead of "the Report path", and gains one bullet: a missing required input -> line 1 `VERDICT: FAIL`, line 2 `REASON: missing input <label>`, no report written.
6. In `superdev/.claude-plugin/plugin.json` delete `"./skills/superbuild-task-reviewer/",` from `skills[]` and insert `"./agents/superbuild-task-reviewer.md",` into `agents[]` directly after `"./agents/simplebuild-task-implementor.md",`.

### Edge cases
- A `notes` path that does not exist is not an error: the label is optional and the reviewer simply has no deviation claims to check.
- The sections the agent body inherits from the skill (`## Scope`, `## Check`, `## Calibration`) stay verbatim - the move changes how inputs arrive, not what is judged.

### Contracts
- Agent prompt contract (labeled lines, all values are paths): `plan-header: <path>` (required), `task: <path>` (required), `notes: <path>` (optional), `report: <path>` (required on FAIL).
- Return contract: `VERDICT: PASS` alone; or `VERDICT: FAIL` + `REVIEW: <report path>` (findings written); or `VERDICT: FAIL` + `REASON: missing input <label>` (nothing written).
- Frontmatter fallback when the orchestrator omits a parameter: `model: opus`, `effort: high`.

### DoD
The agent file exists with the frontmatter and sections above, the old skill directory is gone, `plugin.json` is valid JSON listing the reviewer once under `agents[]`, and every Test Command above prints its expected output.


### Covered criteria
1. `superdev/agents/superbuild-task-reviewer.md` exists with frontmatter `name: superbuild-task-reviewer`, a full-sentence `description:` ending with an "invoked only by the superbuild skill through the Agent tool" clause, `tools: Read, Write, Grep, Glob, Bash`, `model: opus`, `effort: high`, and no `context:`, `background:`, `allowed-tools:` or `user-invocable:` keys; `superdev/skills/superbuild-task-reviewer/` no longer exists.
2. The agent body contains no `` !` `` preload; it carries the implementors' `## Input` paragraph (labeled `label: value` lines, read each file-valued label, missing required label or unreadable file -> `VERDICT: FAIL` + `REASON: missing input <label>`, change nothing), lists `plan-header` (required), `task` (required), `notes` (optional, read as the implementor's deviation claims) and `report` (required, the path written on FAIL), instructs running `git status --short` with `Bash` to bound the review to the uncommitted work, and keeps the existing `## Scope`, `## Check`, `## Calibration` and `## Output format` content (`VERDICT: PASS` alone on PASS; `VERDICT: FAIL` + `REVIEW: <report path>` on FAIL, report written only then).
3. `superdev/.claude-plugin/plugin.json` parses as JSON, its `skills[]` has no `superbuild-task-reviewer` entry, and its `agents[]` lists `./agents/superbuild-task-reviewer.md` directly after `./agents/simplebuild-task-implementor.md`; no worker appears in both arrays.
