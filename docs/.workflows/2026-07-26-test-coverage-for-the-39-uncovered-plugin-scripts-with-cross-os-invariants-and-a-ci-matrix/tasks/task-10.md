
## Task 10 - test(supergh): cover the commit chain - commit-args, commit-context, commit, commit-selfcheck
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/supergh/commit-args.test.ts`
- add - `tests/supergh/commit-context.test.ts`
- add - `tests/supergh/commit.test.ts`
- add - `tests/supergh/commit-selfcheck.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test "tests/supergh/commit*.test.ts"`

### Approach
1. `commit-args.test.ts`: `commit-args.sh` is sourced, so drive `resolve_commit_selector "<raw>"` through a
   temp bash wrapper that sources it and prints `COMMIT_MODE`, `COMMIT_PATH`, `COMMIT_ISSUE_REFS`. Cover:
   empty input → `all`; `staged`; a path that exists → `path` and the path passed verbatim; a path that
   does not exist; an existing path *named* `staged` (the documented "existing path wins over keyword"
   rule); one and several issue URLs stripped before selector resolution; an issue URL plus a path; a path
   containing a space.
2. `commit-context.test.ts`: inside a `withGitRepo`, assert the emitted block carries the resolved
   `Selector` line, recent commit subjects, `git status` and a diff, for each selector mode. Cover the
   unborn-HEAD branch (empty-tree object) explicitly, a repo with no changes, a diff exceeding
   `MAX_LINES=400` (assert it is capped), a binary file change, and a filename with a non-ASCII character.
3. `commit.test.ts`: assert a commit lands for `all`, `staged` and a path selector; that the path selector
   leaves *other* staged changes uncommitted; exit 1 on a missing message; a multi-line message; a message
   with a leading `-`; committing when nothing is staged.
4. `commit-selfcheck.test.ts`: `VERIFIED` when HEAD moved, `FAILED` when it did not, exit 1 on a missing
   argument, and a `before_sha` that is not a valid object.

### Edge cases
`commit-context.sh` deliberately runs without `set -e`, so a failing probe must degrade rather than abort -
assert the block is still emitted. An unborn HEAD for all four scripts. A detached HEAD. A repo where
`user.email` is unset (the harness pins it, so also assert behaviour with it explicitly unset).

### Contracts
`resolve_commit_selector <raw>` → sets `COMMIT_MODE` ∈ {`all`,`staged`,`path`}, `COMMIT_PATH`, `COMMIT_ISSUE_REFS`.
`commit-selfcheck.sh <before_sha>` → one word `VERIFIED`|`FAILED`; exit 1 on a missing argument.

### DoD
All four test files green; no test mutates the working repo (every git call runs inside `withGitRepo`).


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
