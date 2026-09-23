Investigated the single finding (release.test.ts:468, "left the real repo's git status
untouched" caught 4 agent .md files as unexpectedly modified). Root cause: not a defect in
release.test.ts or in T1/T2's delivered work - that test only reads `git status`/`git tag`
against the real repo (never writes to it; every mutation goes through `withGitRepo` fixtures),
so a failure there means something else touched the repo mid-run.

`git log` shows commit 38270f1 "chore(agents): add acceptEdits permission mode" landed at
14:04:07, right after T2 (14:00:45) and T1 (13:59:24), touching exactly the 4 named files (plus
6 more outside the finding). That commit is unrelated to this spec (no `Files:` overlap with T1
or T2) and is already committed - it was very likely made by the user's own session while QA's
suite was mid-run, producing the transient git-status delta the sentinel test correctly caught.

Verified clean now: `git diff` on the 4 named files is empty, `node --test tests/github/release.test.ts`
(16/16 pass) and the full suite `node --test --test-concurrency=8 "tests/**/*.test.ts"`
(955 pass / 1 skipped, 0 fail) both green. No code change made - there is nothing in T1/T2's
scope or in the test to fix; weakening the sentinel test would remove real protection.
