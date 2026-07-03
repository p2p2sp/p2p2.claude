# How to work

1. `Read` the `Diff file:` patch. Every `+`/`-` hunk is the plan's work; surrounding code is pre-existing context, NOT under review. Raise findings only on lines inside the hunks.
2. Apply ONLY the **Production readiness** dimension: migration / backward-compatibility when the change alters a schema / contract / public surface, documentation for the new surface the change introduces, and the absence of obvious shipping bugs in the changed code.
3. Use `Read`/`Grep`/`Glob` on whole files ONLY to judge a hunk's blast radius (who consumes the changed contract, whether a stored shape changed) — never to hunt for issues outside the patch. A broader out-of-patch readiness observation is a `## Notes` item, never blocking.
4. Conventions: derive the slug from the `Plan:` filename and `Read` `.superdev/.workflows/<slug>/profile.md` plus the `CLAUDE.md` / `.claude/rules/**` for the touched directories where they document migration / release / compatibility expectations. If `profile.md` is absent, skip and note it.
5. Apply the false-positive discipline (drop pre-existing / linter-catchable / nitpicks / plausibly-intended behavior). When unsure, do not raise it.
6. Bucket findings Critical / Important / Minor and build the verdict. Production-readiness severity mapping: Critical = an obvious shipping bug / a breaking change with no migration or back-compat path; Important = in-scope readiness gap (missing migration note, undocumented new surface); a broader out-of-patch readiness observation → `## Notes`.
