
## Task 5 - feat(superfix): run the edge track in the code-auditor pipeline
- Covers: criteria #6, #7
- TDD: none

### Dependencies
- Task 1 - blocks: the Phase 1 edge sweep command.
- Task 2 - blocks: the Phase 2 edge-scout fan-out.
- Task 3 - blocks: the Phase 3 edge gate command and the `degree[]` budget source.

### Files
- modify - superfix/skills/code-auditor/SKILL.md (`### Phase 0 - Frame`, `### Phase 1 - Sweep (cheap signal collection)`, `### Phase 2 - Score (fan out the scouts, cheap model)`, `### Phase 3 - Gate (drop the noise, build the hotlist)`, `### Phase 4 - Dispatch detectives (frontier model, top-N only)`, `## Output the user sees`, `## Subagents this skill drives`)

### Test Commands
*Build*
- `head -7 superfix/skills/code-auditor/SKILL.md` - expect the frontmatter block unchanged.

*Tests*
- `grep -c 'collect_edges.sh' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.
- `grep -c 'rank_edges.ts' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.
- `grep -c 'edge-scout' superfix/skills/code-auditor/SKILL.md` - expect at least `2`.
- `! grep -q 'tens at a time is normal' superfix/skills/code-auditor/SKILL.md` - expect exit 0, i.e. the claim is gone.
- `grep -c '16 concurrent' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.
- `grep -c 'with-dependents' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.
- `grep -c 'degree' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.

### Approach
1. Phase 0 - extend the `mkdir -p` workspace line so it also creates `worktrees`, and state that the run sweeps two units, files and pairs.
2. Phase 1 - add `--with-dependents` to the existing `collect_signals.sh` invocation so the `dependents` prior `scoring.md` already tells scouts to use stops being `-1`, and add a second command block running `collect_edges.sh <repo-root> --max-fanout 8 > .temp/code-reviewer/<run-id>/signals/edges.jsonl`.
3. Phase 2 - after the existing scout instructions, add the edge fan-out: one `edge-scout` (`subagent_type: superfix:edge-scout`) per edge record or small batch, given the record and `job.md`, appending each verdict line to `.temp/code-reviewer/<run-id>/scores/edge_scores.jsonl`; state that `UNCLEAR` is the correct verdict when the cheap tier cannot settle the pair and that it is a dispatch reason, not a rejection.
4. Phase 2 and Phase 4 - replace "Launch them in parallel; tens at a time is normal" with the real ceiling of at most 16 concurrent subagents and successive waves beyond that, and make Phase 4's "Run in waves if the tier has concurrency limits" name the same number.
5. Phase 3 - add the `rank_edges.ts` command block writing `hotlist/edges.json` and `hotlist/edges.md`, and state that both hotlists are shown to the user before frontier spend.
6. Phase 4 - define the dispatch set as the union of `hotlist.json` `hotspots`, `edges.json` `dispatch`, and the top 2 rows of `edges.json` `degree[]` not already in that union; state the degree budget as a rule in this phase's prose, not as a flag on any script. An edge dispatch gives the detective both endpoints as entry points; a degree-slot dispatch states in the brief that the file was selected by graph degree rather than by score.
7. Update `## Output the user sees` to list `edges.md` alongside `hotlist.md`, and add `superfix:edge-scout` to `## Subagents this skill drives`.

### Edge cases
- Empty `edges.jsonl` - the edge track contributes nothing and the run proceeds on the file track alone; do not treat it as an error.
- `degenerate: true` in `hotlist.json` - report it to the user in the closing summary rather than reporting zero hotspots as a clean result.
- A file appearing in both the file hotlist and an edge dispatch row - dispatch one detective, not two, with the edge as the richer entry.
- A degree-slot file already covered by the union - skip it and take the next row, so the budget is never spent twice on one file.
- `--with-dependents` costs O(n) `git grep` calls on top of the sweep; note the cost next to the flag so a very large target can drop it deliberately.

### Contracts
Consumes `edges.jsonl` (Task 1), the edge verdict record (Task 2), and `edges.json` (Task 3). Produces `.temp/code-reviewer/<run-id>/scores/edge_scores.jsonl` and the dispatch set feeding Phase 4.

### DoD
`SKILL.md` names `collect_edges.sh`, `edge-scout` and `rank_edges.ts` in the phases above, carries the union dispatch rule and the degree budget, contains no "tens at a time" claim, and states the 16-concurrent ceiling.


### Covered criteria
6. `SKILL.md` runs the edge track unconditionally alongside the file track and dispatches detectives to the union of file hotspots, edge dispatch rows, and a degree budget of 2 highest-degree files from `edges.json` `degree[]` that are not already in that union. The degree budget is a `SKILL.md`-level rule read off `degree[]`, not a script flag.
7. `SKILL.md` states the real concurrency ceiling of 16 concurrent subagents instead of "tens at a time is normal", for both waves.
