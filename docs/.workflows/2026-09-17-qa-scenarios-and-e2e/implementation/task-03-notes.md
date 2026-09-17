# Task 3 - Define the docs/qa document formats

## Runs
- grep -q '^## Acceptance document' superdev/references/qa-format.md && grep -q '^## Handoff file' superdev/references/qa-format.md && grep -q '^## Index line' superdev/references/qa-format.md && grep -q '^## Supersedes rule' superdev/references/qa-format.md && grep -q '^## Automation status lines' superdev/references/qa-format.md && grep -q '^## Never write these' superdev/references/qa-format.md -> exit 0

Approach step 3's "at least one scenario per acceptance criterion" carries a carve-out: a criterion with no UI-observable side gets no scenario in the acceptance document, is named in the out-of-scope section with that reason, and its `api` scenario lives in the handoff file - the spec's out-of-scope forbids manual API scenarios, so an api-only criterion otherwise had no honest place in a human-only document.

UNDERSPECIFIED: `Date:` / `Build:` are the only labels left in fixed English while every other heading, label and column name is rendered in the document's language - approach step 3's Polish list pins a rendering for the eight body labels and none for these two, and they are metadata keys like `changelog-entry-format.md`'s header block. Rendered as two bullet lines under the H1.

UNDERSPECIFIED: index group placement and range form - a new `## <area>` group is appended after the last existing group (existing groups keep their order), and a build with one scenario writes that single ID (`QA-01`) instead of a degenerate `QA-01..QA-01` range.

UNDERSPECIFIED: the index range spans the first and last ID assigned in the build, including IDs that only reached the handoff file - the alternative (only the acceptance document's IDs) would print a gapped, non-contiguous range.

UNDERSPECIFIED: the handoff `Steps` field is an indented numbered sub-list under its own `- Steps:` line; every other field is a single `- <Field>: <value>` line.

UNDERSPECIFIED: `Base:` reads `not declared` when the host memory is silent, matching the `Launch:` / `Accounts:` fallback Task 4 pins; `unknown` stays reserved for per-entry fields the E2E flow resolves against the running application.

UNDERSPECIFIED: the supersedes line's verb is rendered in the document's language (Polish `zastępuje`) while the IDs and the run id stay verbatim - the acceptance document is human-only and its language rule covers prose.
