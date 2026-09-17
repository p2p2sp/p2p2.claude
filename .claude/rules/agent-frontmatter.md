---
paths:
  - "*/agents/*.md"
---

# Agent frontmatter

- End the `description` with "Invoked only by <caller>, never directly." All 14 agents do: `Invoked only by superbuild, simplebuild, superdev-memory or superdev-rules, never directly.` (`superdev/agents/rules-writer.md`), `Invoked only by the code-auditor skill, never directly.` (`superfix/agents/critic.md`).
- Declare `tools:` and `model:` explicitly on every agent - 14/14 carry both. `tools:` is the agent-side equivalent of a skill's `disallowed-tools`: it is the actual restriction, so a read-only agent lists only the readers (`superfix/agents/scout.md` has `tools: Read, Grep, Glob`).
- Match the field shape of the directory being edited, not the other one. `superdev/agents/` uses `name, description, tools, model, effort, [background], color` and gives every agent a `color:` (9/9). `superfix/agents/` uses `name, description, model, effort, tools` and no `color:` (5/5).
- Open the body with the agent's role and state that its input is fully resolved so it never asks the user: "Input is fully resolved - never ask the user." (`memory-writer.md`, `qa-writer.md`, `changelog-writer.md`), or the role sentence "You are a Senior Developer..." followed by the fixed order of its steps (`superbuild-task-implementor.md`).
- Register the file in the owning plugin's `.claude-plugin/plugin.json` `agents[]` in the same edit that adds, renames or removes it. A worker must never appear in both `agents[]` and `skills[]`.
