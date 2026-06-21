# Deliverable-verification rubric

The shared verification rubric for the agentic-development pipeline's review gates. `dev-task-reviewer`
applies it to ONE task against that task's diff; `dev-plan-auditor` applies it to EVERY task against the
cumulative whole-plan diff. The rules below are diff-agnostic — wherever they say "the diff", the caller
substitutes its own diff (the per-task `task_diff`, or the cumulative `<base>..HEAD` range).

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

## How to verify conventions

`Glob` for `CLAUDE.md` from the repository root and `Read` the ones for directories the diff touched.
`Glob .claude/rules/**/*.md` and read those whose path or top heading matches the touched directories
or topical words in `## Deliverable` / `## Tests`.

- Documented rules the diff touches — naming, module placement, error-handling shape, logging
  conventions — must be honored. Violations of explicit documented rules are CRITICAL.
- Stylistic divergence from undocumented project habits — a Notes finding, not CRITICAL.
- Placeholder markers — `TODO` / `FIXME` / "implement later" — introduced in the diff are CRITICAL.
  The one exception is a documented project rule that explicitly permits them (e.g. `TODO(owner): … #issue`
  with a tracking reference) — honor that rule when it exists. Cite the `path:LINE` for every marker.

## Severity buckets

- **CRITICAL** — a missing/mismatched Deliverable, a missing/weak gate test, a documented-convention
  violation, a placeholder marker, a plan inconsistency. Any CRITICAL forces a non-PASS verdict.
- **Note** — stylistic divergence, informational context (e.g. pre-existing modifications outside the
  reviewed diff), anything the caller should know but that does not block. Never forces a non-PASS.

## PASS / FAIL / BLOCKED criteria

A three-way decision:

- **PASS** — the Deliverable is verified, every gate test is verified per the `## Mode` rules, and no
  documented convention is violated.
- **BLOCKED** — allowed **only** when **every** CRITICAL issue cites a path **outside** the reviewed
  diff **AND** the in-diff code mechanically references or depends on the violated invariant (e.g. the
  diff calls into a documented contract whose upstream rule was broken, or a touched file inherits a
  global rule that was violated elsewhere). Mixed (at least one in-diff CRITICAL **and** at least one
  out-of-diff CRITICAL) → **FAIL**, never BLOCKED. `BLOCKED` is narrow on purpose: convention drift in
  a module the diff does not interact with is not raised at all — only read conventions for directories
  the diff touched.
- **FAIL** — every other outcome.

Every issue raised MUST cite a `path:LINE` that appears in the reviewed diff (or, for BLOCKED, the
out-of-diff `path:LINE` plus the named rule/invariant). Never fail a review without naming the exact
Deliverable, test intent/identifier, or convention rule violated.
