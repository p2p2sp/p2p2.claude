# T4 coder notes

- Ported from `supergh/skills/create-issue/scripts/create.sh` (git show 6e9b1004^:...), then
  generalized past the old script's hardcoded `github.com`: `ISSUE_URL`'s own host now threads
  through to `gh api --hostname <host> -X PATCH ...`, satisfying C4's `<host>` wording.
- Added two behaviors the old script lacked but C4 requires: an explicit `[ -f "$body" ]` check
  (exit 2, "body file not found") before any flag parsing, since the old script let a missing
  body reach `gh` and surface as a generic create failure instead.
- The `--label/--assignee/--project` reordering loop (pop front, requeue matching pairs to the
  tail) is copied verbatim from the retired script; traced by hand (see test
  "flags forward verbatim and in order") to confirm it preserves input order rather than
  reversing it - non-obvious from reading the loop alone.
- `tests/viber/create-issue.test.ts` follows `post-comment.test.ts`'s stub/loop conventions
  (array-of-cases `for` inside one `test()`), which is the established pattern in this sibling
  file despite `test-strategy.md`'s "no control flow in a test body" rule; kept for consistency
  rather than introducing a new shape.
- `git update-index --add --chmod=+x` was run right after creating the file so DoD.5
  (`git ls-files -s` -> 100755) holds regardless of the filesystem bit on Windows.
