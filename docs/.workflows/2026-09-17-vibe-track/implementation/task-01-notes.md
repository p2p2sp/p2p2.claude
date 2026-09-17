## Runs
- node --test tests/superdev/vibe-guard.test.ts -> tests 18, pass 18, fail 0
- node --test tests/portability.test.ts -> tests 21, pass 21, fail 0

Approach 3: the directory test runs BEFORE the tracked test, not after it - `git ls-files --error-unmatch -- <dir>` succeeds for any directory holding a tracked file, so the listed order would have measured a whole subtree as one declared file instead of dropping it.

UNDERSPECIFIED: `<path>` in `RESULT: ERROR - notes file not found: <path>` when no notes argument was passed at all - printed as the empty string (the line ends at the colon), one message covering all three cases the failure mode names (argument missing, file absent, file unreadable). Readability is probed with `: < "$notes"`, not `-r`, because a Windows ACL deny leaves `-r` true.

UNDERSPECIFIED: git index mode of `superdev/scripts/vibe-guard.sh` - staged 100755, so Task 3 may invoke it either bare or through `bash`; the portability sweep requires the bit only for a bare invocation and never forbids it.

CARRY: tests/harness/run.ts - on Windows a `bash.exe` spawned from Node (a non-MSYS parent) has the MSYS runtime expand every glob-bearing argv element against the cwd before the script sees it, so `--sensitive 'src/auth/*'` arrives as `src/auth/login.ts`. `tests/superdev/vibe-guard.test.ts` works around it per call with `MSYS=noglob`; that option must stay OFF for the harness's own newline-argument transport, because noglob also disables the runtime's quote processing and the `bash -c` preamble then arrives unparsed (`exec: $P2P2_ARGV_SHELL: not found`). Any other suite passing a glob argument is silently asserting against a pre-expanded path on Windows.

CARRY: docs/notes.md - modified in the working tree by someone other than this task (the user's own scratch notes; every test here writes into mkdtemp dirs only). Left untouched and undeclared, so `commit-task.sh` will report it as `undeclared:`.
