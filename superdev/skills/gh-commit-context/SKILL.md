---
name: gh-commit-context
description: >-
  Commit context resolver — runs in the MAIN context so it can read this session's conversation,
  picks the commit MODE, resolves WHICH files to commit, then delegates the staging + commit (and
  the subject authoring) to the `superdev:gh-agent-committer` fork. Use this skill whenever the user wants
  to commit changes, save work to git, create a commit, or "wrap up" edits — even if they don't say
  the exact word "commit". Three modes via argument: (no arg) gather the files changed in THIS session
  from conversation context and commit only those; `all` → stage every new/modified/deleted file
  (`git add -A`) and commit; `staged` → commit whatever is already staged. Triggers include "commit",
  "zakomituj", "make a commit", "git commit", "commit all", "commit staged", "save my changes". Do
  NOT run `git add` / `git commit` directly via Bash — use this skill. Trigger applies in any language
  and to descriptive phrasing too.
allowed-tools: Read, Bash(git status:*), Bash(git rev-parse:*), Skill
user-invocable: true
argument-hint: "[all|staged]"
effort: low
---

# Commit context resolver

Pick the right files to commit, then hand the staging + commit off to the `superdev:gh-agent-committer` fork. This skill runs in the **main context on purpose** — it needs to read THIS session's conversation to know which files we touched and to pass a compact intent hint reflecting what the work actually did; a fork cannot see that context. The resolver never runs `git add` / `git commit` itself, and never reads the diff to author a subject — staging, diff-reading, and subject authoring are the committer's job.

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
2. **Read only the chosen path's reference** — do not load the other two. It tells you how to compute the file set (session mode) and what staging instruction to hand the committer.
3. If the path reference's no-op gate fires (session mode: empty file set), report its no-op line and stop — do not invoke the committer. (`all` / `staged` let the committer own the no-op gate.)
4. Otherwise **delegate to `superdev:gh-agent-committer`** via the Skill tool with a fully-specified handoff containing:
   - the **staging instruction** from the path reference — one of: "stage exactly these paths: `<path>…`" / "`git add -A`" / "do not stage — commit the index as-is";
   - the **explicit path list** (session mode only) — the concrete paths the committer must stage;
   - an optional **one-line intent hint** — a short statement of what this change does, carrying any `#N` / close-intent ("closes #42", "fixes #17") you can read from the session. It is a hint, not a subject — the committer authors the subject itself from the staged diff.
5. Relay the committer's single-line result back to the user verbatim.

## Safety rules

- The resolver is **read-only on git** — it inspects with `git status` / `git rev-parse` only. All staging, diff-reading, and committing happens in the committer fork.
- Never push, merge, rebase, amend, cherry-pick, or use `--force` / `--no-verify`; never instruct the committer to.
- Never edit source files, test files, or git config — this skill only inspects, routes, and passes a hint.
- This skill is git-only — it never touches the GitHub API. For gh / REST / GraphQL operations the `gh-cli` skill is the layer reference (informational see-also, not a functional dependency).
- One route, one delegation, one report. Never re-run "to confirm".
- Never question or analyze user intent to commit `all` or `staged` files.
- If mode is `all` or `staged`, never propose or start a new branch.
