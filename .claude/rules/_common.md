---
paths:
  - "**/*.md"
---
# EXTREMELY IMPORTANT
The model does not need a history of decisions to execute one. The prose is for users, not the agent, and belongs in CLAUDE.md or a script header comment—not in a contract that gets read repeatedly during execution.

Do not bloat the skills, agents or any referenced files. The instructions are intended to guide the agent on how to operate within the plugin while simultaneously allowing it the freedom to decide how to execute planned tasks within certain parameters.

When work with skills or agents ALWAYS use `skill-designer` rules.

# DURING PLAN MODE
When user ask and you need to decide how to design a solution for this repository and plan implementation, always find out what the functional scope of claude code harnes is for today using exited precedent or use `claude-code-guide`.

# README FILES
Readme files are for human. Should short, simple and should contain only essential information how to use it, without implementation details of these plugins.