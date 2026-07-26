
## Task 5 - test(superdev): cover the review-plan and session-start hooks, retiring the in-plugin harness
- Covers: criteria #3, #7
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/review-plan.test.ts`
- add - `tests/superdev/session-start.test.ts`
- delete - `superdev/hooks/scripts/review-plan.test.sh`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/review-plan.test.ts`
- `node --test tests/superdev/session-start.test.ts`

### Approach
1. Port every case of `superdev/hooks/scripts/review-plan.test.sh` into `review-plan.test.ts`: build the
   JSONL transcript fixture in a `withTempDir`, feed the PreToolUse JSON on `input`, parse stdout as JSON
   and assert `hookSpecificOutput.permissionDecision`. Delete the `.sh` file.
2. Extend with the fail-open matrix: transcript path absent; transcript unreadable; transcript not valid
   JSONL; no `VERDICT:` line anywhere; `VERDICT: FAIL`; `VERDICT: PASS` but no SimplePlan/SuperPlan format
   declaration in the plan; both present; `.claude/plans/` empty; multiple plan files. Every case must
   exit 0 and emit parseable JSON - a hook that exits non-zero or prints non-JSON is the failure mode
   under test.
3. Write `session-start.test.ts`: manifest present → `additionalContext` equals the manifest bytes
   verbatim and `systemMessage` carries the version; manifest unreadable (point `CLAUDE_PLUGIN_ROOT` at an
   empty temp dir) → `additionalContext` absent but `systemMessage` still present, exit 0; `source:
   "resume"` on stdin; malformed stdin JSON; empty stdin.

### Edge cases
A manifest containing characters that must survive JSON encoding (backslash, quote, newline, a non-ASCII
character). A transcript with CRLF lines. A very long transcript (the hook has a 10 s timeout in
`hooks.json`). stdin closed immediately.

### Contracts
PreToolUse stdout: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"|"deny","permissionDecisionReason":string}}`.
SessionStart stdout: `{"systemMessage":string,"hookSpecificOutput":{...,"additionalContext"?:string}}`.

### DoD
Both test files green; `superdev/hooks/scripts/review-plan.test.sh` no longer exists.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
7. `superdev/hooks/scripts/review-plan.test.sh`, `superdev/scripts/read-config.test.sh` and
   `superdev/skills/setup/scripts/bootstrap.test.sh` are deleted, and every case they asserted is asserted
   in `tests/superdev/`.
