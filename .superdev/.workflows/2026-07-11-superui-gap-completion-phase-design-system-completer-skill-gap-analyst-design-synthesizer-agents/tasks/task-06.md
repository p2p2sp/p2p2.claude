
## Task 6 - feat(superui): route design gaps to completer in guardian and extractor
- Covers: criteria #5

### Dependencies
- Task 5 - blocks: routes to the skill by its final name

### Files
- modify - superui/skills/design-system-guardian/SKILL.md (Absolutes + Gaps sections)
- modify - superui/skills/design-system-extractor/SKILL.md (Present results step)

### Test Commands
*Build*
- none (markdown only)

*Tests*
- `grep -c "design-system-completer" superui/skills/design-system-guardian/SKILL.md` - ≥ 2
- `grep -c "completions.md" superui/skills/design-system-extractor/SKILL.md` - ≥ 1

### Approach
1. guardian Absolutes: rewrite the writes-there absolute - "NEVER edit anything under `.superui/design-system/` - this skill reads and enforces; only the extraction and completion pipelines (`design-system-extractor`, `design-system-completer`) write there."
2. guardian Gaps: replace the single-pointer bullet with dual routing - a gap the source screenshots COULD show (present but unmeasured) → `design-system-extractor`; a gap the source never contained (missing state, dark coverage, token role, unshown component) → `design-system-completer`, which designs it with marked provenance on the user's approval. Keep the `design-system-gap:` code-comment convention and the proceed-only-on-explicit-call rule unchanged.
3. extractor "Present results": add one line - when `<out>/completions.md` exists, report that this re-extraction regenerated the artifacts wholesale and previous syntheses were overwritten; suggest running `design-system-completer` to re-validate and re-apply them.

### Edge cases
- none

### Contracts
- consumes: the skill name `design-system-completer` and the `<out>/completions.md` ledger location (Task 5).

### DoD
Both files updated; guardian remains read-only towards `.superui/design-system/`; no other guardian rules altered.


### Covered criteria
5. `superui/skills/design-system-guardian/SKILL.md` routes gaps dually (measurable-from-source → extractor; absent-from-source → completer) and its writes-there absolute names both pipelines; `superui/skills/design-system-extractor/SKILL.md` "Present results" reports overwritten syntheses when `<out>/completions.md` exists.
