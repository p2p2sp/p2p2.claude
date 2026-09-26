---
name: setup
description: Prepares a project for viber - seeds .claude/viber.yml, .gitignore and the recommended .claude/settings.json permissions (asking whether to merge into or reset an existing one), checks the gh CLI is installed, and opens the usage guide in the browser.
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/open-page.sh:*)
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

The settings file is the one choice. On `settings.json: present`, ask with `AskUserQuestion` (a
prose question ends the turn and the script's pre-approval with it) whether to:

- merge - fill in what is missing: the template's value wins a conflict, lists only gain entries,
  a template entry in `permissions.ask` leaves the host's `permissions.deny`, a key the template
  lacks is never touched.
- reset - replace the file with the template; the old one is kept in `.temp/viber/setup/`.

On `settings.json: absent` ask nothing and run the merge form, which creates the file.

Run the chosen form once. Its line is carried into the close literally, never re-verified, never
retried; a non-zero exit is trusted the same way:

```
"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" "${CLAUDE_PLUGIN_ROOT}/skills/setup/templates/settings.json"
"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" --reset "${CLAUDE_PLUGIN_ROOT}/skills/setup/templates/settings.json"
```

Then open the onboarding page in the user's browser, its line trusted the same way:

```
"${CLAUDE_PLUGIN_ROOT}/scripts/open-page.sh" "${CLAUDE_SKILL_DIR}/assets/usage.html"
```

Close with one line per item: the preload's lines except its `settings.json:` one, the settings
line and the page line. Never
read or restate the page's content in the reply.
