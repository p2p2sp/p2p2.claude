# Mode B — initialized gap-fill (append-only, plan mode)

The router resolved `state: has-rules` — extend the existing library, in plan mode. **No reset.** Same shape as Mode A, with these differences:

- **Reuse `rule_extensions`.** `Read` it from `.superdev/config.yml`; discover (run `scan_extensions.sh` + append, BEFORE `EnterPlanMode`) **only when the key is absent**.
- **`EnterPlanMode`.**
- **Map the existing library first.** `Glob .claude/rules/**/*.md` (exclude `_`-prefixed frozen files, §E); `Read` the frontmatter + headings of each to learn what is already covered.
- **Scan targeted at gaps**, not a full sweep — `scan_conventions.sh` as in Mode A, but focus reads on layers/areas the existing rules do **not** yet cover.
- **Plan only new / supplementary rules** — new files for uncovered areas, or appended bullets for existing files (§F). Never plan a rewrite, reorder, or deletion. The plan is additive. Each rule obeys §A–§G; use `references/rule-template.md`.
- **Write the plan**; rule files are written **after approval**.
