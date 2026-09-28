---
paths:
  - "viber/agents/*.md"
---

# Color a review-role agent yellow

- Give an agent whose job is to read a build, task or plan and return a verdict or findings
  report, never to write source itself, `color: yellow` - never a color chosen fresh for it.
  `task-reviewer.md`, `planner-review.md`, `plain-plan-review.md` and `closeout.md` all carry it;
  `final-reviewer.md`, the whole-build reviewer added for `final-review`, reused the same color
  rather than picking a new one (its own coder notes: "colored the agent `yellow` like the other
  review-role agents").
