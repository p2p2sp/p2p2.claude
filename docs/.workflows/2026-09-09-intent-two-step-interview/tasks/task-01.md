
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


### Covered criteria
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
