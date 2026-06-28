The user asked to commit in the staging mode named on the **staging mode** line injected directly above — no per-file analysis, no branch question. Just do the instructions below.

1. **Delegate to `supergh:agent-committer`** via the **Skill** tool with a fully-specified handoff:
   - **staging mode** — pass the mode from the injected line verbatim: `all` or `index`. The committer hands it to `commit.sh`, which does the staging (`git add -A` for `all`, nothing for `index`).
   - optional **one-line intent hint** — what this change does, carrying any `#N` / close-intent ("closes #42", "fixes #17") you can read from this session. It is a hint, not a subject — the committer authors the subject itself from the diff.
2. **Relay the committer's single-line result back to the user verbatim.**
3. Do not summarize or analyze on your own.
- NEVER question, analyze or explain user intent to commit `all` or `staged` files. If the user wants it then do it without doubts.
- Never propose or start a new branch.
