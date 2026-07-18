# Task 6 notes

- Generator's dead `dark flag` note under step 2 ("Note the reported dark-override count — it is the
  DARK FLAG for step 8.") was deleted rather than reworded — `build_sheets.py` now computes
  `has_dark_overrides` itself from `tokens.css` (per Task 3), so no step still consumes that count; the
  new step-8 html-visualizer dispatch carries no dark flag either, matching the Approach's "no dark
  flag — dark is the shell's concern." Deleting a note that pointed at nothing avoided leaving a stale
  cross-reference.
- Generator's step numbering kept the existing step 7/8/9 anchors and inserted the two script steps as
  `7b`/`8b` (rather than renumbering everything to 7/8/9/10/11) so the step-2 removed reference and the
  step-6/step-11(extractor)/step-8(completer) cross-references elsewhere in the plugin that already cite
  generator step numbers by position stay valid — matches the Approach's own "New step 7b" / "New step 8b"
  phrasing.
- Also updated the generator's Edge cases line ("Empty inventory … still render foundation sheets and the
  index in steps 8-9") to name the correct post-refactor steps (7b/8b/9) — not explicitly listed in Files
  but it is inside `design-system-generator/SKILL.md`, the same file the task's Approach step 1 covers, and
  leaving it pointing at the old step numbers would have been a stale-reference bug in the doc the task
  asked to rewrite.
- Completer step 7 header changed from `[html-visualizer, xN parallel]` to
  `[script, html-visualizer xN parallel, scripts]` to reflect the copy-chrome cp before the fan-out and the
  four scripts after it (build_foundation_data.py, build_sheets.py, build_index.py, lint_previews.py) — a
  label-only change, no behavior beyond what the Approach's step 2 specifies.
- No other deviations.
