---
name: gh-commit
description: >-
  Commit router — runs in the MAIN context so it can read this session's conversation, picks the
  commit MODE, authors a Conventional Commits subject from the diff, then delegates the actual
  staging + commit to the `superdev:gh-commit-exec` fork. Use this skill whenever the user wants to
  commit changes, save work to git, create a commit, or "wrap up" edits — even if they don't say the
  exact word "commit". Three modes via argument: (no arg) gather the files changed in THIS session
  from conversation context and commit only those; `all` → stage every new/modified/deleted file
  (`git add -A`) and commit; `staged` → commit whatever is already staged. Triggers include "commit",
  "zakomituj", "make a commit", "git commit", "commit all", "commit staged", "save my changes". Do
  NOT run `git add` / `git commit` directly via Bash — use this skill. Do NOT use for explaining the
  commit-message format or branch naming — that is the gh-commit-format reference. Trigger applies in
  any language and to descriptive phrasing too.
allowed-tools: Read, Bash(git status:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(git diff-tree:*), Skill
user-invocable: true
argument-hint: "[all|staged]"
---

# Commit router

Pick the right files to commit and author a clean Conventional Commits subject, then hand the staging + commit off to the `superdev:gh-commit-exec` fork. This skill runs in the **main context on purpose** — it needs to read THIS session's conversation to know which files we touched and to write a subject that reflects what the work actually did; a fork cannot see that context. The router never runs `git add` / `git commit` itself — that is the executor's job.

If you cannot determine a safe set of files to commit, prefer a **no-op** (report "nothing to commit") over guessing — an unwanted commit is far more costly to undo than a no-op is to re-run.

## Mode

The mode comes from the skill argument (`$ARGUMENTS`). Take the **first whitespace-delimited token**, lowercased:

| Argument token | Mode | Path reference |
| --- | --- | --- |
| `all` | `all` | [references/mode-all.md](references/mode-all.md) |
| `staged` | `staged` | [references/mode-staged.md](references/mode-staged.md) |
| empty / anything else | `session` | [references/mode-session.md](references/mode-session.md) |

No argument at all → default to **session**.

## How to route

1. Resolve the mode from the argument (table above).
2. **Read only the chosen path's reference** — do not load the other two. It tells you how to compute the file set and what staging instruction to hand the executor.
3. Read the change (`git status` / `git diff` / `git diff --cached`, per the path reference) and **author the Conventional Commits subject + optional issue footer** following [references/message-format.md](references/message-format.md). You author it here, in the main context, because only here can you read the session.
4. If the path reference's no-op gate fires (empty file set / nothing staged), report its no-op line and stop — do not invoke the executor.
5. Otherwise **delegate to `superdev:gh-commit-exec`** via the Skill tool with a fully-specified instruction containing:
   - the **verbatim subject** (and the footer, if any) — the executor commits it exactly, with no re-synthesis;
   - the **staging instruction** from the path reference — one of: "stage exactly these paths: `<path>…`" / "`git add -A`" / "do not stage — commit the index as-is".
6. Relay the executor's single-line result back to the user verbatim.

## Safety rules

- The router is **read-only on git** — it inspects with `git status` / `git diff` / `git rev-parse` / `git diff-tree` only. All staging and committing happens in the executor fork.
- Never push, merge, rebase, amend, cherry-pick, or use `--force` / `--no-verify`; never instruct the executor to.
- Never edit source files, test files, or git config — this skill only inspects, routes, and authors a subject.
- This skill is git-only — it never touches the GitHub API. For gh / REST / GraphQL operations the `gh-cli` skill is the layer reference (informational see-also, not a functional dependency).
- One route, one delegation, one report. Never re-run "to confirm".
