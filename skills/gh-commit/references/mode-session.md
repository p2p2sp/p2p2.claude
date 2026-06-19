# Mode: session (default)

Commit **only what we touched in this conversation** — not unrelated changes that happen to sit in the working tree. This is the default when the argument is empty.

The router runs in the main context, so it can actually see the session: which files were created/edited while helping the user. A fork could not — that is the whole reason this path lives in the router, not the executor.

1. From the conversation context, build the set of file paths created or modified during this session (the files written/edited while helping the user).
2. `git status --short` — keep only the paths from step 1 that actually show a change; drop the rest.
3. If the resulting set is **empty** → this is a no-op: report `no changes from context to commit` and stop. Do **not** fall back to staging the whole tree — silence is safer than a surprise commit.
4. The staging instruction to hand the executor is: **stage exactly these paths and nothing else** — `git add -- <path>…` for the resolved set. List the paths verbatim in the handoff.

Then author the subject from the diff of that set (see [message-format.md](message-format.md)) and hand off to `gh-commit-exec`.
