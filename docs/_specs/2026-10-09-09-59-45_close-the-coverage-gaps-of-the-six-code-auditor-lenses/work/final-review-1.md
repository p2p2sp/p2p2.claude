# Final review - slice 1 (T1 to T8)

## Blocking

### 1. New substring test/spec excludes drop ordinary source files from four signal blocks and one design block

- Locations:
  - viber/skills/code-auditor/references/lenses/runtime-performance.signals.md:16 (C1 block [2], I/O near a loop): `':!*test*' ':!*spec*'`
  - viber/skills/code-auditor/references/lenses/runtime-performance.signals.md:31 (per-call setup and fan-out): `':!*test*'`
  - viber/skills/code-auditor/references/lenses/runtime-performance.signals.md:36 (unbounded fetch): `':!*test*'`
  - viber/skills/code-auditor/references/lenses/bugs.signals.md:31 (hazard idioms): `':!*test*' ':!*spec*'`
  - viber/skills/code-auditor/references/lenses/design.signals.md:21 (literals): `':(exclude)*test*' ':(exclude)*spec*'`
- What is wrong: none of these excludes existed before this build (`git show 2e12d318:<file>` holds no `*test*`). A git pathspec `*test*` matches the substring anywhere in the path, so production files such as `src/latest.ts`, `src/attestation.py`, `src/contest/handler.js` and `src/inspector.ts`, `src/spectrum.go` are silently left out of the ranking. This is exactly the defect class the spec's Problem section lists ("one test-or-spec substring filter drops ordinary source files") and the edge case it pins for `src/latest.ts` and `src/inspector.ts`, reintroduced in sibling blocks.
- Proof: the T1 coder notes say "runtime-performance's `':!*test*' ':!*spec*'` excludes still drop production paths like `latest.ts` ... I did not change them"; the T3 coder notes say "The hazard-idiom block excludes `*test*` paths, so production files like `latest.ts` are dropped from it". `tests/viber/lens-map-signals.test.ts` pins the path-shaped fix only for `tests.signals.md` block [0].
- Fix: replace each substring exclude with a path-shaped test filter, for example filter the output on the path with the same regex `tests.signals.md` uses (`(^|/)(tests?|__tests__|specs?|e2e|cypress)/|[._-](test|spec|cy)[.]|(^|/)test_|(Test|Tests|Spec)[.][A-Za-z]+$`, applied to the path part before the first `:`), or path-shaped pathspecs such as `':!*.test.*' ':!*.spec.*' ':!*_test.*' ':!**/test/**' ':!**/tests/**' ':!**/__tests__/**'`. Keep `runtime-performance.signals.md` block [2] at its C1 position and `git grep -n -A6` row shape, and extend the `lens-map-signals.test.ts` loop-block case with a `src/latest.js` whose loop awaits a fetch, which must be listed.

### 2. The bugs `crash-hang` angle does not cover subscriptions the web-performance lens hands to it

- Location: viber/skills/code-auditor/references/lenses/bugs.md:12
- What is wrong: `crash-hang` names "handles, processes, temp directories, locks, listeners or timers not released on the error path or on unmount" but no subscription. Criterion 2 requires the bugs lens to own "listeners, timers or subscriptions not released on the error path or on unmount", and criterion 11 requires every hand-off class to be covered by an angle of the receiving lens.
- Consumer proving it: viber/skills/code-auditor/references/lenses/web-performance.md:2 hands "a listener, timer or subscription never removed on unmount, to the bugs lens", and viber/skills/code-auditor/README.md:126 maps that row to `crash-hang`; a subscription leak is excluded from web-performance and not named by any bugs angle.
- Fix: add subscriptions to the `crash-hang` list in bugs.md:12 ("... locks, listeners, timers or subscriptions not released on the error path or on unmount"; bugs.md is 7001 bytes, under the 8000 cap), and name it in the README `crash-hang` summary at viber/skills/code-auditor/README.md:14 ("resources, listeners, timers or subscriptions not released on the error path or on unmount").
