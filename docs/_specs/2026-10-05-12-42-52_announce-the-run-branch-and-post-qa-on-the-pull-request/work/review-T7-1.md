# Review T7 - attempt 1

Verification run: `node --test tests/viber/qa-comment.test.ts` 19/19 pass; `git ls-files -s viber/scripts/qa-comment.sh` -> 100755; `node --test tests/portability.unit.test.ts` 39/39 pass. DoD.1-8 hold, each with a test that fails if it breaks.

## Blocking

1. viber/scripts/qa-comment.sh:82-89 - DoD.9 / C3 `exit: 2 - bad arguments or missing qa file` is not honoured: the `no-gh` check runs before the qa-file check, so a missing qa file on a machine without `gh` exits 0 with `STATUS=skip REASON=no-gh` instead of exit 2. Nothing forces this order. Only `no-repo` has to come before the file check, because a relative path resolves from the repository root. The `gh` check does not. The result hides a caller's wrong-path bug behind a normal skip. The coder's note (check order) states this choice outright, and no test pins it, which matters on `TDD: required`. Fix: move `command -v gh >/dev/null 2>&1 || skip no-gh` below the `[ ! -f "$file" ]` block, so the order is args -> no-repo -> missing file (exit 2) -> no-gh -> no-pr. Update the header's "Checks, in order" sentence (lines 38-42) to match. Add a case to tests/viber/qa-comment.test.ts: `gh` not on PATH (same `ghOnCorePath` skip guard) with no qa file -> exit 2, `ERROR qa-comment.sh: qa file not found:` on stderr, empty stdout.

## Minor

1. viber/scripts/qa-comment.sh:103 - `gh pr view ... 2>&1` mixes gh's stderr (for example an update notice) into the comment bodies on success. The exists scan tolerates this. Capturing only stdout on success, and stderr only for the failure message, would be cleaner.
