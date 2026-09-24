# T10 - coder notes

- `check-playwright.sh` now short-circuits: it only shells out to `git ls-files` when the root
  `package.json` did not already answer `found`, and stops at the first tracked nested match.
- Trap: `coreUtilsPath()` (grep's dir) does not carry `git` on this Windows box - Git for Windows
  splits `git.exe` into `mingw64/bin`, away from `usr/bin`'s grep/bash. A test needing both an
  isolated PATH and a working `git ls-files` needs a PATH built from `coreUtilsPath()` plus git's
  own resolved dir (see `pathWithGit()`/`runInRepo()` added to the test file) - `stub.ts`'s own
  header already flags this exact risk for this script.
- DoD.2 and DoD.3 passed on the first run once the `git ls-files`-based implementation existed:
  the "only tracked files" property falls straight out of `git ls-files` never listing untracked
  paths, so no separate code branch was needed for DoD.3 - verified by a dedicated test anyway
  since the DoD names it explicitly.
- Marking item #9 done in `docs/reviews/2026-09-24_viber-review.md` and the `bootstrap.sh` half of
  criterion 9 are out of `Files` for this task - left untouched.
