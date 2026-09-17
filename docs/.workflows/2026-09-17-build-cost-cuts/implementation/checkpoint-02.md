# checkpoint review

## Gates

- Build - none - repo to markdown, JSON i bash; nie ma kroku budowy (root CLAUDE.md: "Editing markdown / JSON IS shipping")
- Tests - pass - 28s

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | `B22 table copied into both planners` | ADDRESSED | superdev/skills/superplan/SKILL.md:109 |
| I2 | `ADR task block lacks Kind` | ADDRESSED | superdev/references/adr-task.md:32 |
| M1 | `B22 rows shadow the text row` | NOT ADDRESSED | superdev/references/plan-review-checklist.md:141 |
| M2 | `ADR task pays a per-task review` | NOT ADDRESSED | superdev/references/adr-task.md:32 |

Both still-open IDs are Minor and neither file is in this delta; no fix round ran between the two
checkpoints.

## Debt

- M3 - `Kind: text limits fight the agent's own steps` - superdev/agents/superbuild-task-implementor.md:37,
  superdev/agents/simplebuild-task-implementor.md:36 - the `Kind: text` sub-bullet reads "read only
  the files under `### Files` and the files `### Approach` names ... (no `Grep`, no `Read` outside
  that set); one pass: write, run `### Task Checks`, record notes". Two other sections of the same
  file say otherwise: `## Input` orders every file-valued label read (`plan-header`, `decisions`,
  `refs`), and `## 2. Build + Test` orders "Any red -> fix, then re-run from step 1" under "never
  report PASS on unproven work". A text-task implementor reading the parenthetical as absolute skips
  its `decisions:` file and re-opens a matter the user closed; one reading "one pass" as a budget
  returns PASS on a red `### Task Checks` grep. Minor because the restriction's own clause names its
  subject ("search no other repo file **for precedent**") and step 2's imperative is unambiguous, so
  the likely reading is the intended one. Fix: scope the parenthetical to the precedent search
  ("no `Grep` or `Read` over repo files outside that set for precedent - the labels of `## Input`
  are always read") and say "one pass over the file set, step 2's fix loop unchanged".

## Notes

- NOTE: plan defect - M3's wording is Task 6 `### Approach` step 2 verbatim ("jedno przejście:
  napisz, uruchom `### Task Checks`, zapisz notatki", "żadnego `Grep` ani `Read` poza tym zbiorem").
  The implementor transcribed it faithfully; the carve-out for `## Input`'s labels and for step 2's
  fix loop is missing from the plan, not from the implementation.
- The runtime-call rule closes in fact, not only in wording: every `${CLAUDE_PLUGIN_ROOT}` script
  named in `superbuild`, `simplebuild`, `e2e` and the three build reviewers has a matching
  `Bash(...:*)` entry in that file's `allowed-tools` (8 / 8 / 2 / 3 each), and every one of those
  scripts is `100755` in the git index. The only `bash "${CLAUDE_PLUGIN_ROOT}` forms left in the tree
  are `vibe/SKILL.md` (Task 15, open) and the hooks example in `.claude/rules/shell-preload-contract.md`,
  which is correct as it stands.
- The three `<review>` states in `superbuild/SKILL.md:76,108` agree token for token with the rewritten
  `## Dispatch strength` of `superdev/references/review-contract.md`, with `superplan/SKILL.md:115`
  and `templates/plan.md:31,33`, and with B6 of the plan review checklist. `decompose.sh:377,394`
  passes the marker through verbatim and validates nothing, so the skill's escalation branch for a
  fourth value is the only guard - and it is present.
- No cross-task duplication to judge: the `<effort>`, stats-record and bundled-script sentences are
  the two tracks' usual parallel copies and are identical in both, and the two `UNDERSPECIFIED:`
  lines in `task-06-notes.md` name the same task's own formatting, not a shared field.
- `superdev/README.md:68,186,190` and `superdev/CLAUDE.md:50` still describe the two-state `Review:`
  marker and effort-based dispatch; that is Task 14's declared scope, not a gap in this delta.

## Assessment

The delta is coherent with the contract it delegates to and with the scripts it calls, the gate is
green, and the one defect found is a Minor whose wording the plan dictated.

VERDICT: PASS
