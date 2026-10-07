# Conventional Commits - subject & footer authoring

## Subject - `type(scope): description`

- `type` ∈ {feat, fix, refactor, docs, chore, test} - match what the diff DOES.
- `scope` - one word naming the module or area, in parens (`auth`, `agents`). Drop the parens entirely when no single scope fits; a forced scope is worse than none.
- `description` - imperative, lowercase, one line, no trailing period; what the change does, the way a reviewer skimming `git log` reads it.
- Subject only by default. Add a footer only per the rule below; never invent a body.

## Issue footer (optional)

Most commits need none. Add one only when the number is sourceable without guessing - never fabricate a number.

Source order (first that yields a number wins):

1. The "Issue footer (explicit…)" block in the injected context - a `#N` reference or a GitHub issue link was passed in the arguments. Copy that `Refs:` line verbatim and ignore the branch.
2. The current branch (see the "Current branch" block), via `(?i)(?:task|issue)\.(\d+)` (e.g. `feature/task.42-…` → `42`): exactly one distinct number → `Refs: #N`; zero or more than one → no footer (ambiguity is not worth a wrong link).

Put the footer inside the message string itself: subject line, one blank line, then `Refs: #N`. Omit it entirely when no number resolves - never append an empty footer.
