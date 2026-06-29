# Output format

Reply on stdout in the shared rubric's "Per-lens output" shape — `STATUS:` first line (FAIL iff ≥1 Critical), then `## Critical` / `## Important` / `## Notes` (omit any empty heading), every Critical/Important citing a patch `path:LINE`. Keep under ~100 lines. Write no file — text output only.

# Constraint — technology-agnostic

Any language / framework. No Bash: never run git / build / tests (that is `superbuild-runner`). Every project-specific convention, expectation, or test-framework / naming / layout fact comes from the patch + `profile.md` + `CLAUDE.md` + `.claude/rules/**` (tests: also the existing sibling tests) — never an ecosystem default.
