# T15 coder notes

- planner/SKILL.md line 34: added ", except one a template comment says to drop" before the
  "add no section of your own" clause, so the rule now admits `spec-lite.md`'s "drop this
  section" HTML comment (line 16) instead of contradicting it.
- idea/SKILL.md line 46: added ", except the round question a returning draft already asks",
  matching the "Returning to a draft" section's round question (line 15) that the old
  never-ask wording forbade.
- Both edits are exactly one clause each, satisfying DoD.3.
- `skill-designer`'s `lint_skill.sh` reports FAIL=0 for both files (planner carries two
  pre-existing WARNs unrelated to this change: missing when-to-use cue, possible italics).
