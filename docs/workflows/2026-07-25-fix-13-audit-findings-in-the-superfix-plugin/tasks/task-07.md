
## Task 7 - fix(superfix): close the SKILL.md phase contracts
- Covers: criteria #12
- TDD: none

### Dependencies
- Task 3 - blocks: Phase 3 documents rank.ts's flags and output semantics
- Task 4 - blocks: Phase 2 must match the scout's pinned path key
- Task 5 - blocks: Phase 4 must supply the verification-worktree path the detective now requires
- Task 6 - blocks: Phase 5 dispatches `superfix:critic`, which must exist first

### Files
- modify - superfix/skills/code-auditor/SKILL.md (`### Phase 0 - Frame`, `### Phase 2 - Score (fan out the scouts, cheap model)`, `### Phase 3 - Gate (drop the noise, build the hotlist)`, `### Phase 4 - Dispatch detectives (frontier model, top-N only)`, `### Phase 5 - Synthesize (verify, dedupe, score, rank)`, `## Subagents this skill drives`)

### Test Commands
*Build*
- none - skills ship as markdown

*Tests*
- `grep -n 'run-id\|--job' superfix/skills/code-auditor/SKILL.md` - expect both flags in the Phase 3 command block
- `grep -n 'superfix:critic' superfix/skills/code-auditor/SKILL.md` - expect hits in both Phase 5 and `## Subagents this skill drives`
- `grep -rn 'verify-only' superfix/` - expect no hits
- run the Phase 3 command block from `SKILL.md` against the `/tmp/sfx-t3` fixtures built in Task 3 (rebuild them from Task 3's fixture bullet if the directory is absent), substituting a real run id and the four fixture paths for the `.temp/code-reviewer/<run-id>/…` placeholders the block hard-codes - expect the generated `hotlist.md` title to carry that run id rather than `# HOTLIST - run`

### Approach
1. In Phase 0, add a step that resolves the target repo path to an absolute root and records it in `job.md`, stating that every later phase addresses files relative to that root.
2. In Phase 2, replace "the file path, the matching signal line" with a single instruction: hand the scout the signal line, and require the returned `path` to be that exact string.
3. In Phase 3, add `--run-id <run-id> --job <job>` to the command block and describe the overflow bucket Task 3 introduces alongside the existing hotlist description.
4. In Phase 4, require the hotspot path to be resolved against the recorded target root before dispatch, and add a unique verification-worktree path to the list of what each detective is given.
5. Rewrite Phase 5 to dispatch `superfix:critic` via the Agent tool with `subagent_type: superfix:critic`, naming what the critic receives and where its verdict goes, and delete the "verify-only mode" wording. Update `## Subagents this skill drives` to list all three agents.

### Edge cases
- A target root equal to the current working directory: the resolution step must be a no-op, never a duplicated prefix.
- Auditing a subdirectory of a larger repo - the case that produced the finding - must work end to end.

### Contracts
`job.md` gains a recorded absolute target-root field. Phase 4 gains a per-detective worktree path. Phase 5 gains a named verifier, a defined input set, and a verdict destination.

### DoD
All four Test Commands pass, and no phase references an agent or a flag that does not exist.


### Covered criteria
12. `SKILL.md` Phase 0 records the resolved target root; Phase 2 hands the scout the signal-line path as the single source of truth; Phase 4 resolves a hotspot path against that root before dispatch; Phase 3 passes `--run-id` and `--job`; Phase 5 dispatches `superfix:critic`.
