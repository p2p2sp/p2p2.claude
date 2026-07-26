
## Task 4 - fix(superfix): make the scout read-only and pin its path key
- Covers: criteria #9
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/scout.md (frontmatter `tools:`, `## Output - strict, one line, JSON only, no prose`, `## Hard rules`)

### Test Commands
*Build*
- none - agent prompts ship as markdown

*Tests*
- `grep -n '^tools:' superfix/agents/scout.md` - expect `Read, Grep, Glob` with no `Write` and no `Bash`
- `grep -n 'verbatim' superfix/agents/scout.md` - expect the path-key rule present in the output section
- `sed -n '/## Hard rules/,$p' superfix/agents/scout.md | grep -n 'no prose'` - expect the output-format rule to appear inside `## Hard rules`
- `grep -c 'appends your line' superfix/agents/scout.md` - expect the printed count to be `0`

### Approach
1. Narrow the frontmatter to `tools: Read, Grep, Glob`, removing the write-capable and shell tools that contradict the body's read-only rule.
2. In the output section, state that `path` MUST be echoed byte-identically from the signal line the scout was given, that it is the join key against `signals.jsonl`, and that it must never be a path the scout resolved itself.
3. Move the "one line, JSON only, no prose, no preamble, no markdown" rule into `## Hard rules` as its final entry, so it is the last instruction the model reads.
4. Replace the sentence stating that the orchestrator appends the line to `scores.jsonl` with an explicit "return the line(s) in your final message; write nothing", and broaden the cost brake so it covers any deep analysis rather than only exploit reasoning.

### Edge cases
- A scout that cannot open the file it was given must still emit the 1/1 "unreadable" verdict, using the given path string unchanged.
- Batch mode (several paths in one call) must keep one JSON line per file.

### Contracts
Scout output stays `{"path","impact","opportunity","impact_reason","opportunity_reason"}`, with `path` now defined as the verbatim signal-line path and the return route fixed to the final message.

### DoD
All four Test Commands pass, and `agents/scout.md` contains no instruction implying that the scout writes a file.


### Covered criteria
9. `agents/scout.md` declares no write-capable tool; its output section states that `path` must be echoed byte-identically from the signal line; and its JSON-only rule sits in `## Hard rules` with the return route stated as the final message.
