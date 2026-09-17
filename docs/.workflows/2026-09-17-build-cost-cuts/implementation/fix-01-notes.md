# fix 01 notes

## Runs

- grep -c 'Kind:' superdev/skills/superplan/SKILL.md superdev/skills/superplan/templates/plan.md -> superdev/skills/superplan/SKILL.md:5, superdev/skills/superplan/templates/plan.md:1
- grep -c 'B1-B22' superdev/skills/superplan/SKILL.md -> 1
- grep -c 'Kind:' superdev/skills/simpleplan/SKILL.md superdev/skills/simpleplan/templates/plan.md -> superdev/skills/simpleplan/SKILL.md:5, superdev/skills/simpleplan/templates/plan.md:1
- grep -c 'B1-B22' superdev/skills/simpleplan/SKILL.md -> 1

I1: fixed - no test: prose-content assertion over a SKILL.md; the repo has no test tooling for skill/reference prose (`tests/` covers scripts only) and adding one would ship a new contract no task declares. Verified instead by a grep for the row wording ("covered by gate", "of a directory") over the tree outside `docs/`: it now hits `plan-review-checklist.md:140-141` and nothing else.
I2: fixed - no test: nothing parses `superdev/references/adr-task.md` - the block is copied into a plan by a planning skill, and `decompose.sh` only sees the resulting plan.

adr-task.md:27 block - `Kind: scaffold` inserted after `- TDD: none`, not after `- Effort: low` as I2's fix text reads: both `templates/plan.md` put `Kind:` between `TDD:` and `Model:`, and the `## Fill rules` marker-order sentence (line 20) delegates order to the template in use. That sentence needs no edit - it constrains only `Covers:`, which still sits above `TDD:` for simpleplan and below `Effort:` for superplan.
touched: superdev/references/adr-task.md

I1 - three-line summary replaces the row enumeration; the pointer sentence now also names the two things the copies had dropped (the `-l` qualifier's home in the `none - <reason>` / content-grep rows, and the top-down precedence), so a planner cannot mistake the summary for a complete rule.
touched: superdev/skills/superplan/SKILL.md

touched: superdev/skills/simpleplan/SKILL.md

UNDERSPECIFIED: `Kind:` marker position in the ADR task block - placed after `TDD:` to match both plan templates, over I2's literal "next to `Effort:`"; the two readings conflict only on position, and the template order is what B6 and `## Fill rules` key on.
