
## Task 7 - docs(superui): document the gap-completion phase in superui/CLAUDE.md
- Covers: criteria #7

### Dependencies
- Task 5 - blocks: documents final names/paths
- Task 6 - blocks: documents the amended routing

### Files
- modify - superui/CLAUDE.md (Skills, Agents, Layout, Architecture invariants, Scripts inventory)
- modify - CLAUDE.md (repo root - the two "eight extraction agents/workers" mentions become stale at ten agents)

### Test Commands
*Build*
- `python3 -c "import json; json.load(open('superui/.claude-plugin/plugin.json'))"` - exit 0 (final catalog sanity)

*Tests*
- Read-through: every new file (skill, 2 agents, script) and both amended invariants appear; no contradiction with the root CLAUDE.md remains

### Approach
1. Skills section: add `design-system-completer` (two-stage gap validation + user-gated synthesis; provenance flag; ledger; sibling-path reuse of extractor scripts/references).
2. Agents section: add `gap-analyst` and `design-synthesizer` with their one-line contracts.
3. Architecture invariants: amend "Design artifacts location"/single-writer wording - extraction AND completion pipelines write under `.superui/design-system/`; `dtcg.yml` still only via `token-composer`; add the provenance canon (`$extensions.org.superui.synthesized`, `**Provenance:**` line, `> SYNTHESIZED:` marker - coordinated vocabulary across token-composer/fidelity-reviewer/html-visualizer, like the dark canon) and the `completions.md` ledger + inventory `## Synthesized` ownership (completer flow, never component-scout).
4. Scripts inventory: add `check_completeness.py` with its one-line CLI contract. Layout tree: add the new skill dir and the two agent files.
5. Root CLAUDE.md: update the superui summary's agent count/wording in "What this repo is" ("dispatching eight extraction agents") and in the self-documentation invariant ("superui's eight extraction workers") to cover the two completion workers; change nothing else at root.

### Edge cases
- none

### Contracts
- none

### DoD
superui/CLAUDE.md fully reflects the shipped state; plugin.json parses; catalog (`skills[]`+`agents[]`), CLAUDE.md and the actual files list identically.


### Covered criteria
7. `superui/CLAUDE.md` documents the new skill, both agents, the script, the ledger, and the amended invariants; `superui/.claude-plugin/plugin.json` parses as valid JSON.
