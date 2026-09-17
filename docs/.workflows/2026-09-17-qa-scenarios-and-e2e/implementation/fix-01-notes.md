## Runs
- node --test tests/superdev/read-config.test.ts -> tests 16, pass 16, fail 0
- node --test tests/superdev/bootstrap.test.ts -> tests 9, pass 9, fail 0
- node --test tests/superdev/check-playwright.test.ts -> tests 5, pass 5, fail 0
- grep -q '^## Acceptance document' superdev/references/qa-format.md && grep -q '^## Handoff file' superdev/references/qa-format.md && grep -q '^## Index line' superdev/references/qa-format.md && grep -q '^## Supersedes rule' superdev/references/qa-format.md && grep -q '^## Automation status lines' superdev/references/qa-format.md && grep -q '^## Never write these' superdev/references/qa-format.md -> exit 0
- grep -q '^name: qa-writer' superdev/agents/qa-writer.md && grep -q '^model: opus' superdev/agents/qa-writer.md && grep -q 'qa-format.md' superdev/agents/qa-writer.md && grep -q 'QA-INDEX:' superdev/agents/qa-writer.md -> exit 0

I1: fixed - no test: prompt-contract wording in an agent markdown file; the plan records every qa-writer branch as "test none - prompt contract" and the repo has no harness for asserting prompt text. Fixed at both ends: qa-writer.md `## Write` step 2 now names the acceptance document and the handoff file as the only two paths checked and states the index is appended, and qa-format.md's opening paragraph qualifies "Both files" the same way.
I2: fixed - no test: same reason. Took the finding's first option - qa-writer.md's `Areas:` line now carries changelog-writer.md:41's rule in full, enumerated roots and add/modify/delete included, plus the obligation to change both together; qa-format.md's index rule points at that statement instead of only asserting the two agree. changelog-writer.md itself was left untouched.
I3: fixed - no test: a duplicated test helper is not observable from a test run, and this repo carries no lint layer at any level; the proof is both suites green after the move. `coreUtilsPath()` now lives in tests/harness/stub.ts (PATH mechanism, beside `withStub`) and both files import it; its comment drops the false "no `git`" claim and records why the git branch is irrelevant (a temp cwd is no repository, so `git rev-parse --show-toplevel` fails whether or not git resolves).
M1: skipped - Minor, not named on a `minor:` line.
M2: skipped - Minor, not named on a `minor:` line.
M3: skipped - Minor, not named on a `minor:` line.

touched: superdev/agents/qa-writer.md
touched: superdev/references/qa-format.md
touched: tests/harness/stub.ts
touched: tests/superdev/bootstrap.test.ts
touched: tests/superdev/check-playwright.test.ts
