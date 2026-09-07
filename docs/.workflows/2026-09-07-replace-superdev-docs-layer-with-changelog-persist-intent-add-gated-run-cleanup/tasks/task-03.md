
## Task 3 - Propagate the Intent line through decompose.sh
- Covers: criteria #3
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/scripts/decompose.sh (preamble block after `spec_line`, header write block, stdout index after `spec:`, header comment)
- modify - tests/superdev/decompose.test.ts (`simplePlan` / `superPlan` fixture builders gain an optional `intentPath`, new assertions)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/superdev/decompose.test.ts` -> `# fail 0`

### Approach
1. After the `spec_line` handling add `intent_line="$(grep -m1 '^Intent:' "$plan" || true)"`, strip a trailing HTML comment the same way, derive `intent_path` (trimmed value); when non-empty and the file is missing: `echo "warning: intent file not found: $intent_path (from plan's 'Intent:' line) - omitted" >&2` and set `intent_path=""` (keep `intent_line` out of the header too).
2. In the header write block print `$intent_line` after `$spec_line` when `intent_path` is non-empty.
3. In the stdout index print `intent: $intent_path` right after the optional `spec:` line, only when non-empty.
4. Update the header comment (index listing) to document `intent: <path>   (only when the plan has an Intent: line naming an existing file)`.
5. Tests: fixture with `Intent: <existing file>` on both tracks -> `plan-header.md` contains the line and stdout has `^intent: <path>$` (compare via `slash()`); fixture without the line -> neither; fixture naming a missing file -> stderr warning, no `intent:` line, exit 0.

### Edge cases
- `Intent:` line present on the simpleplan track (no `Spec:`) -> header holds `Title:` then `Intent:`.
- Resume run (workdir pre-exists) -> header is rewritten every run as today, so the line is always current.

### Contracts
- decompose stdout index gains the optional line `intent: <path>` between `spec:` (optional) and the task rows.

### DoD
`decompose.test.ts` green; the existing index assertions unchanged.


### Covered criteria
3. `decompose.sh` copies a plan's `Intent:` preamble line (trailing HTML comment stripped) into `plan-header.md` and prints `intent: <path>` in the stdout index; a plan with no `Intent:` line produces neither and still exits 0; an `Intent:` path whose file is missing produces a stderr warning and no `intent:` line; `tests/superdev/decompose.test.ts` passes.
