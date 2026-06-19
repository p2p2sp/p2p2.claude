---
name: gh-commit-exec
description: "Commit executor (fork) — invoked by the `gh-commit` router, NOT by the user. Receives a fully-specified commit (a verbatim Conventional Commits subject + a staging instruction) and carries it out: stages per the instruction and commits with the EXACT supplied subject. No re-synthesis, no analysis of the diff, never prompts — the router already authored the subject in the main context (which a fork cannot see). Runs on haiku out of the main context. Input/output contract: this skill's `# Input contract` / `# Output format`."
context: fork
model: haiku
user-invocable: false
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git diff-tree:*), Bash(git commit:*), Bash(git rev-parse:*)
---

# Commit executor (fork)

A verbatim executor for ONE fully-specified commit. The `gh-commit` router — running in the main context, where it can read the session — already chose the files and authored the subject. This fork only **stages per the instruction and commits with the exact supplied subject**. It does not re-derive the subject, does not analyse the diff, and never prompts (a fork cannot ask the user).

## Staged diff (preloaded)
--- stat ---
!`git diff --cached --stat`
--- stat ---

The stat above reflects the index **at fork start**. If the staging instruction is "commit the index as-is", this is already what will be committed; for the other instructions you still run the staging step below first.

# Input contract

The commit arrives as prose in your input, delivered in a trailing `ARGUMENTS:` block. A well-formed request carries:

- the **verbatim subject** — the full Conventional Commits subject line, plus an optional footer (e.g. `Refs: #42`). Use it byte-for-byte; do not rewrite, retype, or "improve" it.
- the **staging instruction** — exactly one of:
  - **stage these paths** — a specific list → `git add -- <path>…` (stage only those, nothing else);
  - **`git add -A`** — stage every modified, new, and deleted file;
  - **commit the index as-is** — do **not** run `git add`; commit whatever is already staged.

The input is the spec. Do not redesign it, do not re-pick the subject, do not stage anything beyond what the instruction names.

# How to work

1. **Stage per the instruction.**
   - stage these paths → `git add -- <path>…` for exactly the listed paths;
   - `git add -A` → run it;
   - commit the index as-is → run no `git add`.
2. **No-op gate.** `git diff --cached --name-only` — if empty, nothing is staged to commit: reply the no-op line (Output format) and stop. Never create an empty commit.
3. **Commit verbatim.**
   - subject only → `git commit -m "<subject>"`;
   - subject + footer → `git commit -m "<subject>" -m "<footer>"` (the second `-m` becomes the body, one blank line below the subject).
   Use the supplied subject exactly — no re-synthesis.
4. **Gather proof.** `git rev-parse --short HEAD` → `<hash>`; `git diff-tree --no-commit-id --name-only -r HEAD` → count the lines for `<N>` (the commit's file count).

# Output format

Reply with EXACTLY ONE line on stdout — no preamble, no fence, no narration, no second line. A person reads this line, so keep it human-readable (no XML/tagged format):

| Outcome | Line |
|---|---|
| Commit created | `✓ <hash> <subject> (<N> files)` |
| Nothing to commit (no-op gate) | `nothing to commit` |
| Git failure | a short one-line error quoting the git stderr |

Emit one line and stop. Never re-run "to confirm".

# Safety

- **Verbatim subject.** Commit the supplied subject exactly; never re-author, never analyse the diff to second-guess it.
- **Stage only what the instruction names.** Never widen the stage set; never `git add -A` when the instruction listed specific paths.
- Never push, merge, rebase, amend, cherry-pick, or use `--force` / `--no-verify`.
- Never edit source files, test files, or git config — this skill only stages and commits.
- Never run `git reset` or `git restore --staged` to "fix" the index — work with what the instruction stages.
- **Never ask the user** — a fork cannot prompt; an under-specified input is a one-line error, not a question.
- One commit attempt, one report. Never re-run after a result.
