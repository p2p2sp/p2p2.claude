# Commit message format

How to turn a staged diff into the commit message. This is the single place that owns message synthesis for the `commit` skill; the canonical project-wide reference is the sibling `superdev:gh-commit-format` skill — this file inlines just what the fork needs to act without a second lookup.

## Subject — Conventional Commits

Shape: `type(scope): description`

- `type` ∈ `{feat, fix, refactor, docs, chore, test}` — pick the one that matches the staged diff.
- `scope` — the module or area in parentheses (e.g. `auth`, `agents`, `.claude/skills`). Drop the
  parentheses entirely when no single scope fits; a forced scope is worse than none.
- `description` — imperative mood, lowercase, one line, no trailing period.
- Subject only by default. Add a footer only per the rule below; never invent a body.

Read the actual diff, not just file names — the description should say what the change *does*, the way a reviewer skimming `git log` would want to read it.

## Issue footer (optional)

Most commits need no footer. Add one only when the change is clearly tied to a specific issue and you can source the number without guessing.

Resolve a number `N` from, in order:

1. the conversation context (an explicit `#N`, or "issue 42" / "task 42"), then
2. the current branch name via `(?i)(?:task|issue)\.(\d+)` (e.g. `feature/task.42-…` → `42`).

Then:

- **Exactly one distinct number** found → append `Refs: #N`.
- The user explicitly signalled closing the issue ("this closes #42", "fixes #42") → use
  `Closes: #N` (or `Fixes: #N`) instead of `Refs:`. Do not pick a closing keyword on your own —
  `Refs:` is the safe default.
- **Zero, or more than one** distinct number → no footer. Ambiguity is not worth a wrong link.
- Never fabricate a number. If nothing reliable is found, the subject stands alone.

The footer is passed as a second `git commit -m` so it lands in the commit body, one blank line below the subject.

## Examples

**Example 1 — plain subject**
Input: staged diff adds two endpoints under the user-profile module, no issue in context.
Output: `feat(profile): add user-profile endpoints`

**Example 2 — subject + Refs footer**
Input: staged diff fixes CORS handling; the user wrote "this is for #42" earlier in the session.
Output:
```
fix(cors): distinguish dev and prod policies

Refs: #42
```

**Example 3 — subject + Closes footer (explicit close intent)**
Input: staged diff removes a deprecated flag; the user said "let's close #17 with this".
Output:
```
refactor(config): drop deprecated legacy flag

Closes: #17
```

**Example 4 — ambiguous numbers → no footer**
Input: the session mentioned both `#42` and `#7`; staged diff touches docs only.
Output: `docs(readme): clarify install steps`
