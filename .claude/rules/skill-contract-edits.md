---
paths:
  - "superdev/skills/**/SKILL.md"
---
# Skill Contract Edits

- When a skill-contract rewrite replaces whole `##` sections (e.g. renaming or splitting headings), grep the skill body for orphaned references to the old heading names — the load-bearing risk in markdown-only skill edits is a stale cross-reference, not a code bug.
- A sibling doc (`references/*`, template) that cites a SKILL.md section by `§<letter>` shorthand and restates a structural claim from it must be kept in lockstep with that cited `§` contract — when the SKILL.md section changes, update the citing note's claim in the same edit.
