# Final review 1

## Minor

1. `viber/agents/closeout.md:38` - the deviation section line is still written `D<n> (#<criterion>): ...`, the `#<n>` criterion form that AC1 replaced with `AC<n>`. It lands in `spec.md`, which is pasted into issues and pull requests, where GitHub links `#2` to an unrelated old issue (the defect this change removes). Consumer: `tests/viber/archive-run.test.ts:442` fixture `D1 (#2): ...` has the same shape. Fix: write `D<n> (AC<n>): <one line naming what the build actually does>` in `closeout.md`, and `D1 (AC2): ...` in the fixture.
