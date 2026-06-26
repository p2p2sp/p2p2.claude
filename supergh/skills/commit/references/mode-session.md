Commit **only what we touched in this conversation** — not unrelated changes that happen to sit in the working tree. This is the default when the argument is empty.

1. From the conversation context, build the set of file paths created or modified during this session (the files written/edited while helping the user).
2. `git status --short` — keep only the paths from step 1 that actually show a change; drop the rest.
3. **No-op gate (resolver-owned):** if the resulting set is **empty** → report `no changes from context to commit` and **stop**. Do **not** invoke the committer, and do **not** fall back to staging the whole tree — silence is safer than a surprise commit.
4. Otherwise **delegate to `supergh:agent-committer`** via the **Skill** tool with a fully-specified handoff:
   - **staging instruction:** stage **exactly these paths and nothing else** — `git add -- <path>…` for the resolved set.
   - **explicit path list:** the concrete paths from step 2, verbatim — the committer stages only these.
   - optional **one-line intent hint** — what this change does, carrying any `#N` / close-intent ("closes #42", "fixes #17") you can read from this session. It is a hint, not a subject — the committer authors the subject itself from the staged diff.
5. **Relay the committer's single-line result back to the user verbatim.**

## Safety rules

- If you cannot determine a safe set of files to commit, prefer a **no-op** (report "nothing to commit") over guessing — an unwanted commit is far more costly to undo than a no-op is to re-run.
- The resolver is **read-only on git** — it inspects with `git status` / `git rev-parse` only. All staging, diff-reading, and committing happens in the committer fork.
- Never push, merge, rebase, amend, cherry-pick, or use `--force` / `--no-verify`; never instruct the committer to.
- Never edit source files, test files, or git config — this skill only inspects, routes, and passes a hint.
- One route, one delegation, one report. Never re-run "to confirm".
- Never question or analyze user intent to commit `all` or `staged` files.
- If mode is `all` or `staged`, never propose or start a new branch.