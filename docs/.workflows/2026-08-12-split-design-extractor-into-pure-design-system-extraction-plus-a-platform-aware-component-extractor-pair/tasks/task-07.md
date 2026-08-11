
## Task 7 - refactor(superui): design-extractor extracts only the design system and chains onward
- Covers: criterion #7
- TDD: none

### Dependencies
- Task 2 - blocks: new `render_design_md.ts` CLI the builder calls
- Task 3 - blocks: `--mode design` validation step

### Files
- modify - superui/skills/design-extractor/SKILL.md (description, Ground rules, Steps, Handoff, Final report, new Ending loop, Contracts)
- modify - superui/skills/design-extractor-builder/SKILL.md (Input contract, Ground rules, Steps, Return, Contracts)

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. Head `SKILL.md`: description/output become "DESIGN.md - the pure, platform-neutral design system"; Step 1's `<out>` gate narrows to the `DESIGN.md` FILE (present -> `AskUserQuestion` wipe/abort of that file only; platform subdirs under `<out>` are left untouched with a spoken warning that they become stale after re-extraction); delete Step 4 (inventory) and every `component-scout` mention; Handoff block drops the `inventory:` line; Final report reports `DESIGN.md` only (token counts, proposed counts, findings, NEEDS INPUT) and drops satellite/screens/commit-the-bundle wording in favor of "commit `DESIGN.md`".
2. Add the Ending loop after the Final report: `AskUserQuestion` single-select `web app` / `mobile` / `website` / `finish`; on a platform choice, a second `AskUserQuestion` confirms the screenshots dir (default: this run's source dir; Other = another path); then invoke `component-extractor` (Skill tool) with `<screenshots-dir> <platform> [<target>]` args (platform values: `web-app`, `mobile`, `website`); relay its report verbatim, then re-ask; `finish` ends the skill.
3. Builder `SKILL.md`: drop the `inventory:` input line and steps 1 (inventory guard), 5 (spec-writer), 6 (missing-token re-dispatch - it existed only for spec-writer output), 8 (copy_screens), 9 (assemble_specs), 11 (bundle-reviewer); renumber: 0 env check, 1 foundation fan-out x4, 2 `build_registry.ts`, 3 `render_design_md.ts <run>/registry.json <out>/DESIGN.md --source <source>` (new CLI), 4 design-synthesizer + re-merge/re-render (unchanged logic, cap 2), 5 `validate_bundle.ts <out> <run>/registry.json --mode design` (informational). Re-dispatch convention shrinks to foundation-analyst + design-synthesizer. Return: `DESIGN.md` path, token/textStyle counts, proposed and resolved-versus-standing counts, `FINDING:` lines, `> NEEDS INPUT` items.

### Edge cases
- Ending loop with no `component-extractor` answer possible (user aborts the question) -> treat as `finish`.
- Chained platform run reports its own hard stops (e.g. missing PNGs in the confirmed dir) through the relayed report; the loop still re-asks afterward.
- A `<target>` given to the head is passed through to every chained `component-extractor` call verbatim.

### Contracts
- Head-to-builder labeled block shrinks to: `run`, `out`, `source`, `source-map`, optional `intake`.
- Chain call contract: Skill tool -> `component-extractor` with `<screenshots-dir> <platform> [<target>]`.

### DoD
Both SKILL.md files match the step lists above; no `inventory`/`spec-writer`/`component-scout`/satellite references remain in either; regression suite green.


### Covered criteria
7. `superui/skills/design-extractor/SKILL.md` no longer dispatches component-scout nor mentions satellites/screens as its output, hands off without an `inventory:` line, and ends with an `AskUserQuestion` loop (web app / mobile / website / finish) that confirms a screenshots dir per platform (default: the same dir) and invokes `component-extractor` via the Skill tool; `superui/skills/design-extractor-builder/SKILL.md` drops the inventory guard, spec-writer fan-out, copy/assemble steps and bundle-reviewer, renders via the new `render_design_md.ts` CLI, and validates with `--mode design`.
