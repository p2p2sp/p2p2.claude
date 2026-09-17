# Task 4 notes

## Runs
- grep -n "B18\|B19\|B20\|B21" superdev/references/plan-review-checklist.md -> exit 0 (6 matches: 18, 104, 109, 115, 119, 130)
- grep -n "B9-B14 and B18-B21" superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md -> exit 0 (superplan:56, simpleplan:59)
- grep -n "B1-B21" superdev/skills/superplan-reviewer/SKILL.md superdev/skills/simpleplan-reviewer/SKILL.md superdev/references/plan-review-checklist.md -> exit 0 (4 matches across the 3 files)
- grep -c "copy:" superdev/skills/superplan/templates/plan.md -> 1
- grep -n "whole repository" superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md -> exit 0 (6 matches: 39/40/83 and 45/46/86)

## Delta
- Step 5 named five sites for the `B1-B17` -> `B1-B21` widening; both plan skills carry that range once each (`### Self-Review`), so five sites is six hits total and `grep -n "B1-B17"` now returns nothing repo-wide.
- Step 2's three bullets were appended at the end of the B9-B14 list rather than interleaved, so the existing bullet order (B9 -> B14) stays readable and the new ones follow in B18-B20 order; B21 is carried by step 3's Gate-commands and Task-Checks text instead of a fourth bullet there, as step 2 specifies three bullets only.
- B19 in the checklist spells out that the `copy:` line is the one delegation form and names what it points at, because the class is otherwise indistinguishable from "the planner forgot the text" at review time.
- UNDERSPECIFIED: the `### Contracts` endpoint wording - B18 and both templates say "request shape, response shape and status codes" for an "HTTP endpoint, route or handler"; no transport beyond HTTP is named (a queue message, an RPC method) since criterion 15 says "punkt końcowy API" and widening it would have made the class unsettleable by reading `### Approach` alone.
- UNDERSPECIFIED: B21's whole-repository test is written against the host's memory files plus the plan's `### Files` ("a narrower scope ... covering what the plan moves"); a host whose runner offers no narrower scope therefore never trips B21, which keeps the class settleable with Read/Grep and keeps a single-project repo out of it.
