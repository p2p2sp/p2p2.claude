# Issue save steps

Input: the `STATUS=ready` block of `issue-templates.sh` and three values the caller names:

- `directory:` - `.temp/viber/<skill>/`, the one place this save writes.
- `eligible:` - `bug`, `non-bug` or `any`: the template kind the save may use.
- `content:` - what fills the title's summary and the body.

`<root>` is the project root. Every file below is written with `Write` to an absolute path under `<root>/<directory>` and passed to its script by that same path: a multi-line text never rides a Bash line.

Result: `ISSUE_URL=<url>` reported, or no issue.

1. Pick the template from the block. A template whose `TYPE` is `Bug` in any letter case is a bug template; with `TYPE` empty judge by `NAME` and `LABELS`. No template of the eligible kind -> say so in one line and end the save: no issue. One eligible template -> take it. Several -> one `AskUserQuestion`, the one that fits the content best first, at most four options, any further one by free text.
2. `Read` the chosen template file (the path on its `--- template` line). Fill each `body` entry that is not `type: markdown` from the content: `dropdown` only with one of its `options`, `checkboxes` only with its option labels. A `validations.required: true` entry the content does not answer -> ask for it in prose, one per message, before the preview. Never invent a value.
3. Title: the `TITLE_PATTERN` value with `{template-title}` replaced by the template's `TITLE`, `{type}` by its `TYPE` and `{summary}` by a one-line statement of the content in the user's language; an empty value empties its placeholder.
4. Body, the format GitHub itself renders from an issue form: per filled entry in template order, `### <attributes.label>`, a blank line, the content, a blank line. `textarea` and `input` take the text; `dropdown` the chosen option; `checkboxes` one `- [x] <label>` or `- [ ] <label>` line per option. An optional entry left empty reads `_No response_`. A `markdown` entry is left out. No secrets, credentials or file contents: the issue may be public.
5. Preview: print the title, `Type`, `Labels`, `Assignees`, `Projects` (`-` when empty) and the body exactly as it will be written, then ask through one `AskUserQuestion`: `Create` or `Do not create`, a correction travelling through its free-text field. A correction -> apply it and preview again. Anything but `Create` or a correction -> no issue.
6. On `Create` `Write` the body to `<root>/<directory>issue-body.md`, then run `"${CLAUDE_PLUGIN_ROOT}/scripts/issue-create.sh" "<file>" "<title>"` with the template's values appended on the same line: `--type "<TYPE>"` when `TYPE` is not empty, one `--label "<L>"` per `LABELS` item, one `--assignee "<A>"` per `ASSIGNEES` item, one `--project "<P>"` per `PROJECTS` item.
   - Exit 0 -> report `ISSUE_URL=`. `TYPE=dropped` or `TYPE=error` -> one line naming the type left off and its `TYPE_ERROR=`; the issue stands.
   - Exit 1 -> report its `ERROR` line and say whether an issue landed is unknown. Never retry. No issue URL is known.
   - Exit 2 -> report its `ERROR` line. No issue URL is known.
