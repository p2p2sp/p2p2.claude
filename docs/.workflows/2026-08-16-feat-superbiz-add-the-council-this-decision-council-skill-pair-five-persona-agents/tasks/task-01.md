
## Task 1 - feat(superbiz): add the five council persona agents
- Covers: criteria #1, #2
- TDD: none

### Dependencies
- none - blocks: Task 2

### Files
- add - superbiz/agents/council-contrarian.md (creates the new superbiz/agents/ dir)
- add - superbiz/agents/council-first-principles.md
- add - superbiz/agents/council-expansionist.md
- add - superbiz/agents/council-outsider.md
- add - superbiz/agents/council-executor.md
- modify - superbiz/.claude-plugin/plugin.json (new `agents` key)

### Test Commands
#### Build
- none (markdown/JSON repo, no build step)

#### Tests
- `node -e "const m=JSON.parse(require('fs').readFileSync('superbiz/.claude-plugin/plugin.json','utf8')); if(m.version!=='0.28.2'||m.agents.length!==5||m.hooks||m.dependencies) process.exit(1)"` - expected: exit 0, no output
- `grep -c 'model: opus' superbiz/agents/*.md | grep -vc ':1$'; test $? -eq 1` - expected: exit 0 (every agent file carries `model: opus` exactly once)
- `grep -L 'Invoked only by the council-this-chairman skill' superbiz/agents/*.md | wc -l | grep -q '^ *0$'` - expected: exit 0 (guard description in all five)
- `grep -RE '—|–|✅|⚠️|❌' superbiz/agents/; test $? -eq 1` - expected: exit 0

### Approach
1. Write the five agent files, frontmatter identical except `name:`: `name: council-<persona>`, `description: Invoked only by the council-this-chairman skill, never directly.`, `tools: Read, Glob, Grep, WebSearch, WebFetch`, `model: opus`, `effort: high` (shape mirrors `superui/agents/source-scout.md`).
2. Shared body skeleton per `.claude/rules/_skills.md` (input -> work -> output, no caller narrative, bullets, no tables/italics/emoji): H1 `# <Persona name> - <one-line angle>`; `## Input` - the framed question text, optional context file paths to Read, the output language; `## How to think` - the persona-specific bullets below; `## Hard rules` - respond in 150-300 words; no hedging, no balancing - lean fully into the assigned angle, the other angles are out of scope; a quick WebSearch/WebFetch is allowed to ground a claim, and any cited number carries a source or is labeled an estimate; write in the given output language; the final message is the analysis alone, no preamble and no headings.
3. Persona `## How to think` content (rewritten, no attribution): contrarian - hunt the fatal flaw, what is wrong, missing, or will fail; if everything looks solid, dig deeper; not a pessimist - the advisor who stops a bad deal by asking the avoided questions. first-principles - ignore the surface question and ask what is actually being solved; strip assumptions and rebuild from the ground up; concluding "you are asking the wrong question entirely" is a valid answer. expansionist - find the upside everyone else misses; what could be bigger, what adjacent opportunity hides, what is undervalued; risk is out of scope; reason about what happens if this works better than expected. outsider - assume zero context about the asker, their field, or history; respond only to what is literally in front of you; flag jargon and curse-of-knowledge gaps - things obvious to the asker but confusing to everyone else. executor - only feasibility and the fastest path; what do you literally do on Monday morning; if the idea has no clear first step, say so; theory and strategy are out of scope.
4. Edit `superbiz/.claude-plugin/plugin.json`: add an `agents` array after `skills` (mirroring `superui/.claude-plugin/plugin.json`) with the five `./agents/council-<persona>.md` entries in the order contrarian, first-principles, expansionist, outsider, executor; touch nothing else.

### Edge cases
- A context file path in the input does not exist or is unreadable: the agent notes it in one clause and analyzes from the question alone - never blocks.

### Contracts
- Agent input (from the dispatching prompt): framed question verbatim, optional context file paths, output language. The agent file owns the persona rules - the dispatch prompt never restates them.
- Agent output: the 150-300 word analysis as the final message, nothing else.

### DoD
All five agent files exist with the exact frontmatter; plugin.json parses with the five-entry `agents[]`; test commands pass.


### Covered criteria
1. `superbiz/.claude-plugin/plugin.json` gains a new `agents` key (placed after `skills`, mirroring `superui/.claude-plugin/plugin.json`) with exactly five entries in this order: `"./agents/council-contrarian.md"`, `"./agents/council-first-principles.md"`, `"./agents/council-expansionist.md"`, `"./agents/council-outsider.md"`, `"./agents/council-executor.md"`; the file parses as JSON; `version` stays `"0.28.2"`; no `hooks` or `dependencies` keys.
2. The five agent files exist in `superbiz/agents/`, each with frontmatter `name: council-<persona>`, `description: Invoked only by the council-this-chairman skill, never directly.`, `tools: Read, Glob, Grep, WebSearch, WebFetch`, `model: opus`, `effort: high`, and a body carrying: the persona's thinking style, an input section (framed question, optional context file paths, output language), and hard rules (150-300 words, no hedging or balancing, lean fully into the assigned angle, other angles out of scope, any cited number sourced or labeled an estimate, respond in the given language, final message is the analysis alone with no preamble).
