Title: "Split intent's information gathering into a gap-question step, and rename two superbuild forks"
Intent: docs/.workflows/2026-09-09-intent-two-step-interview/intent.md


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

