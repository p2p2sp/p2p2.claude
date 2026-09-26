# The run branch

- `branching:` (`mode` off|allowed|required, default `off`) nests `work` entries (`base`, `name`
  pattern, `target`) and `issue-type-mappings` (type to entry key). The flat `base`/`name` group
  and `{issue}` are refused only when a branch must be cut, never for an existing one. The loaded
  config block names only the mode. Schema: `viber/BRANCHING.md`.
- `planner` preloads `fragments/branching.allowed.md` / `branching.required.md` (no `off` file)
  for its branch question (it alone names the `work:`/`branch:` keys; the spec templates carry
  none), `branching-fix.*` for the report re-run after a review fix and `branching-land.*` for
  the draft landing's branch line and exit 6, the
  key spelled `branching.""mode` (one bash word resolving to
  `branching.mode`): keep that spelling when editing the call.
- `planner` reads `plan-path.sh --branch <plan>` (`suggested:`, one `entry:` per usable entry,
  `error:` on a missing/unmapped type with mappings set), asks one question for both, writes
  `work:` beside `branch:` (`plan_field()`). A draft round carries both; a title,
  issue or `Repro:` change re-runs the report.
- A first landing resolves the entry (`branch_entry`), cuts from its `base` before any lookup;
  `implementor` learns the PR target only from the `target:` line, not config.
- Exit 6: dirty tree; base missing locally; invalid name; a `required` breach; no entry resolves;
  a legacy/invalid `work` group (checked only on creation).
