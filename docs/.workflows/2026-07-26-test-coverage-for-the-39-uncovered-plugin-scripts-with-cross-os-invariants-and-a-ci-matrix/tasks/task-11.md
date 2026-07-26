
## Task 11 - test(supergh): cover the issue and PR scripts against a stubbed gh
- Covers: criteria #3, #5
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/supergh/create-issue.test.ts`
- add - `tests/supergh/create-pr.test.ts` (covers `check-base.sh`, `pr-facts.sh`, `create-pr/scripts/create.sh`)

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/supergh/create-issue.test.ts`
- `node --test tests/supergh/create-pr.test.ts`

### Approach
1. `create-issue.test.ts` against `supergh/skills/create-issue/scripts/create.sh` with a `withStub("gh", …)`:
   assert `ISSUE_URL=`, `ISSUE_NUMBER=` and `TYPE=` across all four type outcomes - `applied`, `dropped`
   (with `TYPE_ERROR=`), `error`, `none` - plus repeated `--label`, `--assignee` and `--project` flags,
   an unknown flag, exit 2 on missing arguments, and exit 1 with a single `ERROR` line on stderr and
   nothing created when `gh issue create` fails.
2. `create-pr.test.ts` for `check-base.sh`: `BASE_EXISTS=1` then `OPEN_PR=<url>`; `BASE_EXISTS=1` then
   `OPEN_PR=` empty; `BASE_EXISTS=0` then `REMOTE_BRANCHES=a,b`; exit 2 on missing arguments.
3. Same file for `pr-facts.sh`: with and without an issue number; `ISSUE_ERROR=` when the issue lookup
   fails; the `COMMITS:` marker followed by raw `git log`; empty `CHANGED_FILES=`; each probe failing
   independently (fail-soft) while the block still emits; exit 2 on missing arguments.
4. Same file for `create-pr/scripts/create.sh`: `PR_URL=`/`PR_NUMBER=` parsed from the stub; assert the
   invocation carried `--draft` and `--body-file` (have the stub echo its argv into a file the test
   reads); exit 1 with an `ERROR` line when creation fails; exit 2 on missing arguments.
5. All four are `#!/bin/sh` - run through `forEachShell("posix", …)`.

### Edge cases
A title containing a quote and a non-ASCII character. A `gh` stub emitting a URL with a trailing newline or
CRLF. A `gh` stub writing to stderr and exiting 0. An issue number that is not numeric. A body path that
does not exist.

### Contracts
`create-issue/scripts/create.sh <body-path> <title> [--type X] [--label L]... ` → `ISSUE_URL=`,
`ISSUE_NUMBER=`, `TYPE=applied|dropped|error|none`, optional `TYPE_ERROR=`; exit 0/1/2.

### DoD
Both test files green under every POSIX shell present; no test invokes the real `gh` (assert by pointing
`PATH` at the stub dir only).


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
5. Every `#!/bin/sh` script is exercised under each POSIX shell present on the machine, and every
   bash-shebang script under each distinct bash major present; an absent shell is skipped with a recorded
   reason, never failed.
