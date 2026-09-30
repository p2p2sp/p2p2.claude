---
name: create-pr
description: Opens a pull request for the current branch per the project's branching - title from github.pr-title, body from the work entry's pull request template, after a preview.
allowed-tools: Read, Edit(./.temp/viber/create-pr/**), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/pr-facts.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/pr-create.sh:*)
user-invocable: true
disable-model-invocation: true
---

# create-pr

One pull request for the current branch. The block below is trusted: never resolve the branch, the target, the template or the commits yourself.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/pr-facts.sh"
```

Every later run of a bundled script is one literal Bash line, `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>`, every argument double-quoted: never prefixed with an interpreter word, never assigned to a variable, never preceded by `cd`, never chained with `;`.

## 1. Stop reasons

`STATUS=stop` -> state in one line why no pull request can be opened, then end:

- `no-gh`: GitHub command line tool missing.
- `no-repo`: no GitHub repository reachable.
- `detached`: HEAD is detached; check out a branch.
- `dirty`: uncommitted changes to tracked files; commit them first.
- `on-base`: `BRANCH=` is the default branch or a work entry's base or target; a pull request needs its own branch.
- `pr-exists`: the branch already has an open pull request; give its `PR_URL=`.
- `no-commits`: nothing on the branch is ahead of its target.
- `unknown-entry`: the entry named is not a `branching.work` entry.

## 2. Entry and target

`STATUS=ready` with `ENTRY=` and `TARGET=` both empty:

- `MODE=off` -> one `AskUserQuestion` for the target branch, `DEFAULT=` offered first. Rerun `"${CLAUDE_PLUGIN_ROOT}/scripts/pr-facts.sh" --target "<branch>"`.
- Otherwise one `AskUserQuestion` over the `CANDIDATE=` lines, one option each. A `<key>` line -> rerun with `--entry "<key>"`; a `target: <branch>` line -> rerun with `--target "<branch>"`.

The rerun's block replaces the first one and is read from step 1 again.

## 3. Title

`TITLE_PATTERN=` with these replaced:

- `{type}` -> the `TYPE=` value.
- `{summary}` -> one line stating the change, in the language of `SPEC=`'s file, else of this conversation.
- `{issue-number}` -> the first `ISSUE=` value, empty when none.
- `{entry}` -> the `ENTRY=` value, empty when none.

Then collapse each run of blanks to one and trim.

## 4. Body

Fill from `SPEC=`'s file (`Read`), the `COMMIT=` lines and this conversation, never from anything else: a value none of them states is never invented. No secrets, credentials or file contents: the pull request may be public.

- `TEMPLATE=` set -> `Read` it and fill each section in template order. The four placeholders of step 3 are replaced wherever they stand. A section none of the three sources answers reads `_No response_`. Every HTML comment of the template is dropped. A checkbox stays unchecked unless a source states it done.
- `TEMPLATE=` empty -> the sections `## Summary`, `## Changes` and `## Testing`, filled the same way.

End the body with one line per `ISSUE=` value, after a blank line: `Closes #<n>` when `CLOSES=yes`, `Refs #<n>` otherwise.

## 5. Preview

Print the title, the target (`TARGET=`) and the body exactly as it will be written, then one `AskUserQuestion`: create, create as draft or cancel. A correction typed as the answer -> apply it and preview again. Cancel -> stop, nothing created.

## 6. Create

`Write` the body to `<root>/.temp/viber/create-pr/body.md` (`<root>` the project root; `Read` the file first when it exists), then run `"${CLAUDE_PLUGIN_ROOT}/scripts/pr-create.sh" "<file>" "<title>" --base "<TARGET>"`, plus ` --draft` for the draft answer.

- Exit 0 -> report `PR_URL=`.
- Exit 1 -> report its `ERROR` line. Never retry.
- Exit 2 -> report its `ERROR` line; nothing was pushed.

You run no test and change no code: the pull request is the only output. End on its `PR_URL=` or on the reason there is none.
