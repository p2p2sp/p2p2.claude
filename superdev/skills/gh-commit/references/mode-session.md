**Mode: session**

Commit **only what we touched in this conversation** — not unrelated changes that happen to sit in the working tree. This is the default when the argument is empty.

**Do this:**

1. From the conversation context, build the set of file paths created or modified during this session (the files written/edited while helping the user).
2. `git status --short` — keep only the paths from step 1 that actually show a change; drop the rest.
3. **No-op gate (resolver-owned):** if the resulting set is **empty** → report `no changes from context to commit` and **stop**. Do **not** invoke the committer, and do **not** fall back to staging the whole tree — silence is safer than a surprise commit.
4. Otherwise **delegate to `superdev:gh-agent-committer`** via the **Skill** tool with a fully-specified handoff:
   - **staging instruction:** stage **exactly these paths and nothing else** — `git add -- <path>…` for the resolved set.
   - **explicit path list:** the concrete paths from step 2, verbatim — the committer stages only these.
   - optional **one-line intent hint** — what this change does, carrying any `#N` / close-intent ("closes #42", "fixes #17") you can read from this session. It is a hint, not a subject — the committer authors the subject itself from the staged diff.
5. **Relay the committer's single-line result back to the user verbatim.**
