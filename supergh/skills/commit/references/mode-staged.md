## Use exact instructions below

The user asked to commit **already staged** in the working tree, as-is — no per-file analysis, no branch question. Just do instructions below.

1. **Delegate to `supergh:agent-committer`** via the **Skill** tool with a fully-specified handoff:
   - **staging instruction:** do **not** stage anything — commit the index exactly as it stands (the committer must not run `git add`).
   - optional **one-line intent hint** — what this change does, carrying any `#N` / close-intent ("closes #42", "fixes #17") you can read from this session. It is a hint, not a subject — the committer authors the subject itself from the staged diff.
2. **Relay the committer's single-line result back to the user verbatim.**
3. Do not summarize or analyze on your own.
