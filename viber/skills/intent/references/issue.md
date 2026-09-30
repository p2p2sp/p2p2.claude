# Issue steps

`<root>` is the project root. Every file below is written with `Write` to an absolute path under `<root>/.temp/viber/intent/` and passed to its script by that same path: a multi-line text never rides a Bash line.

## Comment

1. Write the confirmed summary as the comment, in the language of your conversation with the user: what the interview settled and what it changed against the issue. No secrets, credentials or file contents: the comment may be public.
2. `Write` it to `<root>/.temp/viber/intent/<N>.md`, `<N>` being the `NUMBER=` value, then run `"${CLAUDE_PLUGIN_ROOT}/scripts/post-comment.sh" "<URL>" "<file>"`, `<URL>` being the `URL=` value.
   - Exit 0 -> report the `COMMENT_URL=` value.
   - Exit 1 -> report its `ERROR` line and say whether a comment landed is unknown. Never retry.
   - Exit 2 -> report its `ERROR` line.
