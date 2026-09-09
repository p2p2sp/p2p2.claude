
## Task 2 - refactor(superbuild): rename the task coder and the final code reviewer
- Covers: criteria #13, #14, #15, #16, #17, #18
- TDD: none

### Dependencies
- task 1 - blocks: both tasks edit `superdev/README.md`, and Task 1's criterion #11 requires a clean
  `superdev/` diff at its own verification

### Files
- delete - superdev/skills/superbuild-task-coder/SKILL.md (moved, not rewritten)
- delete - superdev/skills/superbuild-reviewer-code/SKILL.md (moved, not rewritten)
- add - superdev/skills/superbuild-task-implementor/SKILL.md (`name:`)
- add - superdev/skills/superbuild-reviewer-change/SKILL.md (`name:`)
- modify - superdev/.claude-plugin/plugin.json (`skills`)
- modify - superdev/skills/superbuild/SKILL.md (`### Loop` dispatch lines, `## Step 3 - Final Review`
  dispatch line and its fix branches)
- modify - superdev/skills/superbuild-task-reviewer/SKILL.md (`## Input`)
- modify - superdev/scripts/decompose.sh (comment above the per-task spec fragment)
- modify - superdev/README.md (`## Quick start` item 5, `### Super track` table rows
  `superbuild-task-coder`, `superbuild-task-reviewer`, `superbuild-reviewer-code`)
- modify - .claude/skills/skill-chaining/SKILL.md (`## Decision rules (start here)` closing example)
- modify - docs/assets/superdev-flow.svg (`<text>` at y=1738 and y=1758 in the legend panel, and at
  y=1468, y=1530, y=1690, y=1707 in the Super-track nodes)

### Test Commands
#### Build
- none - this repo has no build step and no lint (markdown + JSON only, per root `CLAUDE.md`)

#### Tests
- `ls superdev/skills/superbuild-task-implementor/SKILL.md superdev/skills/superbuild-reviewer-change/SKILL.md`
  - both listed, exit 0
- `ls -d superdev/skills/superbuild-task-coder superdev/skills/superbuild-reviewer-code` - neither
  exists, non-zero exit
- `diff <(git show HEAD:superdev/skills/superbuild-task-coder/SKILL.md) superdev/skills/superbuild-task-implementor/SKILL.md`
  - exactly one changed line pair, the `name:` field
- `diff <(git show HEAD:superdev/skills/superbuild-reviewer-code/SKILL.md) superdev/skills/superbuild-reviewer-change/SKILL.md`
  - exactly one changed line pair, the `name:` field
- `grep -rn "superbuild-task-coder\|superbuild-reviewer-code" --exclude-dir=.git --exclude-dir=.workflows .`
  - no output, exit 1
- `grep -rnw -i "coder" superdev/ .claude/skills/skill-chaining/SKILL.md` - no output, exit 1
- `node -e "const s=JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8')).skills; console.log(s.length, s.indexOf('./skills/superbuild-task-implementor/'), s.indexOf('./skills/superbuild-reviewer-change/'))"`
  - prints `21 8 11`
- `grep -n "superbuild-task-implementor\|superbuild-reviewer-change\|implementor fixes\|• implementor:\|then change" docs/assets/superdev-flow.svg`
  - six hits, at the `<text>` lines listed in `### Files`
- `node --test "tests/**/*.test.ts"` - suite green

### Approach
1. `git mv superdev/skills/superbuild-task-coder superdev/skills/superbuild-task-implementor` and
   `git mv superdev/skills/superbuild-reviewer-code superdev/skills/superbuild-reviewer-change`, then
   change the `name:` line in each moved `SKILL.md` to the new directory's name. Touch no other line
   in either file - the `description:`, `model:`, `effort:`, `allowed-tools:` preload patterns,
   `## Input` labels and `## Output format` verdict lines all stay verbatim.
2. In `superdev/.claude-plugin/plugin.json`, swap `"./skills/superbuild-task-coder/"` and
   `"./skills/superbuild-reviewer-code/"` for the new paths in place, so `skills[]` keeps its 21
   entries and their current order.
3. In `superdev/skills/superbuild/SKILL.md`, repoint every dispatch to the new names and rewrite the
   two bare role nouns in the final-review fix branches (`coder VERDICT: PASS` / `coder VERDICT:
   FAIL`) as `implementor`. Apply the same role-noun fix to `superdev/skills/superbuild-task-reviewer/SKILL.md`
   (the sentence naming the coder's recorded plan-to-code deviations) and to the Polish comment in
   `superdev/scripts/decompose.sh` that lists the per-task forks - comment text only, no code.
4. In `superdev/README.md`, rename both `### Super track` rows, restate the reviewer's role as the
   final review of the whole change since the base commit rather than "final code review", and
   replace the two role nouns - "runs a coder fork per task" in Quick start item 5 and "sends the
   coder back" in the `superbuild-task-reviewer` row. In `.claude/skills/skill-chaining/SKILL.md`,
   repoint the `superbuild-task-coder` example at `superbuild-task-implementor`.
5. In `docs/assets/superdev-flow.svg`, update six labels. Super-track nodes, left-anchored at
   `x="800"` inside `rect x="780" width="440"`: the `.title` at y=1468, the `.desc` at y=1530 ("the
   coder fixes" -> "the implementor fixes"), the `.desc` at y=1690 (`superbuild-reviewer-code` ->
   `superbuild-reviewer-change`) and the `.desc-s` at y=1707 ("task-coder fixes" ->
   "task-implementor fixes"). Legend panel, left-anchored at `x="140"` inside
   `rect x="120" width="440"`: the `.desc` at y=1738 ("• coder: opus + a reviewer after every task
   (up to 3 rounds)" -> "• implementor: opus + a reviewer per task (up to 3 rounds)") and the `.desc`
   at y=1758 ("spec, then code" -> "spec, then change").
6. Both panels leave about 400px of label width. Two lines already run close to that edge, so absorb
   the added characters by shortening the prose rather than widening a `rect` or moving nodes, which
   would break the diagram grid: y=1690 drops "then on its PASS" to "then on PASS", and y=1738 drops
   "after every task" to "per task" as spelled out in step 5.

### Edge cases
- `git mv` records the move in the index and the `name:` edit lands unstaged on top; both go into the
  task's single commit, so the rename stays detectable in history.
- Both renamed forks keep their `!` preload on `${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh` - the
  path is plugin-root-relative, so the directory move does not touch it, and the portability sweep
  still covers both files under their new paths.
- `superbuild-task-reviewer` keeps its own name; only the role noun inside its prose changes.
- A diagram label that still overflows after the prose is shortened: shorten further, never widen the
  `rect` or move the surrounding nodes.

### Contracts
- A skill is resolved by `plugin.json` `skills[]` plus its `SKILL.md` `name:`; both change in the
  same task, so no dispatch can point at a skill that does not resolve.
- Both forks keep their labeled-line `## Input` contract and their `VERDICT:` / `REVIEW:` output
  lines verbatim, so `superbuild`'s branching on those lines is unaffected.

### DoD
Both directories renamed with only the `name:` line changed, `plugin.json` still 21 entries pointing
at the new paths, every dispatch and prose reference repointed, no occurrence of either old name left
in the repo, the flow diagram updated within its existing box, all checks above green.


### Covered criteria
13. `superdev/skills/superbuild-task-coder/` and `superdev/skills/superbuild-reviewer-code/` are
    gone; `superdev/skills/superbuild-task-implementor/SKILL.md` and
    `superdev/skills/superbuild-reviewer-change/SKILL.md` exist, each carrying the matching `name:`
    frontmatter value.
14. Each renamed `SKILL.md` differs from its pre-rename content by exactly one line - the `name:`
    field. Frontmatter, `## Input`, `## Output format` and every other section are byte-identical.
15. `superdev/.claude-plugin/plugin.json` `skills[]` still holds 21 entries in the same order, with
    `./skills/superbuild-task-implementor/` and `./skills/superbuild-reviewer-change/` in the slots
    the old paths occupied, and the file is still valid JSON.
16. `superdev/skills/superbuild/SKILL.md` dispatches only the new names, and its bare role noun
    `coder` in the fix branches reads `implementor`.
17. No file outside `docs/.workflows/` contains `superbuild-task-coder` or
    `superbuild-reviewer-code`, and neither `superdev/` nor
    `.claude/skills/skill-chaining/SKILL.md` uses `coder` as the role noun for that fork. The run
    working directory is excluded because `decompose.sh` commits a verbatim copy of this plan into
    it, old names included.
18. `docs/assets/superdev-flow.svg` carries the new names in all six labels that mention the fork -
    the four naming it in full plus the two legend lines using the bare role noun - and every edited
    `<text>` still fits its `rect`.
