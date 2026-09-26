# Conventional Commits - subject & footer authoring

## Subject - `type(scope): description`

- `type` ∈ {feat, fix, refactor, docs, chore, test} - match what the diff DOES.
- `scope` - module / area in parens (`auth`, `agents`). Drop the parens
  entirely when no single scope fits; a forced scope is worse than none. Area - always one word.
- `description` - imperative, lowercase, one line, no trailing period; what the change does, the way a reviewer skimming `git log` reads it.
- Subject only by default. Add a footer only per the rule below; never invent a body.

## Issue footer (optional)

Most commits need none. Add one only when the number is sourceable without guessing - never fabricate a number.

Source order (first that yields a number wins):

1. The "Issue footer (explicit…)" block in the injected context - a `#N` reference or a GitHub issue link was passed in the arguments. Copy that `Refs:` line verbatim and ignore the branch.
2. The current branch (see the "Current branch" block), via `(?i)(?:task|issue)\.(\d+)` (e.g. `feature/task.42-…` → `42`): exactly one distinct number → `Refs: #N`; zero or more than one → no footer (ambiguity is not worth a wrong link).

Put the footer inside the message string itself: subject line, one blank line, then `Refs: #N`. Omit it entirely when no number resolves - never append an empty footer.

## Examples

- Two user-profile endpoints, branch `main` → `feat(profile): add user-profile endpoints`
- CORS fix on branch `feature/task.42-cors` → `fix(cors): distinguish dev and prod policies`, then a blank line, then `Refs: #42`
- Args carried `#7` (or `https://github.com/o/r/issues/7`) on branch `main` → subject, blank line, then `Refs: #7`
- Deprecated flag dropped on a branch with no task number → `refactor(config): drop deprecated retry flag` (no footer)
