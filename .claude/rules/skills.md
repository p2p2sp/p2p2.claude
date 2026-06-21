---
paths:
  - "skills/**"
---

To create or edit, refactor, change, optymize you MUST use your available skills:
- skill-creator
- skill-chaining
- authoring-reference

When a skill documents a cross-skill chain (e.g. `skill-A → skill-B`), verify claimed flags, behaviors, and guarantees against the referenced skill's own SKILL.md — not just for prose presence but for factual accuracy.

When a skill's prose quotes a bundled helper's stdout contract (marker strings, header line, row shape), treat those literals as a load-bearing cross-artefact contract — verify them character-for-character against the script's render/emit code, not merely for presence.