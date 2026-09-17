# re-review

## Gates

- Build - none - repo to markdown, JSON i bash; nie ma kroku budowy (root CLAUDE.md: "Editing markdown / JSON IS shipping")
- Tests - pass - 26s
- Integration - pass - 46s

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | `B22 table copied into both planners` | ADDRESSED | superdev/skills/superplan/SKILL.md:109 |
| I2 | `ADR task block lacks Kind` | ADDRESSED | superdev/references/adr-task.md:37 |
| I3 | `Scaffold discipline blocks the ADR task` | ADDRESSED | superdev/agents/superbuild-task-implementor.md:36,40 |
| M1 | `B22 rows shadow the text row` | NOT ADDRESSED | superdev/references/plan-review-checklist.md:141 |
| M2 | `ADR task pays a per-task review` | NOT ADDRESSED | superdev/references/adr-task.md:34-39 |
| M3 | `Kind: text limits fight the agent's own steps` | NOT ADDRESSED | superdev/agents/superbuild-task-implementor.md:37 |
| M4 | `process.exit can drop the result line` | NOT ADDRESSED | superdev/skills/setup/scripts/merge-settings.sh:89 |
| M5 | `unreadable-target branch has no test` | NOT ADDRESSED | superdev/skills/setup/scripts/merge-settings.sh:101 |
| M6 | `template parse error reported as missing` | NOT ADDRESSED | superdev/skills/setup/scripts/merge-settings.sh:98 |
| M7 | `Effort sentence contradicts its own block` | NOT ADDRESSED | superdev/skills/superplan/SKILL.md:102 |

The seven open IDs are Minor: the fix dispatch carried no `minor:` line, so none of them was in its work
list, and none of their files is in this delta.

## Notes

- I3's closure rests only on the two implementor clauses, and they do close it: the shipped block's
  `### Approach` names a tool in step 1 and carries its output verbatim in step 2, so the BLOCKED
  clause ("neither names a generator or tool nor carries the output verbatim",
  superbuild-task-implementor.md:40, simplebuild-task-implementor.md:39) can no longer fire on it.
  The new `## Fill rules` bullet at adr-task.md:22-25 sits outside the fenced `## Task block` and so
  never travels into a plan - it guards a future editor, not the build, which is what the fix notes
  claim.
- The scaffold discipline exists in exactly two places, both changed and byte-identical
  (superbuild-task-implementor.md:34-40 vs simplebuild-task-implementor.md:33-39 diff empty),
  matching the round's `UNDERSPECIFIED:` line. No third consumer carries the old "generator or tool"
  wording: a repo-wide grep for `scaffold` outside `docs/` finds only these two agents, the B22 table
  (proof-side derivation, untouched), both planners' three-line derivation, the two plan templates
  and README prose - none of which states how the output is produced.
- No memory node restates the scaffold discipline (root CLAUDE.md:97 covers the markers only), and
  the round adds, removes or renames no skill or agent, so no `plugin.json` or `CLAUDE.md` sync is
  owed by the self-documentation invariant.
- `### Task Checks` derivation is unaffected by the fix: the ADR block's check
  `ls docs/adr/ | grep -q -- '-<slug>.md$'` still settles on B22's `ls`-of-a-directory row
  (plan-review-checklist.md:141) before the `text` row, which is what M1 already describes.

## Assessment

The one Important from the final round is closed at the only place that decides the behaviour, the
seven carried Minors are untouched by design, and both gate subsections are green.

VERDICT: PASS
