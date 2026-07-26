
## Task 6 - feat(superfix): add the critic agent and its verdict schema
- Covers: criteria #11
- TDD: none

### Dependencies
- Task 5 - blocks: both tasks edit `references/synthesis.md`; the recipe rewrite lands first

### Files
- add - superfix/agents/critic.md (new agent prompt)
- modify - superfix/.claude-plugin/plugin.json (`agents`)
- modify - superfix/skills/code-auditor/references/synthesis.md (new verdict-schema section)
- modify - superfix/CLAUDE.md (`## Layout (superfix internals)`, `## Components (qualified superfix:<name>)`)
- modify - CLAUDE.md (the self-documentation invariant line naming superfix's `scout` / `detective`)

### Test Commands
*Build*
- none - agents and manifests ship as source

*Tests*
- `node -e "const m=JSON.parse(require('fs').readFileSync('superfix/.claude-plugin/plugin.json','utf8')); if(!m.agents.includes('./agents/critic.md')) throw new Error('missing from agents[]'); if(JSON.stringify(m.skills).includes('critic')) throw new Error('leaked into skills[]')"` - expect exit 0
- `grep -n 'critic' superfix/CLAUDE.md CLAUDE.md` - expect the agent named in both orientation files
- `grep -n 'VERIFIED\|REFUTED\|PARTIALLY VERIFIED\|INCONCLUSIVE' superfix/skills/code-auditor/references/synthesis.md` - expect all four verdict values in the schema
- `grep -n '^tools:\|^model:\|^name:' superfix/agents/critic.md` - expect `name: critic`, `model: opus`, and `tools: Read, Grep, Glob, Bash`

### Approach
1. Write `agents/critic.md` with `name: critic`, `model: opus`, a routing-guard `description:` in the house style used by `scout.md` and `detective.md` ("Invoked only by the code-auditor skill, never directly"), and `tools: Read, Grep, Glob, Bash`. Its body takes one claim plus the report path, replays it on a fresh worktree at the caller-supplied path using the recipe Task 5 fixed, and returns a tagged verdict in its final message.
2. State its inputs (the claim, the report path, `job.md`, the verification-worktree path) and its output as hard rules: one `VERDICT: VERIFIED | REFUTED | PARTIALLY VERIFIED | INCONCLUSIVE` line, the command run, the observed output, and a severity judgement. `INCONCLUSIVE` is the required value when no oracle can settle the claim. Forbid writing any file, including the report path it was given.
3. Add `"./agents/critic.md"` to `agents[]` in `superfix/.claude-plugin/plugin.json`.
4. Add a verdict-schema section to `references/synthesis.md` defining that tagged shape and how the orchestrator folds each of the four values into `findings.md`: VERIFIED keeps the finding as filed, PARTIALLY VERIFIED keeps only the sub-claims that survived and lowers the severity, REFUTED drops the finding, INCONCLUSIVE keeps it with confidence lowered and the missing oracle named.
5. Update `superfix/CLAUDE.md`'s layout tree and component inventory to list three agents, and update the root `CLAUDE.md` line enumerating superfix's agents, per the repo's self-documentation invariant.

### Edge cases
- A claim with no available oracle resolves to `INCONCLUSIVE`, never to an invented verdict.
- The critic must appear in `agents[]` only - agents and skills are disjoint catalogs.

### Contracts
New agent `superfix:critic`, dispatched via the Agent tool with `subagent_type: superfix:critic`. Its verdict is a tagged final message, not a file, so parallel critics have no shared-write hazard.

### DoD
All four Test Commands pass, and `plugin.json` `agents[]`, the `agents/` directory listing, and both `CLAUDE.md` files agree on exactly three agents.


### Covered criteria
11. `agents/critic.md` exists, is listed in `.claude-plugin/plugin.json` `agents[]` and not in `skills[]`, has a verdict schema in `references/synthesis.md` covering every verdict value it can return, and is named in both `superfix/CLAUDE.md` and the root `CLAUDE.md`.
