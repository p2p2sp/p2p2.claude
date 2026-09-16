## Runs
- node --test "tests/**/*.test.ts" -> tests 547, pass 547, fail 0
- node --test tests/superdev/stats-record.test.ts -> tests 9, pass 9, fail 0

Approach step 5 lists eight test cases; the file carries nine - an extra case for an EMPTY required argument was added because the failure mode covers "missing or empty" and only the missing half was listed.
UNDERSPECIFIED: control-character handling - "strip" is read literally, so a tab / CR / newline is REMOVED from a field rather than replaced by a space ("round<TAB>01" is written as "round01", a two-line note as one run-on line); the contract only requires one parseable line.
UNDERSPECIFIED: the required-argument check runs AFTER the control characters are stripped, so an argument made of nothing but a tab is rejected as empty rather than written as an empty field.
UNDERSPECIFIED: the root of `.temp/superdev/stats/` - the contract names the path relative, so the script writes it relative to the CURRENT WORKING DIRECTORY (the host repo root, where the orchestrator runs) and does not resolve a git root the way the executor's run.sh does for its logs; `stats-report.sh` (Task 11) must resolve the same way.
