# Conventional Commits — subject & footer authoring

Single source of the message-authoring rules.

## Subject — `type(scope): description`

- `type` ∈ {feat, fix, refactor, docs, chore, test} — match what the diff DOES.
- `scope` — module / area in parens (`auth`, `agents`). Drop the parens
  entirely when no single scope fits; a forced scope is worse than none. Area - always one word.
- `description` — imperative, lowercase, one line, no trailing period; what the change does, the way a reviewer skimming `git log` reads it.
- Subject only by default. Add a footer only per the rule below; never invent a body.

## Issue footer (optional)

Most commits need none. Add one only when the number is sourceable without guessing — from the current branch (see the "Current branch" block in the injected context), via `(?i)(?:task|issue)\.(\d+)` (e.g. `feature/task.42-…` → `42`):

- exactly one distinct number → append `Refs: #N`;
- zero, or more than one distinct number → no footer (ambiguity is not worth a wrong link);
- never fabricate a number.

Put the footer inside the message string itself: subject line, one blank line, then `Refs: #N`. Omit it entirely when no number resolves — never append an empty footer.

## Examples

- Two user-profile endpoints, branch `main` → `feat(profile): add user-profile endpoints`
- CORS fix on branch `feature/task.42-cors` → `fix(cors): distinguish dev and prod policies`, then a blank line, then `Refs: #42`
- Deprecated flag dropped on a branch with no task number → `refactor(config): drop deprecated retry flag` (no footer)
