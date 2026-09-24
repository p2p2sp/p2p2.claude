---
paths:
  - "*/agents/*.md"
---

# Agent frontmatter

- End the `description` with "Invoked only by <caller>, never directly." Every agent does: `Invoked only by the code-auditor skill, never directly.` (`superfix/agents/critic.md`), `Invoked only by the implementor skill, never directly.` (`viber/agents/task-coder.md`).
- Declare `tools:` and `model:` explicitly on every agent - every one carries both. `tools:` is the agent-side equivalent of a skill's `disallowed-tools`: it is the actual restriction, so a read-only agent lists only the readers (`superfix/agents/scout.md` has `tools: Read, Grep, Glob`, `viber/agents/planner-review.md` the same three).
- Match the field shape of the directory being edited, not the other one. `viber/agents/` uses `name, description, tools, model, effort, color` and gives every agent a `color:`. `superfix/agents/` uses `name, description, model, effort, tools` and no `color:` (5/5). No agent carries `background:`: subagents run in fork mode, in the background, with the result delivered as a notification, so the field decides nothing (it was removed from the seven agents that carried `background: false`).
- Omit `effort:` on an agent pinned to `model: haiku` - Haiku 4.5 has no effort control, so the field would be dead at every dispatch (3/3: `superfix/agents/scout.md`, `superfix/agents/edge-scout.md`, `viber/agents/test-runner.md`). An agent dispatched across tiers keeps it even though the lowest tier ignores it: `viber/agents/task-coder.md` carries `effort: high` and is live on two of its three tiers. One rule, two correct outcomes - not an exception.
- Open the body with the agent's role and state that its input is fully resolved so it never asks the user: "Input is fully resolved - never ask the user." (`viber/agents/memory-writer.md`, `viber/agents/qa-writer.md`), or the role sentence "You are a Senior Developer..." followed by the fixed order of its steps (`viber/agents/task-coder.md`).
- Register the file in the owning plugin's `.claude-plugin/plugin.json` `agents[]` in the same edit that adds, renames or removes it. A worker must never appear in both `agents[]` and `skills[]`.
- No agent carries `permissionMode:`: plugin subagents ignore the field, so it decides nothing at any dispatch.
