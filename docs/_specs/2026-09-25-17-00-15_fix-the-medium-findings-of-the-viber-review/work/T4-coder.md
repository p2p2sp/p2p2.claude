# T4 - coder notes

- Mirrored `fixer/SKILL.md`'s preload shape exactly: `!` block right after frontmatter, `config.sh`
  pattern appended to `allowed-tools` (not a bare `Bash` allow, per the preload-contract rule).
- Step 1 branches on `issues: true`/`false` before the existing token-shape check; the `issues:
  false` branch never calls `issue-facts.sh`, so it can't fetch and step 4 (publish) is
  structurally unreachable from it - no separate "never publish" line needed.
- Left `argument-hint` and the skill description untouched: they already read fine for both
  switch states and the task named no DoD clause for them.
- Pre-existing uncommitted failures in `tests/viber/plan-gate.test.ts` and
  `plan-path.test.ts` (files this task never touches, `Depends-on: none`) are another task's
  in-flight work; full suite minus those three files is 396 passed / 1 skipped / 0 failed.
