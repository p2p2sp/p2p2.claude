Commit **only what we touched in this conversation** — not unrelated changes that happen to sit in the working tree. This is the default when the argument is empty. You author the message inline (you already know these changes — you made them) and commit via `commit.sh`; there is NO fork.

1. From the conversation context, build the set of file paths created or modified during this session (the files written/edited while helping the user).
2. `git status --short` — keep only the paths from step 1 that actually show a change; drop the rest.
3. **No-op gate (resolver-owned):** if the resulting set is **empty** → report `no changes from context to commit` and **stop**. Do **not** call `commit.sh`, and do **not** fall back to committing the whole tree — silence is safer than a surprise commit.
4. **Author the subject (+ optional footer) inline** for exactly this path set, per the authoring rules appended below. Read the diff if you need to (`git diff -- <paths>`); you may already have the content from this session.
5. **Commit via the script** — `sh "${CLAUDE_PLUGIN_ROOT}/shared/scripts/commit.sh" paths "<subject>" "<footer-or-empty>" <path>…` with the resolved paths verbatim. The script stages ONLY those paths, commits, and verifies HEAD advanced before emitting its line.
6. **Relay the script's single stdout line verbatim** — it is the user-facing result. Do not re-run, re-verify, or summarize.

## Safety rules

- If you cannot determine a safe set of files to commit, prefer a **no-op** (report "nothing to commit") over guessing — an unwanted commit is far more costly to undo than a no-op is to re-run.
- Pass `commit.sh` exactly the resolved paths and nothing else — it stages only those; other working-tree changes stay untouched.
- One resolve, one `commit.sh` call, one report. Never re-run "to confirm" — the script self-verifies.
- Never push, merge, rebase, amend, cherry-pick, or use `--force` / `--no-verify`; the script never does either.
- Never edit source files, test files, or git config — this mode only resolves paths, authors a message, and calls the script.
- Never start a new branch.
