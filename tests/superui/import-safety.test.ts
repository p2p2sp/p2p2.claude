/*
 * import-safety.test.ts - proves the guarded superui CLI script is safe to
 * `import` from a test module: importing it must not invoke its `main()`
 * (no CLI parsing, no process.exit, no stdout usage banner) and its
 * documented library export must come through as a real function.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/import-safety.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { contrastRatio } from "../../superui/skills/pro-designer/scripts/check_contrast.ts";

test("importing the guarded script does not run its CLI", () => {
  assert.equal(typeof contrastRatio, "function", "check_contrast.ts should export contrastRatio");

  // A guarded script's bottom-of-file main() call must not have fired on
  // import - if it had, a bad/absent CLI invocation would already have set
  // a non-zero exit code (or the process would have exited outright before
  // this assertion ever ran).
  assert.ok(
    process.exitCode === undefined || process.exitCode === 0,
    `process.exitCode should be unset or 0 after import, got ${String(process.exitCode)}`,
  );
});
