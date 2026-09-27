---
paths:
  - "viber/agents/*.md"
  - "viber/skills/*/SKILL.md"
---

# One rule per line in a contract section

- Give each distinct condition or case of an Input, dispatch or decision section its own bullet
  line instead of packing several into one paragraph or one bullet, even when they share a label.
  `viber/agents/task-coder.md`'s Input section keeps one opening sentence naming every labelled
  path (`task`, `report`, `notes`, `out`, `refs`, `spec`), then gives `reason`/`resume`, `Repro:`,
  `deferred`, `prior` and `decision:` each its own bullet stating that line's rule alone.
