/*
 * import-safety.test.ts - proves the guarded superui CLI scripts are safe to
 * `import` from a test module: importing them must not invoke their `main()`
 * (no CLI parsing, no process.exit, no stdout usage banner) and each module's
 * documented library export must come through as a real function.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/import-safety.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { fitRadius } from "../../superui/scripts/measure_geometry.ts";
import { mergeFragments } from "../../superui/scripts/build_registry.ts";
import { renderTokenTable } from "../../superui/scripts/render_design_md.ts";
import { checkScreenRefs } from "../../superui/scripts/validate_bundle.ts";
import { contrastRatio } from "../../superui/scripts/check_contrast.ts";
import { canonicalRefs } from "../../superui/scripts/inventory-format.ts";

test("importing the guarded scripts does not run their CLI", () => {
  assert.equal(typeof fitRadius, "function", "measure_geometry.ts should export fitRadius");
  assert.equal(typeof mergeFragments, "function", "build_registry.ts should export mergeFragments");
  assert.equal(typeof renderTokenTable, "function", "render_design_md.ts should export renderTokenTable");
  assert.equal(typeof checkScreenRefs, "function", "validate_bundle.ts should export checkScreenRefs");
  assert.equal(typeof contrastRatio, "function", "check_contrast.ts should export contrastRatio");
  assert.equal(typeof canonicalRefs, "function", "inventory-format.ts should export canonicalRefs");

  // A guarded script's bottom-of-file main() call must not have fired on
  // import - if it had, a bad/absent CLI invocation would already have set
  // a non-zero exit code (or the process would have exited outright before
  // this assertion ever ran).
  assert.ok(
    process.exitCode === undefined || process.exitCode === 0,
    `process.exitCode should be unset or 0 after import, got ${String(process.exitCode)}`,
  );
});
