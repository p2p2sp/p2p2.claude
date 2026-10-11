# Final review recheck 1

## Blocking

none

## Minor

1. viber/hooks/scripts/verdict-nudge.sh - the index holds 100755 (staged fix) but the working-tree file is 100644 (`ls -l` shows -rw-r--r--, `git diff` shows "old mode 100755, new mode 100644", core.fileMode=true). Any `git add` or `git commit -a` of the file restores 100644 in the commit, against .claude/rules/shell-script-exec-bit.md. Fix: `chmod +x viber/hooks/scripts/verdict-nudge.sh` (and keep the index entry at 100755).

Resolved: the plan-index.sh header (finding 1) now reads "once the plan is validated and decomposed and before the index is printed", matching the code (removal at line 890, after the awk pass).
