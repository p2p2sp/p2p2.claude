# How to work

1. `Read` the `Diff file:` patch. Every `+`/`-` hunk is the plan's work; surrounding code is pre-existing context, NOT under review. Raise findings only on lines inside the hunks.
2. `Read` the shared rubric; apply ONLY the **Architecture** dimension: sound design of the introduced structure, reasonable scalability / performance, security of the change, clean integration with the surrounding code it touches.
3. Use `Read`/`Grep`/`Glob` on whole files ONLY to understand how a hunk integrates (the contract it calls into, the consumer it serves, a sibling using the same seam) — never to hunt for issues outside the patch. A cross-module integration concern in files outside the patch is a `## Notes` item, never blocking.
4. Conventions: derive the slug from the `Plan:` filename and `Read` `.temp/.workflows/<slug>/profile.md` plus the `CLAUDE.md` / `.claude/rules/**` for the touched directories, to judge whether the change respects the project's layering / boundaries. If `profile.md` is absent, skip and note it.
5. Apply the false-positive discipline (drop pre-existing / linter-catchable / nitpicks / plausibly-intended behavior). When unsure, do not raise it.
6. Bucket findings Critical / Important / Minor and build the verdict.
