# Task-review rubric

<!-- MIRROR: the four "How to …" sections below (How to read a `## Deliverable`, How to verify `## Tests`
per `## Mode`, Test-quality anti-patterns, How to verify conventions) are a VERBATIM copy of
superdev/shared/rubric.md. No lint catches drift — if that file's stable rules change, re-sync them here.
The severity model + PASS/FAIL/BLOCKED mapping + What-to-check + calibration below intentionally DIVERGE
(the 3-bucket task-review variant). `agent-plan-auditor` keeps its own copy in shared/rubric.md. -->

The verification rubric for `task-reviewer` — applied to ONE task against that task's `task_diff`.
Wherever a copied rule says "the diff", substitute `task_diff` (the per-task `git diff <task_base>` range).

## How to read a `## Deliverable`

`## Deliverable` is 1–3 sentences naming the **observable outcome** the task must deliver — an endpoint,
a response shape, a side effect, a file written, a CLI behavior. It is the **binding contract**. To
verify it:

- Find the code in the diff that delivers the observable outcome stated in the verbatim line(s).
- If the code cannot be located → **CRITICAL**.
- If the implementation is present but does not match the Deliverable (wrong endpoint, wrong response
  shape, wrong side effect, wrong file written) → **CRITICAL**.
- If `## Deliverable` aggregates several outcomes, **every** one must be delivered — a partial delivery
  is CRITICAL on the missing outcome(s).

## How to verify `## Tests` per `## Mode`

The task's `## Mode` is exactly one of `tdd`, `code-first-then-tests`, `e2e-first`, `tests-none`. It
picks the verification rules:

- **`tdd`** — every `unit`-Kind entry in `## Tests` must exist as a real test method/spec in the diff.
  Read each body: it must assert on the observable outcome the corresponding `## Deliverable` line names
  — not on internal state or private flags. A unit test that does not exercise the production code's
  observable behavior, or that was clearly written after the code as an afterthought, is CRITICAL.
  **Branch-coverage CRITICAL FAIL:** enumerate every decision branch / failure mode `## Deliverable`
  names; each one MUST have a corresponding `## Tests` test in the diff that exercises it. A named
  branch / failure mode with **no corresponding test in the diff** is CRITICAL (the decomposer maps
  these 1:1, so a missing one is a real coverage gap, not a style nit). Cite the unmatched branch and
  the `## Deliverable` line. Any `integration` / `e2e` entries must also exist and pass per the
  execution evidence — they are not subject to Red-Green-Refactor ordering.
- **`code-first-then-tests`** — every entry in `## Tests` must exist as a real test method/spec in the
  diff and assert on the observable outcome. No RGR ordering check (tests are post-hoc by design).
- **`e2e-first`** — at least one `e2e`-Kind entry in `## Tests` must exist as a real E2E test that
  captures the externally observable acceptance criterion stated in `## Deliverable`. Any additional
  `integration` / `unit` entries must also exist in the diff and pass per the execution evidence.
- **`tests-none`** — `## Tests` body must be the single line `- none — <reason>` and `## Task gate`
  must be the single line `- Tests: none`. If either carries test content, the task is internally
  inconsistent → CRITICAL with `[Plan inconsistency] Mode: tests-none but Task gate / ## Tests carry
  test content`. Otherwise no tests are expected.

For runnable modes, each `## Task gate` `- Tests:` entry (a real identifier or a backticked intent
shorthand) must be matched in the diff by a real test method/spec. A test identifier listed in
`Task gate` with no corresponding test body in the diff is CRITICAL.

## Test-quality anti-patterns

These refine what counts as a **real** test in the per-`## Mode` checks above: a `## Tests` entry whose
body matches one of these is not a valid gate test even when a method with the right name exists. They are
concept-first — the parenthetical cues span ecosystems and are illustrative, **not** an exhaustive grep list.
A host `.claude/rules/` testing convention that explicitly defines or permits one of these **wins** (cite the
rule path); flag only undocumented occurrences.

**Invalidating — the test asserts nothing real or cannot be trusted. CRITICAL.**

- **Tautological assertion** — asserts a value against itself or against a literal truth (`assert true`,
  `expect(x).toBe(x)`, `assertEqual(a, a)`). It can never fail, so it proves nothing.
- **No assertion** — the body invokes the SUT but never asserts on an outcome (no assert / expect / should /
  verify call). It passes by absence of failure.
- **Self-mocking SUT** — the system under test is itself replaced by a mock / substitute and the assertion
  checks that double's canned return. It tests the double, not the code.
- **Conditional test logic** — branching or looping in the test body (`if` / `for` / `while` / `switch`) so
  it is unclear which path actually ran or asserted. Split into separate tests.
- **Eager Test (multiple Acts)** — more than one invocation of the SUT in one test, so a failure does not
  localize. One Act per test (Arrange → single Act → Assert); split the rest.

**Fragility — a Note by default; CRITICAL when it makes the named gate test non-deterministic or unable to
assert its `## Deliverable`.**

- **Flaky timing** — real wall-clock waits to synchronize (`sleep`, `Task.Delay`, a `setTimeout` Promise).
  Use a fake clock, a deterministic await, or a polling helper.
- **Time-of-day coupling** — production or test reads the real clock directly (`DateTime.Now`, `Date.now()`)
  instead of an injected time source, so the result drifts by run time.
- **Mystery Guest** — the test depends on data it does not set up in its own arrange block (a shared DB row,
  an external file, an env var) with no explicit fixture seed.
- **Order dependence** — the test passes only after another test runs (shared mutable static state, missing
  fixture reset, explicit ordering).
- **Over-mocking value objects** — mocking records / value types / config primitives that could be
  constructed directly or faked. Couples the test to shape without need.
- **Asserting on log output** — asserting on log message text or order; that is an implementation detail and
  breaks on refactor with no behaviour change.
- **Useless test name** — a name not describing a behaviour verifiable from the name alone (`Test1`,
  `ShouldWork`, `Foo`). The per-`## Mode` checks already require behaviour-named tests; this is that bar.

When such a smell makes a `## Tests` gate entry fail to assert on its `## Deliverable` (Invalidating always;
Fragility when it removes determinism or the assertion), raise it as the existing CRITICAL **missing / weak
gate test** — do not invent a new bucket. Otherwise it is a Note.

### Legitimate exemptions

Some of the above are correct in specific test kinds — do not flag them there, and treat an inline comment
naming the exemption category as sufficient justification:

- **E2E / acceptance scenarios** — multiple Acts that each model a user step in one flow are fine (still
  single-purpose per scenario). Does not extend to `unit` entries.
- **Snapshot tests** — the snapshot match is the assertion and the snapshot file is its content; not a
  "no assertion" case.
- **Property-based tests** — generator loops inside the framework's property runner are not "conditional
  test logic"; branching inside the property body still is.
- **Performance tests** — a real wall-clock wait is acceptable when elapsed time is the actual thing under
  test.

A divergence that fits an exemption but is **not** in one of these kinds, and carries no documented rule or
inline exemption comment, stays a finding.

## How to verify conventions

Consume `.temp/.workflows/<slug>/profile.md` for the derived framework / test-naming / test-layout facts —
the recipe agent already derived them once, so do NOT re-derive them per review (the profile is the single
source of truth for those derived facts). `Read` the profile and use its **Framework** / **Test naming** /
**Test layout** bullets directly. The profile carries **pointers only** to `.claude/rules/**`; it never
inlines rule bodies — so still read the path-scoped rules below to get the actual convention text.

`Glob` for `CLAUDE.md` from the repository root and `Read` the ones for directories the diff touched.
`Glob .claude/rules/**/*.md` and read those whose path or top heading matches the touched directories
or topical words in `## Deliverable` / `## Tests`.

- Documented rules the diff touches — naming, module placement, error-handling shape, logging
  conventions — must be honored. Violations of explicit documented rules are CRITICAL.
- Stylistic divergence from undocumented project habits — a Notes finding, not CRITICAL.
- Placeholder markers — `TODO` / `FIXME` / "implement later" — introduced in the diff are CRITICAL.
  The one exception is a documented project rule that explicitly permits them (e.g. `TODO(owner): … #issue`
  with a tracking reference) — honor that rule when it exists. Cite the `path:LINE` for every marker.

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
4. **Testing** — gate tests exist and assert per `## Mode` (the per-`## Mode` rules above) + the anti-patterns.
   → Critical (missing/weak gate test) · Important (in-scope test-quality issue) · `## Notes` (test gap beyond
   the decomposer's `## Tests` — the coder writes those 1:1 and will not invent new ones).
5. **Production readiness** — migration / back-compat / docs for what this task changed; no obvious bug.
   → Critical (obvious bug / data-loss) · Important (in-scope readiness gap) · `## Notes` (broader,
   out-of-`task_diff`).

## Severity buckets

Three buckets. The verbatim-copied sections above use the word **Note** for the non-blocking bucket — read it
as **Minor** here.

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
