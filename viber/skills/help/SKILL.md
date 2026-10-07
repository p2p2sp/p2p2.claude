---
name: help
description: Opens the viber usage guide in the default browser.
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/open-page.sh:*)
user-invocable: true
disable-model-invocation: true
model: haiku
effort: low
background: true
---

# help

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/open-page.sh" "${CLAUDE_PLUGIN_ROOT}/skills/setup/assets/help.html"
```

The line above is the result. Return it verbatim as your whole reply: never run it again, never open or read the page.
