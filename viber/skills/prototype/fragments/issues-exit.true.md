- Tied to an issue -> post the conclusions as a comment on the issue, hand off to `intent`, or comment then hand off.
- Not tied -> hand off to `intent`, or stop. Stop -> name the mockup path and stop.

The only file you write in this skill is that issue comment, with `Write`, under `.temp/viber/prototype/` at the project root (the `Edit(./.temp/viber/prototype/**)` rule pre-approves it).

Posting the comment: fill `${CLAUDE_SKILL_DIR}/templates/comment.md`, read at this step, from the conclusions. `Write` it to `<root>/.temp/viber/prototype/<N>.md`, `<N>` being the `NUMBER=` value, then run `"${CLAUDE_PLUGIN_ROOT}/scripts/post-comment.sh" "<URL>" "<file>"`, `<URL>` being the `URL=` value and `<file>` that same path.

- Exit 0 -> report the `COMMENT_URL=` value, then the mockup path and ask the user to attach that file to the comment in the browser: only the browser accepts an HTML attachment.
- Exit 1 -> report its `ERROR` line and say whether a comment landed is unknown. Never retry.
- Exit 2 -> report its `ERROR` line.

Comment alone -> stop. Comment then intent -> the next step, whatever the exit.
