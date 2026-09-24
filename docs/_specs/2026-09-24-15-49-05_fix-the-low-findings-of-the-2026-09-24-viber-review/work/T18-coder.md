### T18 coder notes

- `rules-writer.md`'s Budget section now measures the directory by summing `wc -c` over
  every file `Glob` returns for `.claude/rules/**/*.md`, never `wc -c` on the directory itself
  (which errors on a directory argument).
- Dropped "Read the existing rules before changing one." - the redundant read line; the
  admission-gate read directly above it already covers reading before a change.
- Kept the established `<bytes>` placeholder spelling from `memory-writer.md`'s `OVER:` line
  rather than inventing a new one, for cross-agent consistency.
- `rules/SKILL.md` step 5 now passes `**` as the scope for a whole-repo rule (`paths: none`)
  instead of "the repository root": `rules-auditor.md`'s own `scope:` contract already expects
  a glob list for an existing target, a directory only for the `target: none` discovery case.
- `rule-admission.md`'s calibration line now caps "two new conventions" rather than "two new
  rule files", removing the contradiction with the writer's split-into-one-file-per-convention
  step.
- `viber/skills/rules/scripts/rules-map.sh` was already modified in the working tree (another
  task's work) with `OVER-FILE ... 4000 bytes` wording; left untouched since it is outside this
  task's Files list.
