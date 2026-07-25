
## Task 2 - feat(superfix): add the edge-scout agent
- Covers: criteria #3
- TDD: none

### Dependencies
- Task 1 - blocks: the agent's input is the edge record shape it defines.

### Files
- add - superfix/agents/edge-scout.md (frontmatter `name`/`description`/`model`/`tools`, `## Inputs you are given`, `## What to do`, `## Output`, `## Hard rules`)
- modify - superfix/.claude-plugin/plugin.json (`agents[]`)

### Test Commands
*Build*
- `node -e "JSON.parse(require('fs').readFileSync('superfix/.claude-plugin/plugin.json','utf8')); console.log('ok')"` - expect `ok`.

*Tests*
- `grep -c 'edge-scout' superfix/.claude-plugin/plugin.json` - expect `1`.
- `head -6 superfix/agents/edge-scout.md` - expect frontmatter with `model: haiku` and `tools: Read, Grep, Glob`.

### Approach
1. Write `superfix/agents/edge-scout.md` mirroring `superfix/agents/scout.md`'s shape: `model: haiku`, `tools: Read, Grep, Glob`, `description` carrying the routing guard "Invoked only by the code-auditor skill, never directly."
2. State the inputs: one edge record (`a`, `b`, `via`, `shared`) and the run's `job.md`; state the single question - does the shape one end writes match the shape the other end reads, with `via` as the thing that crosses between them.
3. Specify the output as one strict-JSON line, `{"a":"<path>","b":"<path>","verdict":"MATCH|MISMATCH|UNCLEAR","reason":"<=20 words"}`, with `a` and `b` echoed byte-identical to the input record because they are the join key; for a batch of records emit one such line per pair, matching the batch clause in `superfix/agents/scout.md`.
4. Write the anti-degeneracy rule as a hard rule: `MATCH` requires positively confirming both sides agree; not having read enough to confirm is `UNCLEAR`, never `MATCH`; deep tracing means stop and return `UNCLEAR` because that is the detective's job.
5. Add `"./agents/edge-scout.md"` to `agents[]` in `superfix/.claude-plugin/plugin.json`.

### Edge cases
- One or both endpoints unreadable - `UNCLEAR` with reason `"unreadable"`; never fabricate a verdict.
- Endpoints that turn out not to share a real contract (the literal was coincidental) - `MATCH` with the reason naming the coincidence, so `rank_edges.ts` filters it out.
- No file writes: the agent has no `Write` or `Bash` tool, matching `scout.md`.

### Contracts
Introduces the edge verdict record, one per line in the agent's final message:
`{"a":"<path>","b":"<path>","verdict":"MATCH|MISMATCH|UNCLEAR","reason":"<text>"}`. Consumed by `rank_edges.ts` (Task 3) after the skill appends it to `scores/edge_scores.jsonl`.

### DoD
`plugin.json` parses and lists `./agents/edge-scout.md`; the agent file exists with the frontmatter above and states the `MATCH`-requires-confirmation rule.


### Covered criteria
3. A new `edge-scout` agent returns one strict-JSON line per pair carrying `verdict` of exactly `MATCH`, `MISMATCH` or `UNCLEAR`, echoes `a`/`b` byte-identical, and is registered in `superfix/.claude-plugin/plugin.json` `agents[]`.
