---
name: handoff
description: Writes a handoff file that lets a fresh session continue the current conversation - where to look, what is done, the decisions with the alternatives they rejected, what comes next and the open problems. Saved under .temp/viber/handoff/ unless a directory or a .md file path is given.
argument-hint: "[directory or .md file path]"
allowed-tools: Read, Write, Edit(./.temp/viber/handoff/**), Bash(${CLAUDE_SKILL_DIR}/scripts/handoff-path.sh:*)
user-invocable: true
disable-model-invocation: true
---

```!
"${CLAUDE_SKILL_DIR}/scripts/handoff-path.sh" '$ARGUMENTS'
```

# handoff

The conversation in, one handoff file out. The block above is trusted: never resolve the path, the date or the branch yourself.

## Rules

- Source is this conversation alone and what was read or run in it. Open no file to fill a gap: a fact the conversation never confirmed goes to Open problems.
- An open viber run in the conversation -> name its run directory under Where to look and copy none of its tasks: its `status.md` is what a build resumes from.
- NEVER write a secret, token, password or any `.env` content into the file.
- `EXISTS=true` -> write nothing; name the path and ask for a rerun with another path, then stop.

## Write

1. Slug: 2 to 5 words naming the topic, kebab-case, ASCII, put in place of `{slug}` in `FILE`.
2. Fill `${CLAUDE_SKILL_DIR}/templates/handoff.md`, read at this step.
3. `Write` the result to `FILE`.

## Output

In the language of the conversation, and nothing else:
- the file path;
- one line to paste into a new session: `Read <path> and continue from its What's next section.`
