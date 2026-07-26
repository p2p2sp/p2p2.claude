
## Task 17 - test(ci): cover release.sh version computation against a throwaway repo and a stubbed gh
- Covers: criteria #3, #6
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/github/release.test.ts` (new dir `tests/github/`)

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/github/release.test.ts`

### Approach
1. Build the fixture with `withGitRepo`: a work repo whose `origin` is a second, `--bare` temp repo, four
   `<plugin>/.claude-plugin/plugin.json` files each carrying a `version`, and a `withStub("gh", …)`
   recording its argv to a file. Every push therefore targets the local bare remote - the test can never
   reach GitHub.
2. Assert version computation: no tags → the `0.1.0` seed taken as-is; `1.2.3` + `patch` → `1.2.4`;
   `+ minor` → `1.3.0`; `+ major` → `2.0.0`; non-semver tags (`v1.0.0`, `1.0`, `release-2`) ignored when
   picking the highest; a gap in numbering; an invalid part → exit 2; a target tag that already exists →
   exit 3.
3. Assert all four manifests receive the new `version` and nothing else in them changes, and that the bump
   commit subject is `chore(bump): bump version to <v>`.
4. Assert the re-run recovery branch: run twice with the same target version and confirm the second run
   emits `already committed; re-tagging existing release commit` on stderr rather than fabricating an
   empty commit.
5. Assert the outputs: the new version on stdout and `version=<v>` appended to the file named by
   `GITHUB_OUTPUT`. Assert from the stub's argv log that `gh release create` was called once, and not at
   all when `gh release view` reports the release already exists.
6. Skip the whole file with a recorded reason when `jq` is not on `PATH` - the script requires it and
   Git-Bash does not ship it.

### Edge cases
A tag list of 200 entries (sort order). A manifest with a trailing newline that `jq` must preserve. A
`GITHUB_REF_NAME` other than `main`. `GITHUB_OUTPUT` unset (the script falls back to `/dev/null`). A
detached HEAD.

### Contracts
`release.sh <major|minor|patch>` → new version on stdout, `version=<v>` to `$GITHUB_OUTPUT`;
exit 0 / 2 invalid part / 3 tag exists.

### DoD
Test file green; no tag, commit or release is created outside the temp repos - assert the real repo's
`git status` and tag list are untouched by running the suite.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
6. No test performs network I/O, mutates this repo's working tree, or creates a tag outside a throwaway
   repo: `gh` is always a PATH stub, `node` is a PATH stub wherever a script probes its version, every
   mutating `git` call runs in a `mkdtemp` repo with `HOME`, `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_NOSYSTEM`
   isolated (read-only `git` against this repo is allowed - Task 2 needs the real index and Task 17
   asserts this repo's status and tag list are untouched), and the `release.sh` test pushes only to a
   local bare remote.
