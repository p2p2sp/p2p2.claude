
## Task 5 - feat(superui): add design-director and spec-designer agents
- Covers: criteria #5, #6

### Dependencies
- Task 1, Task 4 - blocks: Task 6

### Files
- add - superui/agents/design-director.md
- add - superui/agents/spec-designer.md
- modify - superui/.claude-plugin/plugin.json (agents[] += design-director, spec-designer)
- modify - superui/CLAUDE.md (agents section: two new workers)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `grep -n 'skills:' superui/agents/design-director.md superui/agents/spec-designer.md` -> both preload pro-designer
- `grep -n 'NEEDS INPUT' superui/agents/design-director.md` -> convention present
- `grep -n 'SYNTHESIZED-TOKENS' superui/agents/spec-designer.md` -> block format present

### Approach
1. design-director.md - frontmatter: `name: design-director`, description "Designs the complete visual direction of a NEW design system from a user brief + optional inspiration hints - all four foundation notes files, an inventory proposal and a rationale. Spawn exactly one; design coherence requires a single head.", `tools: Read, Write, Glob, Grep, Bash`, `skills: [superui:pro-designer]` (preloads the doctrine; verify the namespaced id resolves at implementation - fallback to `[pro-designer]`). Body (input->work->output): inputs = brief path, optional inspiration-hints path (hints are mood direction, NEVER values to copy verbatim), template path (`tokens.template.yaml` vocabulary), contrast script path, output run-dir, notes/inventory format contracts. Work order: read doctrine references relevant to the brief; design holistically (palette incl. dark, type ramp, spacing/dimensions, effects/motion) under pro-designer non-negotiables; verify every planned text/surface pair with `python <contrast-script>` and record a `CONTRAST-PAIRS:` section (fg-token, bg-token, type, result) in the colors notes; write `notes-colors.md`, `notes-typography.md`, `notes-dimensions.md`, `notes-effects-motion.md` (per finding: template-vocabulary name, designed value, evidence = one-line design rationale incl. `hint:`/`doctrine:` basis; dark values inline next to light; colors notes additionally carry surface/elevation order + accent-usage plan); write the inventory proposal (component-scout section format; entries in the sanctioned synthesized shape `- <slug> - <Display name> · atomic|composite · synthesized (no canonical screen) · states: <list>`, patterns with `composed of:`); write a short direction rationale file. Hard rules: never talk to the user (`> NEEDS INPUT`), never write outside the run-dir, never lift a sampled inspiration value unchanged without recording it as deliberate (`hint-adopted`).
2. spec-designer.md - frontmatter: `name: spec-designer`, description "Designs ONE component or pattern spec for a design system that has no source screenshots - from the inventory entry, dtcg.yml and the design brief, following the bundled spec template. Values by token NAME only; unmatched values return as SYNTHESIZED-TOKENS. Spawn one per inventory entry, in parallel.", `tools: Read, Write, Glob, Grep`, `skills: [superui:pro-designer]`. Body mirrors design-synthesizer's discipline: inputs = inventory entry, dtcg.yml, spec template ref, example spec, brief path, output spec path; extrapolate from the system's own tokens/scales first, pro-designer doctrine second; spec follows the template with `**Provenance:** designed, not extracted` on the meta line; states designed as FORM + COLOR; every value a token NAME; missing tokens -> `SYNTHESIZED-TOKENS:` block (`- <name> = <value> (evidence: synthesized - <basis>)`); end message = spec path + block (or `SYNTHESIZED-TOKENS: none`). Hard rules: never edit dtcg.yml, one entry only, never talk to the user.
3. Register both in plugin.json agents[] and describe them in superui/CLAUDE.md (agents section).

### Edge cases
- No inspiration provided -> design-director works from brief + doctrine alone (hints input is optional).
- A CONTRAST-PAIRS failure during design -> design-director adjusts values BEFORE writing notes (prevention over correction), never records a failing pair.
- spec-designer needing a token that exists -> alias per design-synthesizer's rule (emit `<value> = {existing.path}`), never duplicate a raw value.

### Contracts
- design-director output feeds token-composer compose (notes) and the creator's inventory write - formats above.
- spec-designer SYNTHESIZED-TOKENS feeds token-composer merge unchanged (existing canon).

### DoD
Both agent files complete with contracts; plugin.json + superui/CLAUDE.md in sync; greps pass.


### Covered criteria
5. `superui/agents/design-director.md` exists: single holistic spawn; frontmatter `skills:` preloads pro-designer; tools `Read, Write, Glob, Grep, Bash`; input = brief path (+ optional inspiration-hints path, template path, contrast-script path, output run-dir); output = the four `notes-<foundation>.md` files honoring foundation-analyst's conventions (per finding: template-vocabulary name + value + rationale-as-evidence; dark values inline next to light; colors notes carry surface/elevation order, accent-usage plan and a `CONTRAST-PAIRS:` section it has verified with `check_contrast.py`) + an inventory proposal in component-scout's format using the sanctioned synthesized entry shape + a direction rationale; never talks to the user (`> NEEDS INPUT` convention).
6. `superui/agents/spec-designer.md` exists: one spawn per inventory entry; designs a spec WITHOUT screenshots from inventory entry + dtcg.yml + brief + spec template/example; frontmatter `skills:` preloads pro-designer; every value a token NAME; unmatched values emitted as a `SYNTHESIZED-TOKENS:` block (design-synthesizer's shape); spec carries `**Provenance:** designed, not extracted`; never edits dtcg.yml.
