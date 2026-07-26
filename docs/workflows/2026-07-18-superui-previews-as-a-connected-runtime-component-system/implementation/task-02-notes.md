## Task 2 - implementation notes

- `varName` is emitted WITHOUT a leading `--` (dots-to-hyphens only), even though the Approach text literally
  says "varName (`--` + dots-to-hyphens)". Followed `preview-data-format.md` instead (the task's own
  `Contracts` section binds to "Emits the Task 1 schema"), which is explicit that varName carries no leading
  `--`, and `components.js`'s `cssVar(varName)` already prepends `--` itself - a leading `--` in the stored
  value would double up to `----token-name`. Treated the Approach wording as shorthand, not a literal spec.
- The shared fixture (`.temp/preview-refactor/fixture/`) has a `color` group and a `spacing` group only, per
  Approach step 1's own description ("a color group with one dark override, a spacing group") - no `typography`
  group. The task's DoD line mentions "color/typography data", which is inconsistent with Approach step 1's
  fixture scope and with the Test Commands (which assert only `foundation:color`); built to Approach step 1 +
  Test Commands, not the DoD's incidental wording. The color foundation still exercises varName correctness,
  the dark-override readout, and the value-edit re-run check; the spacing token exercises the `spacing-radius`
  foundation path and the "no matching DESIGN.md section -> omit prose, still emit tokens" edge case (the
  fixture's DESIGN.md has a `## Color` section only).
  If a later task's fixture reuse needs a typography group too, add it then - not invented here unrequested.
- Within a foundation, tokens are grouped into one `token-grid` section per present dtcg.yml group (heading =
  the group's display name, e.g. "Spacing", "Border Width"), rather than one flat ungrouped grid. Not spelled
  out by Approach step 4 beyond the per-item field list, but needed for foundations that merge multiple groups
  (`spacing-radius` covers 5) to stay legible; uses only the already-defined `token-grid` section type from
  Task 1's schema, so no new contract surface.
- No other deviations: group mapping, alias resolution style (mirrors `validate_tokens.py`), self-verification
  (registry key + `json.loads` on the embedded payload), and the stale-file-deletion / dangling-alias exit-1
  edge cases all match the Approach and Edge cases sections directly.
