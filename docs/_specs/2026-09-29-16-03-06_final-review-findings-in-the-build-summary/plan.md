---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-29-16-03-06_final-review-findings-in-the-build-summary/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Report each final-review fix in the build summary
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: none
- Files: viber/agents/task-coder.md, viber/skills/implementor/fragments/final-review.true.md, viber/skills/implementor/SKILL.md
- Delivers: the coder's `FIXED:` line in review mode, the final-review step carrying every `FIXED:` and `OWNER:` line, and the final summary listing them outside its 7-line cap
- Verification: grep -n "FIXED:" viber/agents/task-coder.md && grep -n "FIXED:" viber/skills/implementor/fragments/final-review.true.md && grep -n "FIXED:" viber/skills/implementor/SKILL.md && node --test tests/portability.test.ts tests/orphan-tags.test.ts -> every grep prints a line and the tests pass
- DoD: `task-coder.md`'s output section declares the C1 line, returned only with `review:` lines, one per finding fixed, on `PASS` and on `FAIL` alike, each field one line with no `|`; its output section states that no other mode returns a `FIXED:` line; `final-review.true.md` carries every `FIXED:` line the fix coder returned and every `OWNER:` line any final reviewer or recheck returned to the final summary; `SKILL.md`'s final summary lists, after its 7 lines and outside its cap, every carried `FIXED:` line then every carried `OWNER:` line, each verbatim; the `OWNER:` lines no longer count within the 7 lines
<!-- /TASK -->

<!-- TASK -->
### T2 - Document the findings list in the summary
- TDD: none
- Covers: #4
- Uses: C1
- Depends-on: T1
- Files: viber/README.md, viber/skills/setup/assets/help.html
- Delivers: the README's `final-review` row and the help page's `key-final-review` entry and closing-summary passage describing the findings list, in both of the help page's languages
- Verification: node --test tests/viber/help.test.ts && grep -n "what was wrong" viber/README.md && grep -n "FIXED:" viber/skills/setup/assets/help.html && grep -n "FIXED:" viber/agents/task-coder.md -> the test passes and every grep prints a line
- DoD: the README's `final-review` row says the summary lists each finding with what was wrong and what the fix changed; `help.html`'s `key-final-review` entry says the same in English and Polish and names the `FIXED:` line; `help.html`'s closing-summary passage names the findings list and the owner's findings after the summary in English and Polish; `help.test.ts` passes
<!-- /TASK -->

## Contracts

### C1 - The `FIXED:` output line

File: viber/agents/task-coder.md

```
FIXED: <path:line> | <what was wrong> | <what it changed>

returned only by a coder dispatched with review: lines, one line per finding it fixed,
Blocking and Minor alike, on VERDICT: PASS and VERDICT: FAIL
each field one line, holding no |
```
