# Hand-trace — expected per-task decomposition (defined UP FRONT)

Source fixture: `handtrace-plan.md` (cut-down superplan §0–§6, `> Spec:` present, §4 filled).
This table is the ORACLE: it is written before the trace and the trace is checked
field-by-field against it (see `handtrace-transcript.md`). It pins the decomposer's
decision-core outputs — Mode / Touches / Tests / Depends — for this fixture.

Expected K = 3 tasks, order 1 → 2 → 3 (the §2 chain: calculator blocks checkout
blocks docs).

| N | H1 (commit subject) | Mode | Touches (role) | Tests (Kind × count) | Depends on |
|---|---|---|---|---|---|
| 1 | `feat(discount): add coupon discount calculator` | `tdd` | `src/discount/calculator.py` — production; `tests/discount/**` — test | unit × 4 (percentage applied; fixed applied; expired rejected; percentage clamped at 100) | — |
| 2 | `feat(checkout): apply coupon discount at checkout` | `e2e-first` | `src/api/checkout.py` — production; `tests/e2e/**` — test | e2e × 1 (checkout returns the discounted total) | task 1 |
| 3 | `docs(readme): document the coupon feature` | `tests-none` | `README.md` — docs | none | task 2 |

## Why each decision (the oracle's reasoning)

- **Task 1 = `tdd`.** §1 introduces a pure calculator; §4 Testing direction names the
  branches (percentage vs fixed, clamp, expiry) as TDD areas → `tdd` baseline holds,
  binding floor raises nothing further. Branch-driven 1:1: §4 names 4 distinct
  branches/failure modes → 4 `unit` intents.
- **Task 2 = `e2e-first`.** Its deliverable IS an externally observable cross-layer
  endpoint contract (checkout returns the discounted total); the pure logic was
  extracted to Task 1 (extract-pure-testable-helper), so no competing `tdd` concern
  remains → carve-out to `e2e-first`. Depends on Task 1 (consumes the calculator).
- **Task 3 = `tests-none`.** `Touches` is exclusively `README.md` (non-runnable docs)
  → `tests-none` carve-out. Depends on Task 2 (documents the shipped behavior; §2
  `docs` is blocked by checkout wiring).

## Pipeline-artefact expectations (deterministic edges)

- `precheck.sh` on a FRESH slug → emits `FRESH` (no prior tasks).
- `copy_plan.sh` → `PLAN_COPIED`; `.temp/.workflows/<slug>/plan.md` byte-equal to the
  fixture; `status.yml` = `current_task: 1`.
- `validate_tasks.py` over the three task files materialized to match this table →
  `VALIDATE_OK`.
