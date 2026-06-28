# Conventional Commits — subject & footer authoring

Single source of the message-authoring rules. Read by every supergh caller that authors a
commit message before handing subject + footer to `commit.sh`: the `agent-committer` fork
(`all`/`staged`) and the `commit` resolver in `context` mode. Author from the actual diff
content, grounded by any intent hint — never from file names alone, never fabricate.

## Subject — `type(scope): description`

- `type` ∈ {feat, fix, refactor, docs, chore, test} — match what the diff DOES.
- `scope` — module / area in parens (`auth`, `agents`, `.claude/skills`). Drop the parens
  entirely when no single scope fits; a forced scope is worse than none.
- `description` — imperative, lowercase, one line, no trailing period; what the change does,
  the way a reviewer skimming `git log` reads it.
- Subject only by default. Add a footer only per the rule below; never invent a body.

## Issue footer (optional)

Most commits need none. Add one only when the change is clearly tied to a specific issue and
the number is sourceable without guessing. Resolve a number `N`, in order:

1. the intent **hint** (`#N`, "issue 42", "task 42");
2. the current branch, via `(?i)(?:task|issue)\.(\d+)` (e.g. `feature/task.42-…` → `42`).

Then:

- exactly one distinct number → `Refs: #N`;
- the hint explicitly signalled closing ("closes #42", "fixes #42") → `Closes: #N` / `Fixes: #N`;
  never pick a closing keyword on your own — `Refs:` is the safe default;
- zero, or more than one distinct number → no footer (ambiguity is not worth a wrong link);
- never fabricate a number.

Pass the footer as the third `commit.sh` argument (empty string when none).

## Examples

- Two user-profile endpoints, no issue in hint → `feat(profile): add user-profile endpoints`
- CORS fix, hint "this is for #42" → `fix(cors): distinguish dev and prod policies` + `Refs: #42`
- Drops a deprecated flag, hint "closes #17" → `refactor(config): drop deprecated retry flag` + `Closes: #17`
- Hint mentions both `#42` and `#7`, docs-only diff → `docs(readme): clarify install steps` (ambiguous → no footer)
