
## Task 12 - test(superfix): cover check_node.sh, collect_signals.sh and collect_edges.sh
- Covers: criteria #3, #5
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superfix/check_node.test.ts` (new dir `tests/superfix/`)
- add - `tests/superfix/collect_signals.test.ts`
- add - `tests/superfix/collect_edges.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test "tests/superfix/*.test.ts"`

### Approach
1. `check_node.test.ts`: with a `withStub("node", …)` reporting a chosen `--version`, assert the single
   output line across every threshold - `v26.0.0`, `v24.0.0`, `v23.6.0` → `NODE_OK node`; `v23.5.0`,
   `v22.6.0` → `NODE_OK node --experimental-strip-types`; `v22.5.0`, `v20.0.0` → `NODE_MISSING`; no `node`
   on PATH → `NODE_MISSING`; `node` present but exiting non-zero; a malformed version string. Exit is
   always 0 and stdout is always exactly one line.
2. `collect_signals.test.ts`: inside a `withGitRepo` with a scripted history, assert one JSONL record per
   tracked file with the keys `path`, `churn`, `fix_commits`, `recency_days`, `loc`, `dependents`; that
   `--with-dependents` works in any argument position; the `[window_days]` and `[repo_root]` positionals;
   the kept-extension list and per-file warnings on stderr only; and a non-zero exit with one stderr line
   and zero stdout on an unborn HEAD.
3. `collect_edges.test.ts`: assert JSONL records with `a`, `b`, `via`, `vias`, `fanout`, `shared`; that
   `--max-fanout` caps as documented; exit 1 on an unborn HEAD; and exit 0 with *empty* stdout when no
   pairs exist - the documented empty case that must not be an error.
4. Reuse the same fixture-repo builder shape in both collector tests but keep it file-local, per the
   fixtures-stay-local convention.

### Edge cases
A tracked filename containing a space and a non-ASCII character (both scripts set `core.quotePath=false`,
so the path must come through unquoted). A file deleted in a later commit. A repo whose only commit is
empty. A shallow clone. `check_node.sh` is `#!/bin/sh` → `forEachShell("posix", …)`; the two collectors are
bash → `forEachShell("bash", …)`.

### Contracts
`check_node.sh` → exactly one of `NODE_OK node` | `NODE_OK node --experimental-strip-types` | `NODE_MISSING`; exit 0 always.
`collect_signals.sh [window_days] [repo_root] [--with-dependents]` → JSONL `{path,churn,fix_commits,recency_days,loc,dependents}`.

### DoD
All three test files green; every JSONL line emitted in the tests parses with `JSON.parse`.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
5. Every `#!/bin/sh` script is exercised under each POSIX shell present on the machine, and every
   bash-shebang script under each distinct bash major present; an absent shell is skipped with a recorded
   reason, never failed.
