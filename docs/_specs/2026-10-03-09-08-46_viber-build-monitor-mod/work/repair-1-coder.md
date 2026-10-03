The reported ENOTEMPTY was not a commit-task.sh failure: the script exited 0 and the assertions passed. A detached `git gc --auto` (it left `.git/objects/info/packs` and `.git/info/refs`) was still writing into the repo when `withTempDir` removed it.
Fix is in the harness, not the test: `writeGitConfig` in tests/harness/tmp.ts now sets `gc.auto=0` and `maintenance.auto=false`, so every `withGitRepo` repo is spared background maintenance.
tests/harness.test.ts has no case for the config content; none added (the task is a report fix, not a new behaviour).
