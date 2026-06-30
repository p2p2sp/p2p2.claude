# Hand-trace — recorded transcript (Steps 0–8 on the fixture)

Trace of the rewritten `superbuild-decomposer` over `handtrace-plan.md`, checked
field-by-field against the oracle in `handtrace-expected.md`. The deterministic
edges (Step 0 precheck, Step 7.0 copy_plan, Step 8 validate_tasks) were run as
real scripts; the decision-core (Steps 2–6) was traced by hand and the resulting
task files fed to `validate_tasks.py` for structural confirmation.

## Step 0 — Idempotency precheck

Input `PlanSlug: coupon-discount-at-checkout` on a clean tree (no prior tasks).
`precheck.sh` stdout:

```
FRESH
```

→ proceed to Step 1 (matches oracle: FRESH on a fresh slug).

## Steps 1–2 — Read plan + map §0–§6

- §0 Implementation mode: `superbuild` (orientation only).
- `> Spec:` present → `.superdev/spec/coupon-discount.md` (fail-open: spec not on
  disk in the fixture run, so the trace proceeds without it — `## Plan context`
  still synthesizes from title + §3).
- §1 Touch list → 3 touch candidates (calculator / checkout / README).
- §2 Phases & dependencies → chain calculator ▸ checkout ▸ docs.
- §3 Decisions resolved → banker's rounding, single-coupon-per-order (feed Plan
  context + Why).
- §4 Test strategy + Testing direction → TDD areas (calculation branches), named
  edge cases (expired rejected; percentage clamped at 100), no port seam.
- §5 risk (caller supplies validity window) → Notes orientation.
- §6 Migration: none.

No contradiction; §1 present → executable intent found (no FAIL).

## Steps 3–6 — Decision-core (traced by hand, checked vs oracle)

| N | Mode | Touches | Tests | Depends | matches oracle? |
|---|---|---|---|---|---|
| 1 | `tdd` | calculator + tests/discount | unit × 4 (percentage / fixed / expired / clamp) | — | YES |
| 2 | `e2e-first` | checkout + tests/e2e | e2e × 1 (discounted total) | task 1 | YES |
| 3 | `tests-none` | README.md | none | task 2 | YES |

Branch-driven 1:1 (Task 1): §4/Deliverable name 4 branches → 4 `unit` intents (1:1). OK.
Forcing functions: extract-pure-testable-helper applied (calc split out of checkout);
one-concern-one-Mode honored (Task 2 has no competing `tdd` concern). OK.

## Step 7.0 — copy_plan.sh

```
PLAN_COPIED
```
- `plan.md` byte-equal to the source fixture: OK (`cmp` equal).
- `status.yml` = `current_task: 1`: OK.

## Step 7.1 — task files written

`.temp/.workflows/coupon-discount-at-checkout/tasks/{1,2,3}.md` written per the
Step 7.1 template (H1 + `>` orientation + 7 body sections).

## Step 8 — validate_tasks.py

```
VALIDATE_OK
```
All scripted structural checks pass (h1-form, verb-h1, section-order, mode-enum,
tests-none-shape, tests-empty, gate-shape, tdd-unit-min, e2e-min, forward-ref,
task1-dep, cycle, plan-bytes, status-seed). Inline non-scriptable checks
(branch→test 1:1, Mode doctrine, forcing functions, §4/§2 honored) confirmed by
hand above.

## Output-format line shape

```
- 1 — feat(discount): add coupon discount calculator — .temp/.workflows/coupon-discount-at-checkout/tasks/1.md
```
Matches the superbuild consumer regex `^- (\d+) — (.+) — (.+\.md)$` (exact UTF-8
" — " separator).

## Verdict

Trace reproduces the oracle field-by-field; no information lost relative to the
pre-refactor SKILL.md decision-core. PASS.
