# Task 5 - notes

- Approach step 8: each phase intent's `## Out of scope` carries the other phases' goals as non-goals **plus the master intent's own out-of-scope entries** - a phase intent must stand alone, and dropping the master's non-goals would let a phase run re-open scope the user already excluded.
- Approach step 3 (roadmap-reviewer round scoping): added one clause to the `round >= 2` rule - a changed `Covers:` line re-triggers the full R1 coverage check across the file - because moving one decision between phases can strand another, which a regions-only re-review would miss.
- Staged the four new files with `git add` before running `node --test "tests/portability.test.ts"`: the sweep enumerates its corpus from the git index, so untracked files would have made the green run vacuous for exactly the files this task adds.
