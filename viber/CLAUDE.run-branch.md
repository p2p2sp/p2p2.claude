# The run branch

- `branching:` (`mode` off|allowed|required, default `off`) nests `work` entries (`base`, `name`
  pattern, `target`) and `issue-type-mappings` (type to entry key). The flat `base`/`name` group
  and `{issue}` are refused only when a branch must be cut, never for an existing one. The loaded
  config block names only the mode. Schema: `viber/BRANCHING.md`.
- The entry and the base check are settled first, by `intent` and `fixer`, before any code is
  read: preloads `fragments/branching-start.*` (run `plan-path.sh --start [<issue URL>]`, ask,
  switch through `--checkout`) and `branching-handoff.*` (the summary's `Work:` line, `Branch:`
  only after "stay"). No `off` file exists for either family. `mode: off`, any `error:` line or
  no usable entry hands off no `Work:` line. Both ask through `AskUserQuestion`; a
  returning draft with a recorded `branch:` asks no entry question, and a
  resumed `roadmap.md` off every entry base (not detached) takes "stay" without the base question.
- `planner` preloads `fragments/branching.*` (no `off` file), `branching-fix.*` for the re-run
  after a review fix and `branching-land.*` for the draft landing's branch line and exit 6, the
  key spelled `branching.""mode` (one bash word resolving to `branching.mode`): keep that
  spelling in every skill's call. A `Work:` line means no question; without one it reads
  `plan-path.sh --branch <plan>` (`suggested:`, one `entry:` per usable entry, `current-is-base:`,
  `error:` on a missing/unmapped type with mappings set) and asks, "stay" under `required` only
  on `current-is-base: no`; under `allowed` every `new: -` records `branch: none` unasked. It alone names the `work:`/`branch:` keys (`plan_field()`; the spec
  templates carry none). A draft round carries both; a title, issue or `Repro:` change
  recomputes the name, never overriding "stay" or `Work: none` (an `allowed` line only).
- `--checkout` (`branch_checkout`) reads no mode, puts HEAD on an existing local branch, never
  creates one; `current-is-base` reads the parsed entry bases, never `br_entry`, which `--branch`
  leaves unset. `at-base` compares HEAD's commit to `refs/heads/<base>`.
- A first landing resolves the entry (`branch_entry`), cuts from its `base` before any lookup;
  `implementor` learns the PR target only from the `target:` line, not config. Under `required`
  a run branch equal to ANY entry base is refused, and with none recorded on another entry's
  base the entry's branch is cut (`branch_is_base`).
- Exit 6: dirty tree; base missing locally; invalid name; a `required` breach; no entry resolves;
  a legacy/invalid `work` group (checked only on creation); on `--checkout`, a missing branch
  or a switch to another commit on a dirty tree.
