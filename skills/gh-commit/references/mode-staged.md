# Mode: staged

No staging — commit what the user already staged, as-is.

1. `git diff --cached --name-only` — if empty → report `nothing is staged to commit` and stop (no-op gate).
2. `git diff --cached` — read the staged change to author the subject.
3. The staging instruction to hand the executor is: **do not stage anything — commit the index exactly as it stands** (the executor must not run `git add`).

Then author the subject from the staged diff (see [message-format.md](message-format.md)) and hand off to `gh-commit-exec` with the commit-the-index-as-is instruction.
