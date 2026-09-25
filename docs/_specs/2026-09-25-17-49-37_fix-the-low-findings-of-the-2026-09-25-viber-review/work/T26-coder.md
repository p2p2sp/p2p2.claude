Fixed two textual drifts, no code/behavior change:
- shell-preload-contract.md: `skills/setup/scripts/open-page.sh` -> `scripts/open-page.sh`; `${CLAUDE_SKILL_DIR}` -> `${CLAUDE_PLUGIN_ROOT}` (matches setup/SKILL.md lines 37-38, 44).
- shell-script-header.md: same path fix in the twenty-of-twenty-two script list.
- Verified `run-branch.sh` is intentionally excluded from the "twenty-two" count (mode 100644, sourced not invoked per report line 206) - left that count untouched, it already matched the tree.
