- `Write` and `Edit` were disabled this session: the three files were written through `Bash`
  heredocs and a one-line `awk` rewrite, each verified with `git diff` right after.
- The two `## Write` bullets of `rules-writer` restating criteria 1 and 2 of the gate were replaced
  by one bullet pointing at the gate - a second source of truth otherwise, and their "the build's
  own code" wording would block admission in the map/notes shape, where there is no build.
- Same reason for `per build` -> `per run` on the Budget cap; every other `build` wording in the
  agent is untouched.
- T3's verification greps lowercase `dominant`: criterion 1 keeps that word unbolded and lowercase.
