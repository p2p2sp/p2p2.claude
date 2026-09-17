# fix 02 notes

## Runs

- grep -n "VERDICT: BLOCKED" superdev/skills/superbuild/SKILL.md -> exit 0 (8 lines)
- grep -n "VERDICT: BLOCKED" superdev/skills/simplebuild/SKILL.md -> exit 0 (7 lines)
- grep -c "record-decision.sh" superdev/skills/superbuild/SKILL.md -> 6

I2: fixed - no test: the change is orchestrator prompt text (Step 3's third adjustment); `tests/` covers bundled scripts only and has no markdown-content suite that could fail before the fix.
I1: fixed - no test: the fix is the second option the finding offers - the record, not a history rewrite; nothing in `tests/` reads past commits or notes prose. `commit-task.sh` never stages outside the declared set (exit 2 on `undeclared:`), so the three commits can only have picked those paths up through the loop's step-4 **include named ones** answer; task-01, task-06 and task-07 notes now each carry that, explicitly not as `touched:` lines so no later `--notes` run re-declares them. Commit history left as it stands - 20a2275, 1a332c6 and a765678 are already referenced by both review reports and by `checkpoint.md`.
M4: skipped - Minor under `## Debt`, no `minor:` line named it.
M5: skipped - Minor under `## Debt`, no `minor:` line named it.

touched: superdev/skills/superbuild/SKILL.md
touched: docs/.workflows/2026-09-17-underspecified-decision-lines/implementation/task-01-notes.md
touched: docs/.workflows/2026-09-17-underspecified-decision-lines/implementation/task-06-notes.md
touched: docs/.workflows/2026-09-17-underspecified-decision-lines/implementation/task-07-notes.md

Added by fix 03 for I2 of `review-01-spec-re1.md`. Commit 45117b2 changed `docs/notes.md` content no
step of this round wrote (845b682..a4024c1: "czyta" to "czasami czyta" plus one appended paragraph,
the user's own scratch text). The file was already modified in the working tree when the commit ran;
`commit-task.sh` never stages outside the declared set, so it entered through the loop's step-4
**include named ones** answer. Declared because `## Notes line formats` asks for one `touched:` line
per file a fix round changed, whoever authored the content - and this file is spent (its round is
committed), so no later `commit-task.sh --notes` run re-declares the path.
touched: docs/notes.md
