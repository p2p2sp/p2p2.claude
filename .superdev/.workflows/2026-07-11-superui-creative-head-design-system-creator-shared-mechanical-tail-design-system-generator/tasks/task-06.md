
## Task 6 - feat(superui): add design-system-creator, the creative head skill
- Covers: criteria #8

### Dependencies
- Task 2, Task 4, Task 5 - blocks: Task 7

### Files
- add - superui/skills/design-system-creator/SKILL.md
- modify - superui/.claude-plugin/plugin.json (skills[] += "./skills/design-system-creator/")
- modify - superui/CLAUDE.md (skills section: creator entry; design-artifacts invariant: three writers now - extractor, completer, creator)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `grep -n 'AskUserQuestion' superui/skills/design-system-creator/SKILL.md` -> no hit
- `grep -n 'design-system-generator' superui/skills/design-system-creator/SKILL.md` -> invocation step with `spec-producer: superui:spec-designer` and `provenance: designed`
- `grep -n 'design-system-extractor' superui/skills/design-system-creator/SKILL.md` -> pixel-perfect routing + collision routing hits

### Approach
1. Frontmatter: `name: design-system-creator`; CSO `description:` - "Designs a NEW framework-agnostic design system from the user's intent and optional inspiration materials - inspiration, never replication. Use when the user describes a product/mood and wants a visual direction or design system created from scratch ('design me a design system', 'projekt od zera z inspiracji'), in any language. Inspiration images are hints only; for pixel-perfect extraction from screenshots use design-system-extractor. Produces the same `.superui/design-system/` artifacts (dtcg.yml, DESIGN.md, tokens.css, specs, HTML sheets), marked with designed provenance and enforced by design-system-guardian afterwards. NOT for styling individual pages/components (pro-designer/guardian handle those)."; `allowed-tools: Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Skill`.
2. Steps: 1 env-check (Task 1 contract) + collision gate - Glob `.superui/design-system/DESIGN.md`; PRESENT -> hard stop, ask the user plainly: full redesign (this run OVERWRITES the whole system wholesale) or abort (gaps in the existing system -> `design-system-completer`; new source screenshots -> `design-system-extractor`); proceed only on explicit "redesign". ABSENT -> `mkdir` `<run>` (`.temp/design-system-creator/<slug>/`) + `<out>` skeleton. 2 interview - prose, ONE question per turn, no forms: product + audience, mood (3-5 adjectives), optional inspiration dir, per-source what to take (palette/type/density/mood) and what to avoid; write `<run>/brief.md`. 3 optional inspiration hints - per image `python <py> "${CLAUDE_PLUGIN_ROOT}/scripts/sample_colors.py" <image> --k 6` into `<run>/inspiration-hints.md`, each palette labeled `hint - mood direction, not canon`. 4 dispatch design-director (brief, hints, template `${CLAUDE_PLUGIN_ROOT}/assets/tokens.template.yaml`, contrast script `${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.py`, run-dir; formats per Task 5). 5 GATE: present the direction to the user - palette (token names + prose), type ramp, mood rationale, inventory list; adjust -> re-dispatch design-director with the user's corrections (loop); approve -> continue. 6 copy the approved inventory proposal to `<out>/inventory.md`; invoke `design-system-generator` (Skill tool, labeled args: `run:`, `out:`, `spec-producer: superui:spec-designer`, `provenance: designed`, `context: <run>/brief.md`). 7 contrast QA - re-run `check_contrast.py` on every CONTRAST-PAIRS entry against the FINAL dtcg.yml values (post-merge renames resolved via the generator's rename report); any failure -> token-composer merge job with corrected values from a re-dispatched design-director scoped to the failing tokens. 8 Present results - artifact paths, counts, NEEDS INPUT items, one line: "system provenance: designed - design-system-guardian now enforces it on every UI task".
3. Ground rules: workers never talk to the user; inspiration values are hints (adopting one verbatim is design-director's explicit `hint-adopted` call); this skill never edits `.superui/design-system/` directly - all writes flow through the generator's single-writer pipeline (the sole exception: copying `inventory.md` into `<out>`, mirroring the extractor's component-scout ownership).

### Edge cases
- User has no inspiration materials -> skip step 3; brief-only design is first-class.
- Inspiration dir contains an unreadable/non-image file -> skip it with a note (sampler exits 1; do not abort the run).
- User rejects the direction twice -> offer to restate the brief (loop to step 2) instead of a third blind re-design.
- Existing system present but user insists on merge -> refuse; explain completer owns gap-filling, offer redesign or abort (decision 5.1).

### Contracts
- Consumes: generator input/return contract (Task 2), design-director/spec-designer contracts (Task 5), env-check contract (Task 1).
- Produces: `.superui/design-system/` full artifact set with root provenance marker (Task 4).

### DoD
SKILL.md complete (frontmatter CSO + 8 steps + ground rules); plugin.json + superui/CLAUDE.md in sync; greps pass.


### Covered criteria
8. `superui/skills/design-system-creator/SKILL.md` exists: CSO-routable + user-invocable; description covers design-from-intent-plus-inspiration in any language and explicitly routes pixel-perfect replication requests to the extractor; body enforces: env-check -> collision gate (`.superui/design-system/DESIGN.md` exists -> hard stop; explicit user choice full-redesign-overwrite vs abort with routing to completer/extractor; never merge) -> prose interview ONE question per turn (no AskUserQuestion; product, audience, mood adjectives, optional inspiration dir, what to take, what to avoid -> `<run>/brief.md`) -> optional `sample_colors.py` pass over inspiration images into `<run>/inspiration-hints.md` labeled as hints-never-canon -> design-director dispatch -> USER GATE on the direction (approve/adjust loop) -> write `<out>/inventory.md` + invoke generator (`spec-producer: superui:spec-designer`, `provenance: designed`) -> contrast QA re-running `check_contrast.py` on the CONTRAST-PAIRS against final token values -> present results.
