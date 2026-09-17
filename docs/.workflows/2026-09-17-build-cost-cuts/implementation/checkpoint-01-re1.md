# re-review

## Gates

- Build - none - repo to markdown, JSON i bash; nie ma kroku budowy (root CLAUDE.md: "Editing markdown / JSON IS shipping")
- Tests - pass - 29s

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | `B22 table copied into both planners` | ADDRESSED | superdev/skills/superplan/SKILL.md:104 |
| I2 | `ADR task block lacks Kind` | ADDRESSED | superdev/references/adr-task.md:33 |
| M1 | `B22 rows shadow the text row` | NOT ADDRESSED | superdev/references/plan-review-checklist.md:141 |

## Debt

- M2 - `ADR task pays a per-task review` - superdev/references/adr-task.md:33 - the block now
  declares `Kind: scaffold` but carries no `Review:` marker, and `superplan/SKILL.md:115` plus the
  review contract's `## Dispatch strength` make an absent marker "the reviewer agent's own
  frontmatter applies", i.e. the per-task reviewer is dispatched. `superplan/SKILL.md:111` sets the
  default for that kind to `Review: none`, so every ADR-bearing Super plan ships a Task 1 that pays
  a full per-task review for a verbatim copy - the cost this build exists to cut. The checklist's
  `## Advisory` section puts exactly this case ("a `scaffold` or `text` task carrying ... a per-task
  reviewer that its `### Approach` gives no reason for") outside Blocking, hence Minor. The block is
  shared by both tracks and `## Fill rules` already carries a track-conditional marker sentence, so
  the fix is one more such line rather than a `Review:` line in the block itself.

## Notes

- I1's fix restores the single owner in fact, not only in wording: the row phrasings
  (`covered by gate`, `of a directory`, `about file content`) now occur nowhere outside
  `plan-review-checklist.md:140-142`, and `B22` is cited by the two planners and the two plan
  reviewers without any of them reproducing the table.
- The three-line summary left in both planners is what Task 4/5 `### Approach` asked for, and the
  new pointer sentence names the two things the deleted enumeration had dropped (the `none - <reason>`
  forms and the top-down precedence), so a planner reading only the summary is told it is incomplete.
- I2's `Kind:` landed after `TDD:` rather than "next to `Effort:`" as the finding's fix text read.
  That is the correct position: both `templates/plan.md` order the markers `TDD:` -> `Kind:` ->
  `Model:` -> `Effort:`, and `## Fill rules` line 20 delegates order to the template in use, so it
  needs no edit - the implementor's `UNDERSPECIFIED:` call in `fix-01-notes.md:21` is right.
- Neither fix carries a test, and both `no test:` reasons hold: the repo has no test tooling for
  skill or reference prose, and nothing parses `adr-task.md` - `decompose.sh` only ever sees the
  plan the block was copied into.

## Assessment

Both prior Important findings are fixed at the source and the fix introduced no Critical or
Important; what remains is one carried-over and one new Minor, neither of which moves the verdict.

VERDICT: PASS
