---
paths:
  - "skills/**"
---
# Skill Decoupling & Removal Refactors

- For markdown-only `tests-none` removal refactors, grep for residual coupling across the whole skill directory, not just the diffed files — audit-only files that never appear in the diff still fall under a "free of residual mentions" deliverable.
- A decoupling task legitimately keeps the removed framework's name when it is reframed as a downstream target — verify the mention is delegation, not coupling, instead of failing on a blanket name match.
- A `TODO`/`FIXME` token inside a string literal that a generator emits into its output (a deliberate scaffold marker), or inside a fenced code example documenting that emitted output, is not a work-deferral placeholder — the placeholder rule applies only to authored source, not to generated or documented output text.
- When a plan splits a file rename from its content relogic into separate tasks, git renders the moved file as add+delete (not `R`) in the diff; confirm via `git status` rename markers (`R`) before treating the moved file's body as the current task's diff — unchanged body is out of scope until the paired logic task.
