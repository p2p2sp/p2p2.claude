
## Task 5 - fix(superui): normalise spec heading levels when assembling satellites
- Covers: criteria #9, #10
- TDD: none

### Dependencies
- none

### Files
- modify - superui/scripts/assemble_specs.ts (demoteBodyHeadings, main)
- modify - superui/agents/spec-writer.md (The spec file's machine-readable surface - pin exactly)

### Test Commands
*Build*
- `node superui/scripts/assemble_specs.ts -h` - prints the usage line, exit 0

*Tests*
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-h1 .temp/superui-fix/t5/DESIGN.components.md` - exit 0, `SPECS_OK entries=2`, and `rg -n '^#{1,6} ' .temp/superui-fix/t5/DESIGN.components.md` shows the only `## ` lines are the two slug wrappers with every spec heading below them
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-fence .temp/superui-fix/t5/DESIGN.fence.md` - exit 0, the `## ` line inside the fenced block is unchanged in the output
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-deep .temp/superui-fix/t5/DESIGN.deep.md` - exit 0, an h6 heading in a spec body stays h6 rather than becoming h7
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-h1 /dev/null` - exit 1, `error: self-verify failed` naming the missing wrapper (POSIX only; on Windows use `NUL` as the output path)
- `chmod 000 .temp/superui-fix/t5/specs-locked && node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-locked .temp/superui-fix/t5/out.md` - exit 1, `error: cannot read specs dir` with no `node:fs` stack frames. This must target an existing but unreadable dir: a nonexistent path is already caught by the `statSync` guard and would not exercise the `readdirSync` wrap at all. POSIX only.
- `node superui/scripts/assemble_specs.ts .temp/superui-fix/t5/specs-h1 .temp/superui-fix/t5/nodir/out.md` - exit 1, `error:` naming the unwritable output path, no stack frames

### Approach
1. Rewrite `demoteBodyHeadings` to map every ATX body heading of level `L` to `min(6, max(3, L + 1))`, and to skip lines inside fenced code regions by tracking ``` and ~~~ fence state while scanning line by line. The `max(3, ...)` floor is load-bearing: a plain `L + 1` would turn a body `# Title` into a second `## ` that is not a slug wrapper, recreating the very corruption this task removes. Both h1 and h2 therefore land on h3, h3-h5 shift down one, and h6 stays h6 so nothing becomes h7.
2. Have `demoteBodyHeadings` report whether any h1 was shifted, and in `main` print one non-fatal `warning:` line per spec file whose body carried an h1, naming the file - the run still exits 0.
3. Replace the self-verify's `## `-count check with a check that every expected slug wrapper heading is present in the re-read file, reporting the first missing slug in the existing `error: self-verify failed` message shape.
4. Wrap the `readdirSync` call and the `writeFileSync` call in try/catch blocks that route through `exitErr` so both emit the documented `error: cannot read specs dir '<dir>': <reason>` and `error: cannot write '<path>': <reason>` forms instead of a raw `node:fs` stack.
5. In `spec-writer.md`, pin the heading floor under the machine-readable-surface section: spec bodies start at `##` and never use a single `#`, because the assembler reserves h2 for the slug wrapper.
6. Correct the two now-false claims in `assemble_specs.ts`'s own header comment: that a body `## ` is demoted to `### ` - the rule is now h1 and h2 both to h3, h3-h5 down one, h6 clamped, fenced regions skipped - and that the self-verify asserts a `## `-count equal to the input file count, when it now asserts each slug wrapper is present.

### Edge cases
- An unterminated fenced block runs to end of file; every line after the opening fence stays unmodified.
- A fenced line that looks like a slug wrapper must not satisfy the self-verify: under a presence check the hazard inverts from over-counting to a genuinely missing wrapper reading as present, so the self-verify must skip fenced regions exactly as the demoter does.
- An empty specs dir keeps its current behaviour: the titled "None catalogued." stub at exit 0, with the self-verify expecting zero wrappers.
- A spec file whose body is empty still produces its slug wrapper.

### Contracts
- `demoteBodyHeadings(body: string): { text: string; shiftedH1: boolean }` - the return shape widens from a bare string; `main` is its only caller.
- The satellite's on-disk shape is unchanged: one `## <slug>` wrapper per spec, spec headings ranked strictly below it.

### DoD
All Task 5 test commands produce the stated exit codes and messages, the h1 fixture yields a satellite whose outline nests every spec heading under its own wrapper, and no failure path prints a `node:fs` stack frame.


### Covered criteria
9. A spec body opening with `# Title` assembles into a satellite whose only `## ` headings are the slug wrappers, with the spec's own headings ranked below them, and a `## ` line inside a fenced code block is left unmodified.
10. `assemble_specs.ts` exits 1 with the documented `error:` message shape when a slug wrapper is absent from the written file, when the specs dir is unreadable, and when the output cannot be written.
