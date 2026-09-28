# T6 coder notes

- The C4 rule checks every `--fg-*` on every `--bg-*`, so no text can sit on an accent fill. The skip link, the pressed language button and the walk counters now use `--bg-accent` with `--fg-accent` text plus an accent border. They used to be light text on the accent.
- `--rule-control` (input and copy-button borders) is neither fg nor bg, so the test ignores it. It was checked by hand at 3:1 as `ui` against the page and surface in both themes. Check it again if you change it.
- Dark `--bg-select` went from #2c4660 to #233a52 and dark `--fg-muted` from #a8a399 to #b0aba1: the old muted-on-selection pair was 3.88:1.
- The test also fails when a `--fg-*`/`--bg-*` token is declared in one theme only (`unpairedTokenViolations`). Otherwise the dark theme would inherit a light value that was never checked.
- Type ramp now 12/14/16/18/20/24/32/40/52/64, radii 4/8/12/pill. The tests-running.md counts come from a macOS run: the 2 viber skips are cases that run only on Windows.
