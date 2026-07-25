
## Task 7 - docs(superfix): sync the CLAUDE.md files with the two-track pipeline
- Covers: criteria #10
- TDD: none

### Dependencies
- Task 1 - blocks: names the new script.
- Task 2 - blocks: names the new agent.
- Task 3 - blocks: names the new script.
- Task 5 - blocks: describes the pipeline the skill now runs.

### Files
- modify - superfix/CLAUDE.md (`## Layout (superfix internals)`, the ``## Components (qualified `superfix:<name>`)`` section)
- modify - CLAUDE.md (the `superfix` bullet under `## What this repo is`, and the `agents[]` clause under `## Cross-plugin architecture invariants`)

### Test Commands
*Build*
- `grep -c 'edge-scout' superfix/CLAUDE.md CLAUDE.md` - expect at least `1` in each file.

*Tests*
- `grep -c 'collect_edges.sh' superfix/CLAUDE.md` - expect at least `1`.
- `grep -c 'rank_edges.ts' superfix/CLAUDE.md` - expect at least `1`.
- `grep -n 'edge-scout' CLAUDE.md` - expect a hit on the superfix agent enumeration line under the self-documentation invariant.

### Approach
1. In `superfix/CLAUDE.md`, add `collect_edges.sh` and `rank_edges.ts` to the `skills/` line of the layout block and `edge-scout.md` to the `agents/` line.
2. In `superfix/CLAUDE.md`'s components section, describe the `code-auditor` pipeline as two-track - the per-file sweep and gate as today, plus the pair sweep, the `edge-scout` fan-out and the edge gate - and add `edge-scout` to the agent-roles paragraph as cheap-tier contract triage whose `UNCLEAR` verdict is a dispatch reason.
3. Record the plugin-specific invariant that the edge track carries no Opportunity axis, because an axis defined as a property of one file is exactly what the per-file gate already failed to observe.
4. In the root `CLAUDE.md`, add `edge-scout` to the superfix agent enumeration in the self-documentation invariant and extend the `superfix` bullet under `## What this repo is` to say the sweep scores files and pairs.

### Edge cases
- Both files are dev-time only and never reach the skill at runtime; describe the source layout, do not restate agent instructions.
- Keep the root file repo-wide - superfix-specific detail belongs in `superfix/CLAUDE.md` only.

### Contracts
none

### DoD
Both `CLAUDE.md` files name `edge-scout`; `superfix/CLAUDE.md` names both new scripts, describes the two-track pipeline and records the no-Opportunity-axis invariant.


### Covered criteria
10. `superfix/CLAUDE.md` and the root `CLAUDE.md` list `edge-scout` and describe the pipeline as two-track.
