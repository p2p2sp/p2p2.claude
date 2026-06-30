# SuperPlan: coupon discount at checkout
> Spec: .superdev/spec/coupon-discount.md (source of truth for WHAT — referenced, not duplicated)

## 0. Implementation mode
Implementation: superbuild
> First thing you MUST do is USE the `superdev:superbuild` skill to implement this plan.

## 1. Touch list
- src/discount/calculator.py — create — pure coupon-to-discount calculation
- src/api/checkout.py — modify — apply the calculated discount to the checkout total
- README.md — modify — document the coupon feature for end users

## 2. Phases & dependencies
1. Discount calculator — blocks: checkout wiring
2. Checkout wiring — blocks: docs
3. Docs — blocks: —

## 3. Decisions resolved
- Rounding: banker's rounding (round-half-to-even) — matches the finance ledger already in use.
- Coupon precedence: a single coupon per order — stacking is out of scope.

## 4. Test strategy (maps to spec acceptance criteria)
- percentage coupon reduces total → unit @ tests/discount/
- fixed-amount coupon reduces total → unit @ tests/discount/
- checkout returns the discounted total → e2e @ tests/e2e/

Testing direction (binding floor for decomposer — may raise rigor, never lower it):
- TDD areas: the discount calculation — percentage vs fixed branches, clamping, and expiry are pure logic and warrant test-first.
- Edge cases / failure modes: expired coupon is rejected (total unchanged); a percentage above 100 is clamped to 100.
- Port seams to isolate: none — the calculator is pure; the clock for expiry is passed in as a value, not read inside.

## 5. Risks & assumptions
- Assumption: coupon validity window is supplied by the caller; the calculator does not read the system clock.

## 6. Migration / data (if any)
- None.
