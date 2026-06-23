# Mode: all

No analysis of which files — the user asked for everything in the working tree.

1. The staging instruction to hand the committer is: **`git add -A`** — stage every modified, new, and deleted file, then commit.

Hand off to `gh-agent-committer` with the `git add -A` staging instruction and an optional one-line intent hint (what the change does, plus any `#N` / close-intent from the session). The committer stages, owns the no-op gate (nothing to commit → it reports the no-op line), reads the staged diff, and authors the subject itself.
