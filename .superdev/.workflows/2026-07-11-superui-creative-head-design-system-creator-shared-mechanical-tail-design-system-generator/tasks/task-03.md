
## Task 3 - refactor(superui): slim design-system-extractor to the measurement head
- Covers: criteria #4

### Dependencies
- Task 2 - blocks: Task 7

### Files
- modify - superui/skills/design-system-extractor/SKILL.md (steps + allowed-tools)
- modify - superui/CLAUDE.md (extractor entry: head role, step count)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `grep -n 'design-system-generator' superui/skills/design-system-extractor/SKILL.md` -> the Skill invocation step
- `grep -n 'token-composer\|html-visualizer\|design-doc-writer\|spec-writer' superui/skills/design-system-extractor/SKILL.md` -> only the generator-args line naming `spec-producer: superui:spec-writer` (no owned dispatch steps)
- `grep -n 'Bash(cp' superui/skills/design-system-extractor/SKILL.md` -> no hit; `grep -n 'Skill' superui/skills/design-system-extractor/SKILL.md` -> allowed-tools hit

### Approach
1. Renumber the checklist: 1 intake+env-check (Task 1 text), 2 source-map (source-scout), 3 resolve ambiguities, 4 foundations fan-out (sampler/template at `${CLAUDE_PLUGIN_ROOT}` paths), 5 inventory (component-scout) + LIST it to the user, 6 invoke `design-system-generator` via the Skill tool with the labeled block (`run:`, `out:`, `spec-producer: superui:spec-writer`, `provenance: measured`, `source:`, `intake:` when present), 7 fidelity-reviewer fan-out (unchanged scopes; artifacts now exist), 8 Present results (unchanged text incl. completions.md report; add the generator's relayed NEEDS INPUT items).
2. Delete the bodies of former steps 5-8 and 10-13 (now generator-owned); keep every gate that belongs to the head (source-map coverage, colors-notes surface order + accent inventory, inventory shown to user, fidelity PASS).
3. `allowed-tools`: `Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Skill` (drop `Bash(cp:*)`).
4. Update the SKILL.md intro/Scripts section to reflect which scripts the head still runs itself (only `check_python.sh`; sampler is agent-run).

### Edge cases
- Generator returns a failure line (env or gate) -> extractor surfaces it and stops; no fidelity fan-out on missing artifacts.
- Spec-writer NEEDS INPUT markers arrive via the generator's return - extractor carries them into Present results exactly like today.

### Contracts
- Consumes the generator input/return contract from Task 2 (labeled args, verbatim relay).

### DoD
Extractor SKILL.md contains only head steps + one generator invocation; greps pass; CLAUDE.md entry matches.


### Covered criteria
4. Extractor SKILL.md is a measurement head: keeps intake, source-scout, foundation-analyst fan-out, component-scout (+ showing the inventory), fidelity-reviewer fan-out, Present results (incl. the existing completions.md report); its former steps 5-8/10-13 are replaced by ONE Skill invocation of `design-system-generator` with `spec-producer: superui:spec-writer`, `provenance: measured`; `Skill` added to its `allowed-tools`, `cp` dropped.
