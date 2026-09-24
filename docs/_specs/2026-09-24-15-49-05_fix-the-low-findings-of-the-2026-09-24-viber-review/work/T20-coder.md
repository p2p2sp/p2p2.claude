# T20 - coder notes

- SKILL.md merge-description edit had to keep the sentence's existing clause order (idempotent
  key-by-key wording) - inserted the ask-leaves-deny clause between "lists only gain entries" and
  "a key the template lacks is never touched" to match `merge-settings.sh`'s own rule order.
- The README verification (`grep -c 'No dependencies' -> 0`) rules out any phrasing that keeps
  "No dependencies" as a lead-in before naming the optional tools; used "Optional: ..." instead.
- Review document `docs/reviews/2026-09-24_viber-review.md` (finding #19 lines 104-105) is not in
  this task's `Files:` list, so it is left unmarked - not touched here.
- `supercc/skills/skill-designer/scripts/lint_skill.sh viber/skills/setup` -> FAIL=0, WARN=3 (pre-
  existing description/italics warnings, unrelated to this edit).
