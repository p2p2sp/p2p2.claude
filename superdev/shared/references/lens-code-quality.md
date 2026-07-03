# How to work

1. `Read` the `Diff file:` patch. Every `+`/`-` hunk is the plan's work; surrounding code is pre-existing context, NOT under review. Raise findings only on lines inside the hunks.
2. Apply ONLY the **Code quality** dimension: separation of concerns, error handling, type safety where the language supports it, DRY-without-premature-abstraction, edge cases in the changed logic.
3. Use `Read`/`Grep`/`Glob` on whole files ONLY to understand a hunk (its enclosing function, the type it returns, a sibling using the same pattern) — never to hunt for issues outside the patch.
4. Conventions: derive the slug from the `Plan:` filename and `Read` `.superdev/.workflows/<slug>/profile.md` plus the `CLAUDE.md` / `.claude/rules/**` for the touched directories; a documented-rule violation introduced in a hunk is in scope (an undocumented style divergence is a Note). If `profile.md` is absent, skip and note it.
5. Apply the false-positive discipline (drop pre-existing / linter-catchable / nitpicks / plausibly-intended behavior). When unsure, do not raise it.
6. Bucket findings Critical / Important / Minor and build the verdict. Code-quality severity mapping: Critical = real in-hunk bug / unhandled error that loses or corrupts data; Important = in-hunk gap (an unhandled edge case / error path the change should cover); Minor (style, micro-optimization) → `## Notes`.
