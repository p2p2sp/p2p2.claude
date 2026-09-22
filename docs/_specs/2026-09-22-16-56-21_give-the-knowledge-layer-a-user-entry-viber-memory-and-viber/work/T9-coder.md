# T9 - Coder notes (review fix round)

- Review-T9-1's one Critical finding: `viber/CLAUDE.md:172` still said "eight of the nine agents"
  (stale from before T7/T8 added the two auditors). Fixed to "ten of the eleven agents" - the
  ratio holds because `planner-review` is the only agent without Write/Edit tools (checked every
  agent's `tools:` frontmatter), so it stays the one exception out of eleven.
- Correct test runner for this repo is `node --test "tests/**/*.test.ts"` (per `tests/CLAUDE.md`),
  not vitest - vitest reports "No test suite found" for these node:test files even though the
  cases run and pass under `node --test`.
