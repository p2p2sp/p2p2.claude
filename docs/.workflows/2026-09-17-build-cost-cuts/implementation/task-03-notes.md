# Task 3 notes

## Runs
- grep -c 'B22' superdev/references/plan-review-checklist.md -> 5
- grep -c 'B1-B22' superdev/skills/superplan-reviewer/SKILL.md superdev/skills/simpleplan-reviewer/SKILL.md -> superdev/skills/superplan-reviewer/SKILL.md:1, superdev/skills/simpleplan-reviewer/SKILL.md:1

Approach step 3: the B22 table writes the gate row as `none - covered by gate <Build\|Tests\|Integration>` - a bare pipe would split the markdown cell; a citing task drops the backslashes to get the literal.
UNDERSPECIFIED: precedence of B22's table over a `### Task Checks` section holding lines of several kinds - B22 states its rows are read top down, first match settles the kind, so a test-file line wins over a build command (same precedence B16/B17 already give a test-file line).
CARRY: superdev/skills/superplan/SKILL.md - line 112 self-review sentence still cites `## Blocking classes` B1-B21; expected to move with Task 4, which owns that file.
CARRY: superdev/skills/simpleplan/SKILL.md - line 113 self-review sentence still cites `## Blocking classes` B1-B21; expected to move with Task 5, which owns that file.
