# Final review recheck 1

All three findings of `final-review-1.md` are resolved: `register.tsx` now diffs against the observed run's own index when another run takes the view, and a new engine test covers it. The `hooks.json` description and the `monitor.ts` header are corrected. `node --test tests/viber/monitor.test.ts` (53/53) and `tests/viber/monitor-engine.test.ts` (8/8, claude 2.1.288) pass.

## Minor

1. `tests/viber/monitor.test.ts:3` and `tests/viber/monitor.test.ts:38` - these comments still describe the fixture as the stdout of "`plan-index.sh --split`". This is the same stale wording that finding 3 fixed in `viber/hooks/monitor/monitor.ts:4`, and the test file states that its subject is monitor.ts. The monitor's only producer, `viber/hooks/monitor/register.tsx`, runs `plan-index.sh <plan>` without `--split` ("never --split: the mod writes nothing"). The stdout is the same either way (`viber/scripts/plan-index.sh` header), so only the comments are wrong. Fix: change both mentions to "`plan-index.sh`" (no `--split`).
