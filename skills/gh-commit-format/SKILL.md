---
name: gh-commit-format
description: >-
  Git conventions reference — Conventional Commits format (type(scope): description), branch naming patterns (feature/, fix/, refactor/), and orchestrator task-based commit format (T{N}: description). Must use this skill whenever the user writes a commit message, creates a branch, reviews whether a message matches the project convention, or asks about commit format, scope tags, or branch naming. Triggers include "commit message", "branch name", "commit format", "conventional commits", "naming convention". Do NOT format commit messages from memory — consult this skill first. Do NOT use for actually executing the commit — this skill only documents the format. Trigger applies in any language and to descriptive phrasing too.
user-invocable: false
---

# Conventional Commits

### Commit Format

Format: Conventional Commits — `type(scope): description`

- Types — `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- Scope — module or area in parentheses (e.g., `backend`, `auth`, `cors`, `.claude/skills`)
- Description — lowercase, imperative mood

Examples:

- `feat(backend): add user-profile endpoints`
- `fix(cors): distinguish dev and prod CORS policies`
- `refactor(.claude/skills): restructure orchestrator skill`

### Issue reference

If an issue number is known for this change, append it as a footer separated from the subject by one blank line. Default token: `Refs:`.

```
feat(auth): add token refresh

Refs: #42
```

- Token `Refs:` is the safe default — neutral, no side effects.
- A caller may instead use `Closes: #N` / `Fixes: #N` when auto-closing the issue on merge (GitHub semantics) is intended; it must be written explicitly by the caller — auto-synthesis does NOT pick `Closes:` on its own.
- The issue number is sourced by the caller (from the current prompt, session context, branch name, or plan files), never invented by this reference. GitHub refs use the `#N` format — a bare number such as `42` is written as `#42`.

### Other footer tokens

Conventional Commits v1.0 recognises additional footer tokens — most commonly `Co-Authored-By:`, `Signed-off-by:`, and `BREAKING CHANGE:` (the last one can alternatively be signalled by `!` before the colon in the subject, e.g. `feat(api)!: drop legacy endpoint`).

- This skill neither mandates nor forbids them — usage is **opt-in per project**.
- They reach a commit **only when the caller writes them explicitly** (the `Refs:` / `Closes:` / `Fixes:` footers, or any other footer, inlined by the caller). Auto-synthesised subjects MUST emit the subject alone — no body, no footers.
- Examples (where the host project opts in):
  - `Co-Authored-By: Alice <alice@example.com>` — pair-programming attribution.
  - `Signed-off-by: Alice <alice@example.com>` — Developer Certificate of Origin.
  - `BREAKING CHANGE: <description>` — semver-major signal.

### Task-Based Commits (Orchestrator)

When running orchestrator workflows, tasks use format: `T{N}: {message}`
- Example: `T4: Wire <Feature>View with side-panels + confirm dialog`
- Final workflow commit summarizes all tasks

### Branch Naming

- Pattern — `feature/{slug}`, `fix/{slug}`, `refactor/{slug}`
- Primary branch — `main`
