
## Task 9 - docs(superui): register the split pipeline in plugin.json, CLAUDE.md files and README
- Covers: criterion #9
- TDD: none

### Dependencies
- Task 5 - blocks: agent to register
- Task 7 - blocks: described behavior must match the rewritten skills
- Task 8 - blocks: skills to register

### Files
- modify - superui/.claude-plugin/plugin.json (skills[], agents[])
- modify - superui/CLAUDE.md (intro, handoff-bundle section, Layout, Skills, Agents, Scripts inventory)
- modify - CLAUDE.md (superui bullets in "What this repo is" and layout/self-documentation sections)
- modify - README.md (superui usage section)

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. `plugin.json`: append `./skills/component-extractor/` and `./skills/component-extractor-builder/` to `skills[]`; append `./agents/component-synthesizer.md` to `agents[]` (never both lists for one worker; leave `version` untouched - tag-driven).
2. `superui/CLAUDE.md`: six skills, seven agents, the 2+5 dispatch split (design-extractor: source-scout; design-extractor-builder: foundation-analyst, design-synthesizer; component-extractor: source-scout, component-scout; component-extractor-builder: spec-writer, component-synthesizer, bundle-reviewer); rewrite "The handoff bundle" to the two-layer shape (`DESIGN.md` at the target root, per-platform subdirs with satellites + screens); document `parse_design_md.ts` and the changed `render_design_md.ts` / `validate_bundle.ts` CLIs in the Scripts inventory; note component-extractor bundles `references/` (three platform files).
3. Root `CLAUDE.md`: update the superui description bullet (two-stage pipeline, six agents -> seven, component-extractor's routing mode - model-invocable with a guarded description for the chain, a deliberate exception to "user-only command" wording) and the self-documentation agent list.
4. `README.md`: update the superui section - the two commands, the chained flow, platform values, output layout.

### Edge cases
- none (documentation and manifest edits)

### Contracts
- none

### DoD
`plugin.json` parses as JSON and lists 6 skills + 7 agents; the four documents describe the same pipeline the Task 7/8 skills implement; regression suite green.


### Covered criteria
9. `superui/.claude-plugin/plugin.json` lists the two new skills in `skills[]` and `component-synthesizer` in `agents[]`; `superui/CLAUDE.md`, root `CLAUDE.md` and `README.md` describe the new two-stage pipeline.
