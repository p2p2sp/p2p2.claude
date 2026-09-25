# T10 coder notes

- Added the no-question rule to `## Before the first question` (within the 12-line grep window)
  rather than as a new subsection, since the rule fires before the first question would be asked.
- Reworded the "too simple" anti-pattern line rather than adding a caveat elsewhere: it now
  distinguishes "skip because it looks small" (still forbidden) from "skip because the conversation
  and code already settled everything" (the new rule), so DoD.3's non-contradiction sits in one place.
- No test framework applies here (markdown skill body); Verification is grep-only, matching
  `test-strategy.md`'s "no test layer" case, so TDD: none needed no test file.
