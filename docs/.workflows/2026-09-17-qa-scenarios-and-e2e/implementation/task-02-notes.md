## Runs
- node --test tests/superdev/check-playwright.test.ts -> tests 5, pass 5, fail 0
- node --test tests/superdev/bootstrap.test.ts -> tests 9, pass 9, fail 0

## Deltas
- Approach step 2's wording ("after the superdev.yml block") would place the `check-playwright.sh` call before the pre-existing `.gitattributes` block; DoD requires "`/superdev:setup` output ends with the two tooling lines", so the call sits after the `.gitattributes` block instead (last thing before `exit 0`) - both bootstrap.test.ts expectations put the two tooling lines last.
- check-playwright.test.ts's 5 cases split the Approach's 5-item list so each isolates one dimension: "not found" pins both lines negative (baseline); "found with version" and "found with --version exiting 1" vary only the playwright-cli dimension; "@playwright/test: found" and "@playwright/test: not found without a package.json" vary only the @playwright/test dimension - the latter uses a found-with-version playwright-cli stub (rather than repeating the baseline) so it does not just duplicate the first case's assertion.
- UNDERSPECIFIED: the exact `version_status`/empty-output check in check-playwright.sh (`[ "$version_status" -eq 0 ] && [ -n "$version" ]`) - Contracts/Failure modes named the two outcomes ("found <version>" vs "found (version unknown)") but not whether a nonzero exit with non-empty stdout should count as unknown; decided it does (mirrors "fails or prints nothing" as one failure class), matching the check-playwright.test.ts exit-1 case (which also happens to print nothing).
no other deviations
