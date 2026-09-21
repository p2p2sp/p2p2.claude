---
paths:
  - "*/agents/*.md"
---

# Agent frontmatter

- End the `description` with "Invoked only by <caller>, never directly." All 24 agents do: `Invoked only by superbuild, simplebuild, superdev-memory or superdev-rules, never directly.` (`superdev/agents/rules-writer.md`), `Invoked only by the code-auditor skill, never directly.` (`superfix/agents/critic.md`), `Invoked only by the implementor skill, never directly.` (`viber/agents/task-coder.md`).
- Declare `tools:` and `model:` explicitly on every agent - 24/24 carry both. `tools:` is the agent-side equivalent of a skill's `disallowed-tools`: it is the actual restriction, so a read-only agent lists only the readers (`superfix/agents/scout.md` has `tools: Read, Grep, Glob`, `viber/agents/planner-review.md` the same three).
- Match the field shape of the directory being edited, not the other one. `superdev/agents/` (11 agents) and `viber/agents/` (8) both use `name, description, tools, model, effort, color` and give every agent a `color:` (11/11 and 8/8). `superfix/agents/` uses `name, description, model, effort, tools` and no `color:` (5/5). No agent carries `background:`: subagents run in fork mode, in the background, with the result delivered as a notification, so the field decides nothing (it was removed from the seven agents that carried `background: false`).
- Omit `effort:` on an agent pinned to `model: haiku` - Haiku 4.5 has no effort control, so the field would be dead at every dispatch (3/3: `superfix/agents/scout.md`, `superfix/agents/edge-scout.md`, `viber/agents/test-runner.md`). An agent dispatched across tiers keeps it even though the lowest tier ignores it: `viber/agents/task-coder.md` carries `effort: high` and is live on two of its three tiers. One rule, two correct outcomes - not an exception.
- Open the body with the agent's role and state that its input is fully resolved so it never asks the user: "Input is fully resolved - never ask the user." (`superdev/agents/changelog-writer.md`, `viber/agents/memory-writer.md`, `viber/agents/qa-writer.md` - qualify the path, four basenames exist in both directories), or the role sentence "You are a Senior Developer..." followed by the fixed order of its steps (`superdev/agents/superbuild-task-implementor.md`, `viber/agents/task-coder.md`).
- Register the file in the owning plugin's `.claude-plugin/plugin.json` `agents[]` in the same edit that adds, renames or removes it. A worker must never appear in both `agents[]` and `skills[]`.
