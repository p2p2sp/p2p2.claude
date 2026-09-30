---
name: create-issue
description: Creates a GitHub issue from the project's issue form templates. Use when the user asks to open an issue, not to fix a bug.
argument-hint: "[what the issue is about]"
allowed-tools: Read, Edit(./.temp/viber/create-issue/**), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/issue-templates.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/issue-create.sh:*)
---

# create-issue

One issue filed from the project's own issue form templates. The block below is trusted: never list the templates or resolve the repository yourself.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/issue-templates.sh"
```

- `STATUS=skip` -> state in one line why no issue can be created (`REASON=no-templates`: no issue form template; `no-gh`: GitHub command line tool missing; `no-repo`: no GitHub repository reachable), then stop.
- `STATUS=ready` -> save the issue per `${CLAUDE_PLUGIN_ROOT}/references/issue-save.md`, read at this step, with `directory: .temp/viber/create-issue/`, `eligible: any` and `content:` the argument `$ARGUMENTS` and what this conversation says about the issue. An argument that names a template or its kind picks it. No argument and nothing in the conversation to file -> ask in prose what the issue is about, then end the turn.

You run no test, change no code and open no pull request: the issue is the only output. End on its `ISSUE_URL=` or on the reason there is none.
