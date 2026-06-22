# Mode: staged

No staging — commit what the user already staged, as-is.

1. The staging instruction to hand the committer is: **do not stage anything — commit the index exactly as it stands** (the committer must not run `git add`).

Hand off to `gh-committer` with the commit-the-index-as-is instruction and an optional one-line intent hint (what the change does, plus any `#N` / close-intent from the session). The committer owns the no-op gate (empty index → it reports the no-op line), reads the staged diff, and authors the subject itself.
