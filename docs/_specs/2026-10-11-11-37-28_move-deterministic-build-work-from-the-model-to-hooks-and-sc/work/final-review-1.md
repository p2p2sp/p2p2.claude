# Final review 1 (T1-T8)

## Blocking

none

## Minor

1. viber/scripts/plan-index.sh:61 - the header says "--split removes, before anything else is written, the coder and reviewer extras files of every task not done". The code removes them after the awk pass, which has already written tasks/*.md (the removal loop sits after `index_out="$(... awk ...)"`, around the line `rm -f -- "$dir/work/$row_id-extra.md" ...`). Only the order against the index print holds (removed before the index is printed). Fix: reword to "before the index is printed" (or "after the plan is validated and decomposed, before the index is printed").

2. viber/hooks/scripts/verdict-nudge.sh - recorded in git as 100644 while every sibling hook script (kill-guard.sh, shell-guard.sh, plan-gate.sh, plan-hints.sh, session-start.sh) is 100755 (`git ls-files -s viber/hooks/scripts`), against .claude/rules/shell-script-exec-bit.md and the T1 coder note. hooks.json runs it through `bash`, so behaviour is unaffected. Fix: `git update-index --chmod=+x viber/hooks/scripts/verdict-nudge.sh`.
