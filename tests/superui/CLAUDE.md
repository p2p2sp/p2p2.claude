# tests/superui - regression suite for superui's pro-designer scripts

Owns the tests of the two bundled scripts under `superui/skills/pro-designer/scripts/`: the WCAG contrast checker `check_contrast.ts` and the Node preflight `check_node.sh`. It does not own the scripts themselves, nor the shared helpers in `tests/harness/`.

## Relationships

- `check_contrast.unit.test.ts` and `import-safety.unit.test.ts` import `parseColor`, `main` and `contrastRatio` straight from `check_contrast.ts`: unit tier, no process spawned.
- `check_node.test.ts` spawns `check_node.sh`: integration tier, CI only. It uses `runScript`, `withStub` and `forEachShell` from `tests/harness/`.

## Contracts

- `check_contrast.ts` exit codes: `0` every pair passes AA, `1` a genuine AA failure, `2` no arguments or bad input (an `rgb()` component above 255, a non-string or missing `fg`/`bg` in a `--json` record). An unreadable or unparsable `--json` file throws uncaught, so it also exits `1`. Bad input wins: a failing pair followed by a malformed one still returns `2`. The range check applies to `rgb()` only; `#rgb` and `#rrggbb` keep parsing.
- `check_contrast.ts` is import-safe: its `main()` runs only when the file is the process entry (`process.argv[1]` resolves to the module), so importing it leaves `process.exitCode` unset. `import-safety.unit.test.ts` fails if that guard goes.
- `check_node.sh` prints exactly one line and always exits `0`: `NODE_OK node` for Node >= 23.6, `NODE_OK node --experimental-strip-types` for 22.6 <= Node < 23.6, `NODE_MISSING` for an older, unparsable, failing or absent `node`.

## Commands

- Unit tier of this suite: `node --test "tests/superui/*.unit.test.ts"`.
- The integration file, as CI runs it: `CI=true node --test tests/superui/check_node.test.ts`.

## Change together

- A new Node threshold in `check_node.sh` goes into the version arrays `NODE_OK_VERSIONS`, `NODE_OK_STRIP_VERSIONS` and `NODE_MISSING_VERSIONS` of `check_node.test.ts`.

## Traps

- `check_node.sh` is `#!/bin/sh`: every case runs it through `forEachShell("posix", ...)`, never directly, and a missing POSIX shell turns the case into a recorded skip, never a failure.
- "No node on PATH" is built by stripping from the real `PATH` every directory holding a `node` (`node.exe`, `node.cmd`, `node.bat` on Windows), so it holds on a machine with Node installed; a stub `node` is the only way to fake a version.
