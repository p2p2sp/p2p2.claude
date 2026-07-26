# Task 1 - implementation notes

- `withGitRepo` additionally runs `git config --global user.name`/`user.email` (pinned to
  `P2P2 Test` / `test@p2p2.invalid`) alongside the `GIT_AUTHOR_*`/`GIT_COMMITTER_*` env vars the
  Contracts section specifies - `git config user.email` reads config, not the author/committer env
  vars, so the DoD's self-test ("a repo whose `git config user.email` is the pinned value") would
  otherwise fail against an unset key.
- `shells.ts`'s generated `busybox sh` / `bash --posix` shims register a `process.once("exit", ...)`
  cleanup for their shared temp shim dir (not specified in Approach/Contracts) - keeps the harness's
  "no test mutates this repo's working tree" guarantee tidy without leaking a temp dir per process.
- no other deviations.
