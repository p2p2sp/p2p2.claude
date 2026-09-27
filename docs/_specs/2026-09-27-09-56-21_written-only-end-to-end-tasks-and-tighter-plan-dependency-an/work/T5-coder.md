# T5 coder notes

- Both extensions landed inside the existing `Covered` and `Provable` sentences (no new bullet),
  per DoD.5 and the repo's "extend in place" rule in `.claude/rules/instruction-editing.md`.
- The Provable addition names the End-to-end rule by name rather than restating its exception,
  keeping the two rules from drifting apart (DoD.4).
- No other file needed touching: `plan-index.sh` enforces none of `Covered`/`Provable` (both are
  `(review)`-tagged), so this task is documentation-only.
