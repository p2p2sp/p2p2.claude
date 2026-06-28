# Task-review rubric

The 3-bucket single-task review variant for `task-reviewer`. The four stable "How to …" sections (How to
read a `## Deliverable`, How to verify `## Tests` per `## Mode`, Test-quality anti-patterns, How to verify
conventions) live in `superdev/shared/rubric-core.md` — **read it first**. Two reading conventions this
variant supplies over the core:

- Wherever a core rule says "the diff", substitute `task_diff` (the per-task `git diff <task_base>` range).
- The core uses the 2-bucket **CRITICAL / Note** vocabulary; in this 3-bucket variant read core **Note** as
  **Minor** and core **CRITICAL** as **Critical**.

<!-- SECOND MIRROR (Lustro B, intentional, NOT verbatim): the "What to check (the 5 dimensions)" + 3-bucket
severity below are also adapted, whole-plan, in `superdev/shared/rubric-code-review.md` (the four
`agent-final-reviewer` quality lenses — 4 dimensions, hunk-only, false-positive discipline). This file is the
PRIMARY sync source for those; if the dimensions / severity buckets below change, re-sync that copy too.
No lint catches the drift. -->

## What to check (the 5 dimensions — each scoped to `task_diff` ∩ the task's `## Touches`)

Apply each lens to the task's own change only; bound each finding's severity to its ceiling so every blocking
finding is something `coder` can fix in `Mode: normal` (in-scope edits only).

1. **Plan alignment** — does the diff deliver the `## Deliverable`; are deviations justified or problematic?
   → Critical (Deliverable missing/mismatched) · Important (in-scope deviation needing a fix).
2. **Code quality** — separation of concerns, error handling, type safety, DRY-without-premature-abstraction,
   edge cases, in the changed code. → Important (resolvable in-`task_diff` gap, e.g. unhandled error/edge case)
   · Minor→`## Notes` (style, optimization).
3. **Architecture** — sound in-diff design, security, clean integration with the touched code.
   → Critical (in-diff security / data-loss) · Important (in-scope design gap) · `## Notes` (cross-module
   integration concern touching files outside `## Touches`).
4. **Testing** — gate tests exist and assert per `## Mode` (the per-`## Mode` rules in the core) + the anti-patterns.
   → Critical (missing/weak gate test) · Important (in-scope test-quality issue) · `## Notes` (test gap beyond
   the decomposer's `## Tests` — the coder writes those 1:1 and will not invent new ones).
5. **Production readiness** — migration / back-compat / docs for what this task changed; no obvious bug.
   → Critical (obvious bug / data-loss) · Important (in-scope readiness gap) · `## Notes` (broader,
   out-of-`task_diff`).

## Severity buckets

Three buckets. The shared core sections (`rubric-core.md`) use the word **Note** for the non-blocking bucket —
read it as **Minor** here.

- **Critical** — missing/mismatched Deliverable, missing/weak gate test, documented-convention violation,
  placeholder marker, plan inconsistency, in-diff security/data-loss, obvious bug. Blocks (forces FAIL, or
  BLOCKED per the rule below).
- **Important** — a should-fix finding `coder` can resolve in `Mode: normal`, strictly within `task_diff`
  AND the task's `## Touches` (in-scope error handling, edge cases, production-readiness for the changed code).
  Blocks (FAIL, verdict "With fixes"). A finding the coder cannot fix in normal mode — out-of-`## Touches` /
  cross-module, or a test gap beyond the decomposer's `## Tests` — is NOT Important; it goes to non-blocking
  `## Notes`.
- **Minor** — style divergence, optimization, doc polish, general recommendation. Non-blocking; emitted under
  `## Notes`. Never forces a non-PASS.

## PASS / FAIL / BLOCKED criteria

The reviewed diff is `task_diff`. Map the bottom-line "Ready to merge" verdict to the status — in one line:
`Ready to merge: Yes` → `PASS`; ≥1 Critical or ≥1 Important → `FAIL`; every-Critical-cited-out-of-diff → `BLOCKED`.

- **PASS** (`Ready to merge: Yes`) — Deliverable verified, every gate test verified per `## Mode`, no
  documented convention violated, and no Critical and no Important. Minor-only or clean.
- **FAIL** (`Ready to merge: No` when a Critical is present, or `With fixes` when only Important) — any
  Critical or any Important. The report lists them under `## Issues` so the coder fixes them on retry.
- **BLOCKED** (`Ready to merge: No`) — allowed **only** when **every** Critical issue cites a path **outside**
  `task_diff` AND the in-diff code mechanically references or depends on the violated invariant. Mixed
  (≥1 in-diff Critical AND ≥1 out-of-diff Critical) → FAIL, never BLOCKED. Narrow on purpose: convention drift
  in a module the diff does not interact with is not raised at all — only read conventions for directories the
  diff touched.

Every issue raised MUST cite a `path:LINE` inside `task_diff` (or, for BLOCKED, the out-of-diff `path:LINE`
plus the named rule/invariant). Never fail a review without naming the exact Deliverable, test
intent/identifier, or convention rule violated.

## Calibration (DO / DON'T)

DO categorize by actual severity; put every in-scope Critical/Important under `## Issues`.
DO acknowledge strengths (PASS `## Verified`; FAIL `## Strengths`) and flag plan deviations explicitly.
DO cite an exact `path:LINE` inside `task_diff` plus a one-line `Why` on every Critical/Important.
DON'T file out-of-`## Touches` / cross-module / beyond-gate-test findings as Important — route them to `## Notes`.
DON'T emit an empty `### Critical`/`### Important` H3, mark a nitpick Critical, or raise a finding without `path:LINE`.
DON'T put a second bare `path:LINE` on a `Why:`/`Fix:` continuation line — keep the one flagged location on the bullet's first line; any path inside `Fix:` is backticked without `:LINE`.
