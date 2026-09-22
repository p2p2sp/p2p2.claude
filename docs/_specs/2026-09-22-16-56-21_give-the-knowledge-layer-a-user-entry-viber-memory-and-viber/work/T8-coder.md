# T8 - /viber:rules

- `rules-map.sh` prints no candidate line, unlike `memory-map.sh`: this layer is one directory of
  globs, not a tree, so there is nothing deterministic to propose for. The skill therefore asks the
  user which directories `extend` should propose for, with the repository root as the default, and
  `state: none` goes straight to the root as the single scope.
- A `rule:` line whose `paths` field reads `none` or `global` gets the repository root as its
  auditor `scope`: the globs field carries no usable path there, and both shapes are loaded
  everywhere anyway (T2's note, field 6 is what tells them apart).
- Frozen files are excluded structurally rather than by a check: the map never prints one on a
  `rule:` line, so the review and the reset lists built from `rule:` cannot contain one.
- The `allowed-tools` line trips the linter's italics WARN (`:*)` ... `:*)`), exactly as the
  memory skill does. FAIL=0 both sides; it is the required pattern shape, not a fixable one.
