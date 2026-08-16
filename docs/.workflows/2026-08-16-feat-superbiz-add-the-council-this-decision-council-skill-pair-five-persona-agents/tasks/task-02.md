
## Task 2 - feat(superbiz): add the council-this-chairman fork worker
- Covers: criteria #3
- TDD: none

### Dependencies
- Task 1 - blocks: this task (the agent names it dispatches must exist)

### Files
- add - superbiz/skills/council-this-chairman/SKILL.md (fork worker)
- modify - superbiz/.claude-plugin/plugin.json (append `"./skills/council-this-chairman/"` to `skills[]`)

### Test Commands
#### Build
- none

#### Tests
- `grep -l 'context: fork' superbiz/skills/council-this-chairman/SKILL.md` - expected output: the file path
- `grep -c 'COUNCIL: ' superbiz/skills/council-this-chairman/SKILL.md` - expected: >= 1
- `node -e "const m=JSON.parse(require('fs').readFileSync('superbiz/.claude-plugin/plugin.json','utf8')); if(!m.skills.includes('./skills/council-this-chairman/')) process.exit(1)"` - expected: exit 0
- `grep -RE '—|–|✅|⚠️|❌' superbiz/skills/council-this-chairman/; test $? -eq 1` - expected: exit 0

### Approach
1. Write `superbiz/skills/council-this-chairman/SKILL.md`. Frontmatter: `name: council-this-chairman`, `description: Invoked only by the council-this skill, never directly.`, `context: fork`, `background: false`, `model: opus`, `effort: high`, `user-invocable: false`, `allowed-tools: Read, Write, Glob, Agent, WebSearch, WebFetch` (`Agent` per the `design-extractor-builder` precedent; no Bash - the fork needs no RUN_ID and no shell).
2. Body, shaped like `product-phase-roadmap-writer` (`# Input contract` first, `## Output format` last, no caller narrative): H1 + one-paragraph purpose (convene five advisors on a framed decision, synthesize the chairman verdict, write one artifact). `## Input contract`: single labeled arg `capture: <path>`; Read it first; the capture is the complete decision record - never ask the user anything; capture missing or unreadable -> return `ERROR: capture unreadable at <path>` as the single output line.
3. `## Convene the council`: dispatch ALL five agents in ONE message in parallel (never sequentially - earlier answers must not bleed into later ones) via the Agent tool, `subagent_type` `superbiz:council-contrarian`, `superbiz:council-first-principles`, `superbiz:council-expansionist`, `superbiz:council-outsider`, `superbiz:council-executor`; each prompt passes the capture's `# Question` verbatim, the `# Context files` paths, and the `# Language` - nothing else (the agent files own the persona rules). Keep every response verbatim for the artifact - never trim or paraphrase an advisor.
4. `## Chairman synthesis`: the fork itself is the chairman - no further agents. Verdict structure: where the council agrees (points multiple advisors converged on independently - high-confidence signals); where the council clashes (genuine disagreements, both sides presented, never smoothed over); the recommendation (a real answer with reasoning, never "it depends"; the chairman may side with a minority advisor when that reasoning is strongest); the one thing to do first (a single concrete step, never a list). Honesty rule: any number the verdict cites keeps its advisor's source or is labeled an estimate - never presented as more certain than it is.
5. `## Output`: write `docs/business/<slug-from-capture>/rada.md` when the capture `# Language` is Polish, `council.md` for English, analogous filename translation otherwise (create directories as needed via Write); overwrite an existing file - a re-convened council supersedes the old verdict, no versioned copies. Document layout, all headings translated to the output language: H1 with the decision title; the framed question; the four verdict sections; then one section per advisor with its verbatim response under the persona's translated name. Pure Markdown - no citation tags or XML; expand every acronym on first use.
6. `## Output format`: return exactly one line - the only output channel (no prose, no diffs): `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`.
7. Append `"./skills/council-this-chairman/"` to `skills[]` after `"./skills/product-phase-roadmap-writer/"`.

### Edge cases
- Capture missing or unreadable: return `ERROR: capture unreadable at <path>` as the single output line.
- One advisor returns nothing or fails: re-dispatch that single advisor once; if it fails again, synthesize from the responses on hand and state the missing angle in the verdict's clash section.
- `docs/business/<slug>/` already carries a previous council file: overwrite it.

### Contracts
- Entry-to-fork args block: `capture: <path>` (single labeled line; value is a PATH, never inlined content).
- Fork return line: `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`.
- Fork-to-agent prompt: framed question verbatim + context file paths + output language.

### DoD
The SKILL.md exists with the exact frontmatter and all five body sections; plugin.json lists the fork; test commands pass.


### Covered criteria
3. `superbiz/skills/council-this-chairman/SKILL.md` exists with frontmatter `name: council-this-chairman`, `description: Invoked only by the council-this skill, never directly.`, `context: fork`, `background: false`, `model: opus`, `effort: high`, `user-invocable: false`, `allowed-tools: Read, Write, Glob, Agent, WebSearch, WebFetch`; body carries: `## Input contract` (single labeled arg `capture: <path>`; unreadable capture returns `ERROR: capture unreadable at <path>` as the single output line), a convene step dispatching all five `superbiz:council-*` agents in ONE message in parallel, a chairman-synthesis section (verdict structure: where the council agrees / where it clashes / the recommendation as a real answer never "it depends" / the one thing to do first; the chairman may side with a minority when its reasoning is strongest), an output section pinning `docs/business/<slug-from-capture>/rada.md` (`council.md` when the capture language is English, analogous translation otherwise; overwrite on regeneration; pure Markdown, acronyms expanded, verdict sections on top and the five verbatim advisor responses below), and `## Output format` returning exactly one line: `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`.
