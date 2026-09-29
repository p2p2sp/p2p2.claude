To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Final review findings in the build summary

## Goal

After the final review the build summary shows only how many fixes landed and which report files hold them, so a person cannot tell from the summary what was wrong or what the fix changed. The fix coder, which knows both, reports one line per finding, and the build lists those lines and the owner's findings in its final summary.

## Acceptance criteria

1. A coder dispatched with `review:` lines returns one `FIXED:` line per finding it fixed, Blocking and Minor alike, naming the location, what was wrong and what it changed, each field on one line and holding no `|`; a coder dispatched with a task file or a `report:` line returns no `FIXED:` line and exactly the lines it returns today.
2. The final summary lists every `FIXED:` line of the final review's fix coder verbatim, after its 7 lines, outside its cap.
3. The final summary lists every `OWNER:` line of the final review verbatim, after its 7 lines, outside its cap.
4. `viber/README.md` and `help.html`, in English and Polish, say in the final-review description and in the build's closing summary that the summary lists each final-review finding with what was wrong and what the fix changed.

## Scope

### File map

- modify - viber/agents/task-coder.md - the `FIXED:` output line in review mode
- modify - viber/skills/implementor/fragments/final-review.true.md - carrying `FIXED:` and `OWNER:` lines to the final summary
- modify - viber/skills/implementor/SKILL.md - listing those lines after the summary, outside its cap
- modify - viber/README.md - the `final-review` row
- modify - viber/skills/setup/assets/help.html - the `key-final-review` entry and the build's closing summary passage, both languages

### Out of scope

- The number of fix rounds: one, a failed recheck ending on the arbiter's accept ruling.
- The output of `final-reviewer` and of the arbiter, the `OWNER:` line's own format included.
- The fix coder's `report:` mode (post-test repairs) and every task with a task file.
- Every `CLAUDE.md` node, left to the build's memory close.
