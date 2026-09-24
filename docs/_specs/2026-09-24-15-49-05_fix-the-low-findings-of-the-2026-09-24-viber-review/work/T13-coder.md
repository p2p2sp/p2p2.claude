- The auto-retry-on-first-failure bullet (section 4) already carried `reason: <the short DOD: line>`
  from an earlier, unrelated commit (2c0cf7b). DoD.1 still needed the generic `retry` definition in
  `## Answers` to carry the same reason, since that path is also reached when the user picks `retry`
  from the AskUserQuestion after a second short-DOD PASS - added there instead of duplicating the
  section-4 bullet.
- Removed the three local `no model:` mentions (memory-auditor, memory-node-writer, closeout
  dispatches) in favor of one skill-wide bullet near the top ("Only coder, reviewer and
  repair-coder dispatches carry `model`..."), matching the wording already used in viber/CLAUDE.md's
  orchestrator contract.
- Lint via supercc's lint_skill.sh on the skill dir: FAIL=0, WARN=2 (pre-existing, unrelated:
  description missing an explicit trigger cue, and an italics false-positive on the tier arrows
  `haiku -> sonnet`) - left untouched, out of scope for this task.
- Did not touch docs/reviews/2026-09-24_viber-review.md (marking the finding done): not in this
  task's Files list.
