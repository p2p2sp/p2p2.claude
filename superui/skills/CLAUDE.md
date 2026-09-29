# superui/skills - `pro-designer` references

- One home per rule: each rule lives in one reference (or in the `SKILL.md` non-negotiables) and
  every other file points at it instead of restating it (motion doctrine in `motion.md`, the
  concept brief in `concepting.md`, label/value treatment in `typography.md`, dark-mode physiology
  in `color.md`, touch-target minimums in `SKILL.md`). Adding a rule means finding its home, not
  copying it beside a pointer.
- Pointers between references use the bare filename, often plus a quoted heading of the target
  (`typography.md "Data display"`, `ux-psychology.md "Escape hatches"`, `ux-psychology.md "Smart defaults"`,
  `accessibility.md "Never color alone"`, `saas-dashboards.md "Containers"`,
  `layout-spacing.md "How much white space"`). Renaming or removing a heading, or moving a rule
  to another file, means grepping `references/` and `SKILL.md` for the old name in the same edit.
