## Task 3 — implementation notes

- Added two hand-written fixture data files under the shared `.temp/preview-refactor/fixture/`
  (`components/button.data.js`, `patterns/login.data.js`) that are not listed in `Files` — they are gitignored
  test fixtures (`.temp/` is in `.gitignore`), required by the task's own DoD/Test Commands ("a hand-written
  `components/button.data.js` and `patterns/login.data.js`") and by Task 2's precedent (Approach step 1 already
  seeded the shared fixture and states "later tasks add hand-written data files here"). No plugin source file
  outside `Files` was touched.
- No other deviations: shell format, title-extraction-with-slug-fallback, `data-dark-toggle` gating via a
  locally duplicated `has_dark_overrides`, per-pattern `../components/<f>` fan-out, wholesale stale-shell
  deletion, and the self-verify-every-reference behavior all match the Approach and Contracts sections
  directly.
