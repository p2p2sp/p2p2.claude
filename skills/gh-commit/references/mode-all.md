# Mode: all

No analysis of which files — the user asked for everything in the working tree.

1. `git status --short` — read the change to author the subject; if it shows nothing to commit, report `nothing to commit` and stop (no-op gate).
2. The staging instruction to hand the executor is: **`git add -A`** — stage every modified, new, and deleted file, then commit.

Then author the subject from the working-tree diff (see [message-format.md](message-format.md)) and hand off to `gh-commit-exec` with the `git add -A` staging instruction.
