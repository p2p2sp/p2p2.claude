
## Task 5 - docs(superui): record dark verification in the dark-mode canon
- Covers: criteria #10, #11

### Dependencies
- Task 1, Task 2, Task 3, Task 4 - blocks: nothing

### Files
- modify - superui/CLAUDE.md ("Dark-mode canon" invariant)

### Test Commands
*Build*
- none

*Tests*
- `grep -n -A 20 "Dark-mode canon" superui/CLAUDE.md` - expect the verification sentence present
- `git log -1 --format=%s -- superui/.claude-plugin/plugin.json` - expect a subject predating this
  plan (NOT one of Task 1-4's commit subjects). A working-tree `git diff` is vacuous here:
  `simplebuild` commits per task, so by Task 5 the tree is clean either way.
- `git log -1 --format=%s -- superui/scripts/ superui/assets/` - same expectation
- `git log -1 --format=%s -- superui/agents/spec-writer.md superui/agents/spec-designer.md` - same expectation (specs stay light-only; a blanket `superui/agents/` check is impossible because Tasks 2 and 4 legitimately modify `design-director.md` and `fidelity-reviewer.md`)

### Approach
1. Extend the "Dark-mode canon" invariant with the verification half: dark is checked by two
   contrast runs (auditor pre-pass and creator step 7, one pair file per theme) and by a
   conditional dark fidelity scope in the extractor.
2. Note that the creative head gates dark coverage on the brief, so an unrequested dark theme is
   never fabricated.
3. Keep the existing canon text (the `$extensions.org.superui.dark` literal, the whole-page toggle,
   the `sheet.template.html` / `build_index.py` duplication warning) verbatim - this is an addition,
   not a rewrite.
4. Verify the untouched surfaces with the three `git log -1` commands above.

### Edge cases
- none

### Contracts
- none

### DoD
The canon documents dark verification; `plugin.json`, the Python scripts, the doc-chrome assets, and
the two spec-producing agents (`spec-writer.md`, `spec-designer.md`) carry no commit from this plan.


### Covered criteria
10. `superui/CLAUDE.md` "Dark-mode canon" states that dark is verified: two contrast runs and a
    conditional dark fidelity scope.
11. `superui/.claude-plugin/plugin.json` is byte-identical to its pre-change state, and no Python
    script, doc-chrome asset, or spec-producing agent is modified.
