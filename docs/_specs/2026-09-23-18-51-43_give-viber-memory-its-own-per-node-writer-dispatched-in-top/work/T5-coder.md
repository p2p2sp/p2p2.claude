- "The knowledge layer is capped, because its two writers run after every build" stayed
  unchanged: only `memory-writer` and `rules-writer` run at the build close, `memory-node-writer`
  runs only from `/viber:memory`, so "two writers" is still accurate there.
- `planner-review` is the one agent counted outside "eleven of the twelve" - it is the only agent
  with no `Write` in its `tools:` line, all eleven others (including `memory-node-writer`) do.
- viber/CLAUDE.md grew by 560 characters (well under the 800 cap) by tightening sentences that
  named the new writer rather than appending new ones.
- `viber/references/` already held four files before this task (T2 added `node-doctrine.md`); only
  the Purpose line's stale "THREE plugin-level references" needed correcting.
