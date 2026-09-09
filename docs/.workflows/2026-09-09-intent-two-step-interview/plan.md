# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Split intent's information gathering into a gap-question step, and rename two superbuild forks"
Intent: docs/.workflows/2026-09-09-intent-two-step-interview/intent.md
Plan: C:\Users\dario\.claude\plans\resilient-booping-summit.md

---
<!-- HEADER -->

## Goal
`superdev/skills/intent/SKILL.md` gathers information in two stages instead of one. After `Explore`
returns, the skill puts every remaining gap question to the user in a single numbered prose list -
facts only, no recommendations, no options - and only then runs the existing one-question-per-turn
design interview, now fed by Explore plus those answers. The `intent.md` output format is unchanged:
Step 1 answers land in `## Request` / `## Constraints` / `## Out of scope`, never as a decision.

Separately, two superbuild forks are renamed with no behaviour change:
`superbuild-task-coder` -> `superbuild-task-implementor` and `superbuild-reviewer-code` ->
`superbuild-reviewer-change`. Every dispatch, manifest entry, doc and diagram label follows.

## Context
Today the skill goes straight from `## Explore first` into `## Run the interview`, so every open
item - including plain facts the user could have answered in one breath - costs its own turn with a
recommendation and 2-3 numbered options. After Explore the agent usually already knows what it is
missing, and most of those gaps are facts, not design choices. Batching the facts first shortens the
interview to the decisions that genuinely have trade-offs. Two guards keep the change from
degenerating: a hard boundary rule (a question with two or more workable answers is a decision and
stays in the interview) and the existing `## Keep this discipline` ban on batching, which must be
re-scoped to Step 2 rather than deleted - otherwise it forbids Step 1 outright.

The rename rides along as its own task. `superbuild-task-coder` implements a task that is not always
code, so `superbuild-task-implementor` matches both the work and its Simple-track twin
`simplebuild-implementor`. `superbuild-reviewer-code` is the final review of the whole change from
the base SHA, not of a task, so `superbuild-reviewer-change` says what it does and stays clear of the
per-task `superbuild-task-reviewer` it sits next to.

## Out of scope
- Firing Step 1 on the resume path (`intent <path>`) or when a single decision is reopened
- A new section in the `intent.md` output template
- Any behaviour change inside the two renamed forks - the rename is name-only
- `superdev/hooks/content/manifest.md`, the root `CLAUDE.md` and the marketplace catalog - none of
  them names the renamed forks or the intent sections
- Run dirs under `docs/.workflows/` - past builds are the record, and this build's own copy of this
  plan necessarily quotes the old names
- The legacy executor list in `.claude/skills/skill-chaining/references/skill-chaining.md` - it
  names a `developer` plugin and roles (`runner`, `improver`, `committer`, `adr-recorder`) that no
  longer exist, so it needs its own cleanup, not a one-word patch

## Acceptance criteria
1. `superdev/skills/intent/SKILL.md` carries a `## Step 1 - list the gap questions` section placed
   directly after `## Explore first`, and the interview section that follows it is titled
   `## Step 2 - run the interview`.
2. Step 1 states that all gap questions go out in ONE message as a flat numbered list, in plain
   prose, with no `AskUserQuestion`, no recommendation and no options to pick from, and that it only
   asks what the codebase cannot answer.
3. Step 1 carries the boundary rule with 2-3 examples on each side: the answer is a fact only the
   user holds (goal, scope, constraint, existing state, preference) -> Step 1; the answer is a
   choice between two or more workable solutions with trade-offs -> Step 2.
4. Step 1 carries a soft cap of about 8 questions, and the no-gaps exit: say so in one line and go
   straight to Step 2, never invent a question to fill the list.
5. Step 1 states that an unanswered or "I don't know" item returns as an ordinary Step 2 question
   only when its answer would still shape the solution, one per turn, and is otherwise dropped for
   good.
6. `## Keep this discipline` scopes the one-question-at-a-time rule to Step 2 and names Step 1's
   single batch as its only exception. The "do not batch" bullet inside `## Step 2 - run the
   interview` stays verbatim - it bans batching *decisions* within the interview walk, which Step 1
   never does - and no other bullet in the file forbids Step 1's batch.
7. `## Synthesis` states that Step 1 answers are input, not decisions: each folds into `## Request`,
   `## Constraints` or `## Out of scope`, every answer that shapes the solution must land in one of
   those three, and `## Decisions` carries interview rulings only.
8. The `intent.md` template code block in `## Synthesis` is byte-identical to today's - same five
   sections, no new one.
9. `## Resume from a file` skips `## Step 1 - list the gap questions` alongside `## Explore first`
   and `## Step 2 - run the interview`, and its reopen branch points at `## Step 2 - run the
   interview`; the string `## Run the interview` survives nowhere in the file.
10. `superdev/README.md` describes both stages in Quick start item 2 and in the `intent` row of the
    `### Entry and environment` table.
11. `git diff --name-only -- superdev/` lists exactly `superdev/README.md` and
    `superdev/skills/intent/SKILL.md` - no other file under `superdev/` is touched.
12. `node --test "tests/**/*.test.ts"` passes from the repo root.
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

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(intent): split information gathering into a gap-question batch and the interview
- Covers: criteria #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/skills/intent/SKILL.md (`## Resume from a file`, `## Explore first`,
  `## Run the interview`, `## Keep this discipline`, `## Synthesis`)
- modify - superdev/README.md (`## Quick start` item 2, `### Entry and environment` table row
  `intent`)

### Test Commands
#### Build
- none - this repo has no build step and no lint (markdown + JSON only, per root `CLAUDE.md`)

#### Tests
- `grep -n "^## " superdev/skills/intent/SKILL.md` - `## Step 1 - list the gap questions` appears
  directly after `## Explore first`, and `## Step 2 - run the interview` directly after it
- `grep -n "## Run the interview" superdev/skills/intent/SKILL.md` - no output, exit 1
- `grep -n "Step 1 - list the gap questions" superdev/skills/intent/SKILL.md` - at least two hits:
  the heading and the `## Resume from a file` skip list
- `grep -n "AskUserQuestion" superdev/skills/intent/SKILL.md` - hits in the `allowed-tools:`
  frontmatter (untouched), Step 1 (forbidden there), `## Step 2 - run the interview`,
  `## Keep this discipline` and `## Handoff` only
- `grep -n "at once" superdev/skills/intent/SKILL.md` - the discipline bullet now scopes the ban to
  Step 2 and names Step 1's batch as the exception
- `grep -n "gap question" superdev/README.md` - two hits, one in Quick start item 2 and one in the
  `intent` table row
- `git diff --name-only -- superdev/` - exactly `superdev/README.md` and
  `superdev/skills/intent/SKILL.md`
- `node --test "tests/**/*.test.ts"` - suite green

### Approach
1. Insert a new `## Step 1 - list the gap questions` section directly after `## Explore first`,
   carrying, one bullet each: put every remaining gap question to the user in ONE message as a flat
   numbered list (`1.`, `2.`, `3.`); plain prose only - no `AskUserQuestion`, no recommendation, no
   options, no trade-off talk, because a gap question asks for a fact, not for a choice; ask only
   what the codebase cannot answer, never re-raising anything Explore settled; the boundary rule
   with 2-3 examples per side (fact only the user holds -> here; a choice between two or more
   workable solutions with trade-offs -> Step 2, with its own turn, recommendation and numbered
   options); a soft cap of about 8, over which only questions whose answer would change the design
   survive; the no-gaps exit - state it in one line and move to Step 2, never padding the list; the
   partial-answer rule - an unanswered or "I don't know" item returns as an ordinary Step 2
   question one per turn only when its answer would still shape the solution, all others dropped
   and never raised again; and the closing note that answers here are input, never a `## Decisions`
   block, with `## Synthesis` owning where they land.
2. Rename `## Run the interview` to `## Step 2 - run the interview` and give it a new leading
   bullet: enter with Explore's findings and the Step 1 answers already in hand, never re-ask what
   either settled, and expect fewer open decisions than before Step 1 existed. Leave every other
   bullet and the example question block byte-identical. Then repoint the two references in
   `## Resume from a file`: the skip list becomes `## Explore first`, `## Step 1 - list the gap
   questions` and `## Step 2 - run the interview`, and the reopen branch runs `## Step 2 - run the
   interview` for that branch only.
3. In `## Keep this discipline`, rewrite the final bullet so the one-question-at-a-time rule binds
   Step 2 and names Step 1's single batch as its only exception, and rephrase the "The reverse is
   also an anti-pattern" bullet to key off "Explore plus the Step 1 answers" instead of "Explore
   plus one clarifying question". Touch no other bullet in the section, and leave the "do not
   batch" bullet in `## Step 2 - run the interview` exactly as it stands - it bans batching
   decisions inside the interview walk, not Step 1's fact-gathering list.
4. In `## Synthesis`, add one bullet beside the existing "NEVER record a rejected option" rule:
   Step 1 answers are input, not decisions - fold each into `## Request` (the sharpened goal),
   `## Constraints` (limits, existing state, stated preferences) or `## Out of scope` (a boundary
   the user drew); every Step 1 answer that shapes the solution MUST land in one of those three,
   one that shapes nothing is dropped; `## Decisions` carries interview rulings only. Leave the
   template code block untouched.
5. In `superdev/README.md`, extend Quick start item 2 so it reads Explore -> one batch of simple
   gap questions only the user can answer -> the prose interview one question per turn with 2-3
   numbered options, and extend the `intent` row of the `### Entry and environment` table the same
   way. Change nothing else in the file.

### Edge cases
- Explore leaves no gaps: Step 1 still runs, emits the one-line statement and no list, then Step 2
  starts.
- The user answers none of the batch: every gap question that would shape the solution becomes a
  Step 2 question, so the interview absorbs the full load rather than proceeding on guesses.
- The user answers a gap question with "decide it yourself": that is not a fact, so it moves to
  Step 2 as a decision with a recommendation and options - the skill never answers it alone.
- Resume path (`intent <path>`) and a reopened decision: Step 1 never fires, guaranteed by the skip
  list in `## Resume from a file`.

### Contracts
- `intent.md` output format unchanged - `## Request`, `## Decisions`, `## Constraints`,
  `## Out of scope`, `## History` - so `superspec`, `simpleplan` and `superdev:changelog-writer`
  need no change.
- The two new section names are referenced only from `## Resume from a file` inside the same file;
  no file outside `superdev/skills/intent/SKILL.md` names them.

### DoD
`superdev/skills/intent/SKILL.md` runs Explore -> gap-question batch -> interview with the boundary
rule, cap, no-gaps exit and partial-answer rule in place, the discipline ban re-scoped to Step 2 and
the Step 1 landing rule added to `## Synthesis` with the template block untouched;
`superdev/README.md` documents both stages; every grep check above returns as stated;
`git diff --name-only -- superdev/` lists only those two files; `node --test "tests/**/*.test.ts"`
is green.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->
