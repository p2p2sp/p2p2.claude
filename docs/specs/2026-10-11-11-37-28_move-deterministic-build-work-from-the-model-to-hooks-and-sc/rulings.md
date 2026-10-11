# Rulings

- final-review: accept | why: The recheck (final-review-recheck-1.md) finds nothing blocking and confirms the plan-index.sh header fix. The one open minor is that verdict-nudge.sh is 100644 in the working tree but 100755 in the index, and hooks.json runs it through bash, so the hook behaves the same either way. | cost if wrong: If the working-tree mode gets restaged, verdict-nudge.sh is committed as 100644 against .claude/rules/shell-script-exec-bit.md, and fixing that takes a chmod +x viber/hooks/scripts/verdict-nudge.sh plus a follow-up commit.
