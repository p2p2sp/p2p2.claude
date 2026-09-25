# T7 coder notes

- The `.temp/viber/intent/` pre-approval is `Edit(./.temp/viber/intent/**)`, not `Write(...)`: Claude Code matches file-write permissions against Edit rules only (a `Write(path)` rule is flagged as never matched, see the comment in `tests/viber/merge-settings.test.ts`). The body says the files are written with `Write` and names that rule.
- The save preflight (`issue-templates.sh`) runs after confirmation and before the save question, so S8 asks no question; its block stays in context for the reference's template choice.
- Declining the comment offer hands off straight to the planner, mirroring S2's declined save; the what-next question follows only a save or a posted comment attempt (exit 1 included).
- `tests/portability.test.ts` enumerates SKILL.md files from the git index: until the task commit stages the deletion, it fails with ENOENT on `viber/skills/idea/SKILL.md` and does not yet see `intent`. Not a defect.
- Lint WARN "possible italics" is the `**` of the Edit glob and the bold example heading carried from `idea`; no italics exist.
