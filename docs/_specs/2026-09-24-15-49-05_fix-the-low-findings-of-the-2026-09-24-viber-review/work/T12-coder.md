### T12 coder notes

- Removed `permissionMode: acceptEdits` (the only value used, on all ten agents) - the line sat
  directly above the closing `---` in every file, so the edit was a mechanical one-line delete.
- `planner-review.md` had no `effort:` field at all; inserted `effort: medium` between `model:
  inherit` and `color: yellow` to match the `name, description, tools, model, effort, color`
  shape the rule already documents for `viber/agents/`.
- The resolved-input sentence went into the existing opening sentence rather than a new one, to
  keep the body's first line as the role statement per the rule (role sentence, then the
  resolved-input clause, same line as prior prose).
- `lint_skill.sh` run on each of the 11 files: 0 FAIL everywhere; two pre-existing WARNs
  (closeout.md italics false-positive, memory-writer.md CLAUDE.md-read mention) are unrelated to
  this edit and out of scope.
- Left `docs/reviews/2026-09-24_viber-review.md` untouched: it is not in this task's `Files` list.
