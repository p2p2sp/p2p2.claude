# T6 - coder notes

Two distinct bugs under one finding, both fixed with one new `is_present_node()` helper
(tracked AND `[ -e ]`) in `memory-map.sh`:

- `state` used `is_tracked "CLAUDE.md"` alone, so a root node deleted-but-unstaged still read
  `complete` once no candidate was outstanding.
- The ancestor chain-walk called `chars_of` on any tracked ancestor without checking it still
  exists; `wc -c < missing_file` fails at the shell's own redirection step, before the command's
  `2>/dev/null` takes effect, so the "No such file" line reached real stderr regardless of the
  redirection inside `chars_of`. Confirmed this in isolation with `bash -c 'wc -c < /tmp/x 2>/dev/null'`.

Numerically the bug was silent (`chars_of` still returned 0 for a missing file), so only
`state` and stderr needed the fix - no chain totals in existing tests changed.

New test reproduces both symptoms at once: root deleted unstaged, two-level nested nodes below
it so the chain walk reaches the missing root and previously leaked stderr twice.
