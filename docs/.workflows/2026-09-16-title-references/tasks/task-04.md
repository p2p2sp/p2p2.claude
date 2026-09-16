
## Task 4 - Print the phase title as a third column in phases-status.sh
- Covers: `Phase title column` (#5)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none

### Files
- modify - superdev/scripts/phases-status.sh (header comment, the `values` loop, the `# --- report ---` block)
- modify - tests/superdev/phases-status.test.ts (`writePhases`, every `assert.deepEqual` on stdout, two new cases)

### Test Commands
#### Build
- bash -n superdev/scripts/phases-status.sh

#### Tests
- node --test tests/superdev/phases-status.test.ts
- node --test "tests/**/*.test.ts"

### Approach
1. Replace the `sed -n 's/^-[[:space:]]*Dir:...'` reader with one `awk` pass that emits one `<dir-value>\t<title>` line per `- Dir:` line: a `^###[[:space:]]+[0-9]+\.[[:space:]]*` heading sets `title` to the rest of that line (trailing whitespace trimmed, any tab replaced by a space so the column count holds); a `- Dir:` line prints the trimmed value and the current `title`, then clears `title`; no heading since the last `Dir:` prints `-`.
2. Read that output into two parallel arrays (`values`, `titles`) with the existing `count` guard; the `count == 0` exit 3 branch is unchanged.
3. In the report block print `printf '%s\t%s\t%s\n' "$dir" "$status" "$title"` and, for the first non-done phase, `next: <dir>\t<title>`; `next: none` is unchanged.
4. Update the header comment's contract to the three columns and the `-` fallback.
5. In the test: `writePhases` takes an optional per-entry title (default `Phase NN`, matching the current fixture heading); update every expected stdout line to the three columns and `next:` with its title; add a case where a `- Dir:` line has no `###` heading before it (expects `-`) and a case with a heading carrying a multi-word title with trailing spaces, no tab (expects it trimmed).

### Failure modes
- when input is invalid (a `- Dir:` line with no `### NN.` heading before it) -> response: title column `-`, exit 0, log: none, test: the new no-heading case in `phases-status.test.ts`.

### Contracts
- stdout lines `<dir>\t<status>\t<title>` and `next: <dir>\t<title>` | `next: none`; consumed by Task 5.

### DoD
The script prints three columns, the fallback is `-`, the whole suite is green.


### Covered criteria
5. Phase title column - `phases-status.sh` prints `<dir>\t<status>\t<title>` per phase and `next: <dir>\t<title>` (or `next: none`), reading the title from the `### NN. <title>` heading that precedes each `- Dir:` line, `-` when no heading precedes it; the regression suite proves both cases.
