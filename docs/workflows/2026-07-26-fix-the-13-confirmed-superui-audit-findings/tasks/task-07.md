
## Task 7 - fix(superui): validate contrast inputs and separate the exit codes
- Covers: criteria #7
- TDD: required

### Dependencies
- Task 1 - blocks: nothing

### Files
- modify - superui/scripts/check_contrast.ts (`parseColor`, `main`)
- modify - superui/skills/pro-designer/SKILL.md (the `Contrast` bullet in `## Final QA`)
- add - tests/superui/check_contrast.test.ts (dir created in Task 1)

### Test Commands
*Build*
- `node superui/scripts/check_contrast.ts` - prints usage, exit 2

*Tests*
- `node --test tests/superui/check_contrast.test.ts` - all assertions pass
- `node superui/scripts/check_contrast.ts "#767676" "#ffffff" normal` - `4.54:1  AA(need 4.5): PASS`, exit 0

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task. Write the failing tests first against the now-exported `parseColor` and `main`: (a) `parseColor("rgb(999,999,999)")` must throw; (b) `main(["rgb(999,999,999)", "#000"])` must return 2, not 0; (c) a JSON file whose record carries a numeric `fg` must return 2, not crash with a `TypeError`; (d) a genuine AA failure must still return 1. VERIFY-RED: (a) returns `[999,999,999]`, (b) prints `482.97:1 PASS` and returns 0, (c) throws from `pyStrip`.
2. In `parseColor` (`:106`), reject an `rgb()` component outside 0-255 with the same `Error` shape the unrecognised-color branch already uses at `:127`.
3. In `main` (`:173`), validate that each record's `fg` and `bg` are non-empty strings before pushing the pair (`:194`), throwing `ValueError` like the neighbouring unknown-type check at `:191`.
4. Wrap BOTH the `--json` record loop (`:185-195`) and the `parseColor` calls in the print loop (`:209`) in a `try` that catches `ValueError` and colour-parse `Error`, printing the message plus `DOC` and returning 2 - the CLI branch's existing contract at `:197-205`. The `--json` branch is deliberately uncaught today (`:184`) and `:228` is a bare `process.exitCode = main(...)`, so a throw there escapes the function instead of becoming a return code; the catch must cover it or step 1's test (c) cannot pass. Exit 1 then means exactly one thing: a pair failed its AA threshold.
5. VERIFY-GREEN, then update the `Contrast` bullet under `## Final QA` in `pro-designer/SKILL.md`. Its closing clause currently reads "exit 1 means a pair failed the AA threshold for its own type" - true only after this task; state both codes, 1 for an AA failure and 2 for bad input or usage. In the same bullet, make the command template lead with the resolved command rather than a literal `node`, which its own parenthetical already tells the reader to resolve via `check_node.sh`.

### Edge cases
- `#fff` and `#ffffff` shorthand parsing must not regress; the range check applies to the `rgb()` branch only.
- A JSON record with a mistyped key (`foreground` instead of `fg`) hits the same non-empty-string check and returns 2 with a readable message rather than a stack trace.
- A mixed run where one pair fails AA and a later pair is malformed returns 2 - input errors outrank a threshold result.

### Contracts
`parseColor(input) -> [r,g,b]` throws on out-of-range input. `main(argv) -> number` returns 0 clean, 1 AA failure, 2 usage or bad input.

### DoD
The suite is green, and no input produces a contrast ratio above the WCAG ceiling of 21:1 reported as `PASS`.


### Covered criteria
7. `check_contrast.ts` rejects an out-of-range `rgb()` component and a non-string JSON `fg`/`bg` with a usage message and exit 2, reserving exit 1 for a genuine AA failure, and `pro-designer/SKILL.md`'s stated reading of those exit codes matches.
