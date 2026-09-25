# Issue steps

`<root>` is the project root. Every file below is written with `Write` to an absolute path under `<root>/.temp/viber/intent/` and passed to its script by that same path: a multi-line text never rides a Bash line.

## Save

1. Pick the template from the `issue-templates.sh` block. A template whose `TYPE` is `Bug` in any letter case is a bug template; with `TYPE` empty judge by `NAME` and `LABELS`. Propose the non-bug template that fits the confirmed summary best and name the others; the user may pick another. Every template a bug template -> say so and let the user pick one or skip the save; a skip hands off.
2. `Read` the chosen template file (the path on its `--- template` line). Fill each `body` entry that is not `type: markdown` from the confirmed summary and the interview: `dropdown` only with one of its `options`, `checkboxes` only with its option labels. A `validations.required: true` entry the summary does not answer -> ask for it in prose, one per message, before the preview. Never invent a value.
3. Title: the template's `TITLE` value followed by a one-line statement of the problem, in the user's language.
4. Body, the format GitHub itself renders from an issue form: per filled entry in template order, `### <attributes.label>`, a blank line, the content, a blank line. `textarea` and `input` take the text; `dropdown` the chosen option; `checkboxes` one `- [x] <label>` or `- [ ] <label>` line per option. An optional entry left empty reads `_No response_`. A `markdown` entry is left out. No secrets, credentials or file contents: the issue may be public.
5. Preview: print the title, `Type`, `Labels`, `Assignees`, `Projects` (`-` when empty) and the body exactly as it will be written, then ask in prose to create it or name a correction, and end the turn. A correction -> apply it and preview again. Anything but acceptance or a correction -> no issue, hand off.
6. On acceptance `Write` the body to `<root>/.temp/viber/intent/issue-body.md`, then run `"${CLAUDE_PLUGIN_ROOT}/scripts/create-issue.sh" "<file>" "<title>"` with the template's values appended on the same line: `--type "<TYPE>"` when `TYPE` is not empty, one `--label "<L>"` per `LABELS` item, one `--assignee "<A>"` per `ASSIGNEES` item, one `--project "<P>"` per `PROJECTS` item.
   - Exit 0 -> report `ISSUE_URL=`. `TYPE=dropped` or `TYPE=error` -> one line naming the type left off and its `TYPE_ERROR=`; the issue stands.
   - Exit 1 -> report its `ERROR` line and say whether an issue landed is unknown. Never retry. No issue URL is known.
   - Exit 2 -> report its `ERROR` line. No issue URL is known.

## Comment

1. Write the confirmed summary as the comment, in the language of your conversation with the user: what the interview settled and what it changed against the issue. No secrets, credentials or file contents: the comment may be public.
2. `Write` it to `<root>/.temp/viber/intent/<N>.md`, `<N>` being the `NUMBER=` value, then run `"${CLAUDE_PLUGIN_ROOT}/scripts/post-comment.sh" "<URL>" "<file>"`, `<URL>` being the `URL=` value.
   - Exit 0 -> report the `COMMENT_URL=` value.
   - Exit 1 -> report its `ERROR` line and say whether a comment landed is unknown. Never retry.
   - Exit 2 -> report its `ERROR` line.
