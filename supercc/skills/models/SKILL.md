---
name: models
description: Per-model prompting profiles for Claude Code skills and agents - how Fable 5.1, Opus 5.5, Sonnet 5 and Haiku 4.5 read instructions, where each one fails and the wording that fixes it, plus the rules for a file that runs on several models. Use when choosing `model:` or `effort:` for a skill or agent, writing or tuning one for a named model, porting one to another model, or when an agent misbehaves on one model only (stops early, overreaches its scope, under-reports findings, skips parallel calls, fabricates to fill a format). Not the general authoring doctrine.
---

# models

Knowledge as of 2026-09-27. A model not listed here is not covered: say so, never extrapolate from a neighbour.

## Input

- The skill or agent file being written or tuned, or a role to staff.
- Optional: the target model or models, the observed misbehaviour.

## Workflow

1. Resolve the target models: the file's `model:` frontmatter, the model its caller dispatches it with, or the user's request. `inherit`, an absent `model:`, or a skill that runs on the session model means several models.
2. One target model: read its profile only.
   - Fable 5.1: `${CLAUDE_SKILL_DIR}/references/fable-5-1.md`
   - Opus 5.5: `${CLAUDE_SKILL_DIR}/references/opus-5-5.md`
   - Sonnet 5: `${CLAUDE_SKILL_DIR}/references/sonnet-5.md`
   - Haiku 4.5: `${CLAUDE_SKILL_DIR}/references/haiku-4-5.md`
3. Several or unknown models, or choosing a model or effort for a role: read `${CLAUDE_SKILL_DIR}/references/cross-model.md`; add a model's profile only to handle a quirk that model shows.
4. Apply only the mitigations the file's task exposes it to: an unattended-loop fix goes to an unattended agent, a recall fix to a reviewer. Never paste a whole profile into a file.
5. Write each mitigation in the target file's own voice as one imperative line, merged into the rule it modifies when one exists.

## Output

- The edits to the target file, or the model and effort recommendation for the role.
- Per addition, one line naming the model behaviour it addresses.
