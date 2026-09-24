---
name: setup
description: Prepares a project for viber - seeds .claude/viber.yml, .gitignore and the recommended .claude/settings.json permissions.
allowed-tools: Read, Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:*)
user-invocable: true
disable-model-invocation: true
model: haiku
---

# setup

```!
"${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```

The lines above are the result. They are idempotent and self-verifying: report them as they
stand, never re-check them.

Nothing here is a choice. The switches land on in `.claude/viber.yml` - every key carries its
own comment and the user edits that file to turn one off with `false`. A file that was already
present keeps every value in it; only a switch this version added is appended to it, which the
preload's line names.

Then run the merge once - key by key and idempotent: the template's value wins a conflict, lists
only gain entries, a template entry in `permissions.ask` leaves the host's `permissions.deny`, and
a key the template lacks is never touched. Its line is carried into the close literally, never
re-verified, never retried; a non-zero exit is trusted the same way:

```
"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" "${CLAUDE_PLUGIN_ROOT}/skills/setup/assets/settings.json"
```

Close with one line per item: the preload's lines and the settings line.

Then `Read` `${CLAUDE_SKILL_DIR}/assets/usage.md` and print it verbatim, whole and unedited, as
the last thing in the reply - it is the project's onboarding text, not a source to summarise from.
Add nothing after it.
