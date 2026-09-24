# T5 - coder notes

- Anchored all three TASK-marker matches in plan-index.sh (validation pass, decomposition pass,
  status.md total count) to `^[[:space:]]*<!--...-->[[:space:]]*$` - not just the first one the
  task text quoted; the other two would otherwise still miscount a plan mentioning the marker in
  prose during --split or on first status.md creation.
- The missing-`File:` check used to gate on `ncfile > 0` unconditionally (a whole-appendix
  exemption regardless of mode). Now split by mode: outside `--split` a missing `File:` always
  fails, even when no block in the appendix has one; under `--split` the old `ncfile > 0` gate is
  kept so a frozen pre-field plan still resumes. The downstream file-ownership-shape checks stayed
  gated on `ncfile > 0` only - unreachable when the new check already set `err`, so no behavior
  change there.
- DoD.4 needed its own test (header prose has no other proof mechanism): reads the script source
  and asserts the two example `tasks:` rows carry no `chore:`/`feat:` token.
