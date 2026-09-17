# fix 01 notes

## Runs

- grep -n "UNDERSPECIFIED:" superdev/agents/superbuild-task-reviewer.md -> exit 0 (3 lines: 19, 36, 60)
- grep -n "DECISION:" superdev/agents/superbuild-task-reviewer.md -> exit 0 (3 lines: 19, 20, 41)
- grep -n "VERDICT: BLOCKED" superdev/skills/superbuild/SKILL.md -> exit 0 (7 lines)
- grep -n "VERDICT: BLOCKED" superdev/skills/simplebuild/SKILL.md -> exit 0 (7 lines)
- grep -c "record-decision.sh" superdev/skills/superbuild/SKILL.md -> 6

C1: fixed - no test: the change is prompt text in an agent file and an orchestrator skill; `tests/` covers bundled scripts only and has no markdown-content suite to fail before the fix.
I1: fixed - no test: same - step (c) of `## Check` is prompt text, not script behaviour.

touched: superdev/agents/superbuild-task-reviewer.md
touched: superdev/skills/superbuild/SKILL.md
