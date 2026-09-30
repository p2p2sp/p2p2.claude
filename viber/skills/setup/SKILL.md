---
name: setup
description: Prepares a project for viber - seeds .claude/viber.yml, .gitignore and the recommended .claude/settings.json permissions (asking whether to merge into or reset an existing one), checks the gh CLI is installed, checks whether CLAUDE.md names the build and test commands, and opens the usage guide in the browser.
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/open-page.sh:*), Read
user-invocable: true
disable-model-invocation: true
model: haiku
---

# setup

```!
"${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```

The lines above are the result. They are idempotent and self-verifying: report them as they stand, never re-check them.

The settings file is the one choice. On `settings.json: present`, ask with `AskUserQuestion` (a prose question ends the turn and the script's pre-approval with it) whether to:

- merge - fill in what is missing: the template's value wins a conflict, lists only gain entries, a template entry in `permissions.ask` leaves the host's `permissions.deny`, a key the template lacks is never touched.
- reset - replace the file with the template; the old one is kept in `.temp/viber/setup/`.

On `settings.json: absent` ask nothing and run the merge form, which creates the file.

Run the chosen form once. Its line is carried into the close literally, never re-verified, never retried; a non-zero exit is trusted the same way:

```
"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" "${CLAUDE_PLUGIN_ROOT}/skills/setup/templates/settings.json"
"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" --reset "${CLAUDE_PLUGIN_ROOT}/skills/setup/templates/settings.json"
```

Then check the project's `CLAUDE.md` against the preload's `CLAUDE.md:` line:

- Never edit `CLAUDE.md`.
- `CLAUDE.md: present - <path>` - read that file with `Read`, fresh, never from session context. Five items count. The build, the whole test suite, a single test file and the fast command (every test but the integration and end-to-end ones) each count as named only when the file contains its literal command. The layer marker convention counts as named when the file states how a test is tagged with its layer.
- All five named - the line is `CLAUDE.md: names the build, test, single-test-file and fast commands and the layer marker convention`.
- Any item not named - the line is `CLAUDE.md: missing <the missing items> - paste this prompt:`, followed by the content of `${CLAUDE_SKILL_DIR}/templates/claude-md-prompt.txt`, read with `Read`, verbatim in a code block.
- `CLAUDE.md: missing` - read no `CLAUDE.md`; the line is `CLAUDE.md: missing - run /init, then paste this prompt:`, followed by the same code block.

Then open the onboarding page in the user's browser, its line trusted like the settings line:

```
"${CLAUDE_PLUGIN_ROOT}/scripts/open-page.sh" "${CLAUDE_SKILL_DIR}/assets/help.html"
```

Close with one line per item: the preload's lines except its `settings.json:` and `CLAUDE.md:` ones, the settings line, the `CLAUDE.md:` check line with its prompt block, and the page line. Never read or restate the page's content in the reply.
