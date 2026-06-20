---
paths:
  - "skills/**"
---
# Skill Decoupling & Removal Refactors

- For markdown-only `tests-none` removal refactors, grep for residual coupling across the whole skill directory, not just the diffed files — audit-only files that never appear in the diff still fall under a "free of residual mentions" deliverable.
- A decoupling task legitimately keeps the removed framework's name when it is reframed as a downstream target — verify the mention is delegation, not coupling, instead of failing on a blanket name match.
