# tests/superui/ - suites for pro-designer's two bundled scripts

## What each file drives

- `check_contrast.unit.test.ts` and `import-safety.unit.test.ts` import `check_contrast.ts` in-process and
  call `main(argv)` directly, never through `runScript`. This holds only while `main` RETURNS its
  exit code and the `import.meta.url` guard alone assigns `process.exitCode`: a `main` that calls
  `process.exit` kills the test process, and `import-safety.unit.test.ts` reads a non-zero
  `process.exitCode` after import as the CLI having fired.
- The contrast cases assert exit codes only (2 for bad input, 1 for a genuine AA failure, 2 when a
  failure is followed by a malformed pair). Nothing here asserts the printed lines or the
  unreadable/unparsable `--json` file path (exit 1), so a change to either passes green.
- `check_node.test.ts` runs `check_node.sh` as `#!/bin/sh` through `forEachShell("posix", ...)`
  with a stubbed `node` printing a version. Its version arrays (`NODE_OK_VERSIONS`,
  `NODE_OK_STRIP_VERSIONS`, `NODE_MISSING_VERSIONS`) sit on both sides of the script's 23.6 and
  22.6 cutovers: moving a cutover means moving the arrays with it.
- "No node on PATH" is staged by `pathWithoutNode()`, the real PATH minus every directory holding
  a `node` binary, not by `coreUtilsPath()`.

## Reach

- `check_node.test.ts` also runs `viber/skills/code-auditor/scripts/check_node.sh` and fails on
  any stdout divergence between the two copies. An edit to viber's copy therefore reaches
  `"tests/superui/*.test.ts"` as well as `tests/viber/check_node.test.ts`.
