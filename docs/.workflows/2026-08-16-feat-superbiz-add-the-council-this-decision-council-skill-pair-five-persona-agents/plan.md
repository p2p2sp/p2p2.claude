# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "feat(superbiz): add the council-this decision-council skill pair + five persona agents"

---
<!-- HEADER -->

## Goal
`superbiz` ships a third entry+fork pair: `council-this` (interactive entry) + `council-this-chairman` (fork), plus the plugin's first five agents in `superbiz/agents/` (`council-contrarian`, `council-first-principles`, `council-expansionist`, `council-outsider`, `council-executor`). The entry frames a user's decision, writes a capture to `.temp/superbiz/council/capture-<RUN_ID>.md` and dispatches the fork; the fork convenes the five persona agents in parallel, synthesizes the chairman verdict itself, writes one overwritable Markdown artifact at `docs/business/<decision-slug>/rada.md` (`council.md` in English) and returns a single tagged line. Catalog and docs (superbiz plugin.json `skills[]` + first-ever `agents[]`, `superbiz/CLAUDE.md`, root `CLAUDE.md`, root `README.md`) all know about the new pair and agents.

## Context
Ported and rewritten from an external "LLM Council" SKILL.md to this repo's invariants. Interview settled: entry+fork per the "entry asks, fork works" invariant, with the five advisors as named agents in `superbiz/agents/` dispatched by the fork via the Agent tool (1.2 + 3.1); the fork itself is the chairman - there is NO peer-review round, the council process is the review of the user's decision (3a.2); one Markdown artifact, overwritten on re-run, no HTML and no timestamped files (2.1); all workers on `model: opus` with `WebSearch` + `WebFetch` available (4.3). No source attribution anywhere. Out of scope: no chaining from `business-idea-validator` / `product-phase-roadmap` into `council-this`, no edits to existing skills, `version` fields and `marketplace.json` untouched.

## Acceptance criteria
1. `superbiz/.claude-plugin/plugin.json` gains a new `agents` key (placed after `skills`, mirroring `superui/.claude-plugin/plugin.json`) with exactly five entries in this order: `"./agents/council-contrarian.md"`, `"./agents/council-first-principles.md"`, `"./agents/council-expansionist.md"`, `"./agents/council-outsider.md"`, `"./agents/council-executor.md"`; the file parses as JSON; `version` stays `"0.28.2"`; no `hooks` or `dependencies` keys.
2. The five agent files exist in `superbiz/agents/`, each with frontmatter `name: council-<persona>`, `description: Invoked only by the council-this-chairman skill, never directly.`, `tools: Read, Glob, Grep, WebSearch, WebFetch`, `model: opus`, `effort: high`, and a body carrying: the persona's thinking style, an input section (framed question, optional context file paths, output language), and hard rules (150-300 words, no hedging or balancing, lean fully into the assigned angle, other angles out of scope, any cited number sourced or labeled an estimate, respond in the given language, final message is the analysis alone with no preamble).
3. `superbiz/skills/council-this-chairman/SKILL.md` exists with frontmatter `name: council-this-chairman`, `description: Invoked only by the council-this skill, never directly.`, `context: fork`, `background: false`, `model: opus`, `effort: high`, `user-invocable: false`, `allowed-tools: Read, Write, Glob, Agent, WebSearch, WebFetch`; body carries: `## Input contract` (single labeled arg `capture: <path>`; unreadable capture returns `ERROR: capture unreadable at <path>` as the single output line), a convene step dispatching all five `superbiz:council-*` agents in ONE message in parallel, a chairman-synthesis section (verdict structure: where the council agrees / where it clashes / the recommendation as a real answer never "it depends" / the one thing to do first; the chairman may side with a minority when its reasoning is strongest), an output section pinning `docs/business/<slug-from-capture>/rada.md` (`council.md` when the capture language is English, analogous translation otherwise; overwrite on regeneration; pure Markdown, acronyms expanded, verdict sections on top and the five verbatim advisor responses below), and `## Output format` returning exactly one line: `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`.
4. `superbiz/skills/council-this/SKILL.md` exists with frontmatter `name: council-this`, `user-invocable: true`, `argument-hint: "[<decision or question>]"`, `allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)`, and a CSO `description:` in English carrying EN+PL trigger phrases (at minimum "council this", "run the council", "pressure-test this", "debate this", "przedyskutuj to z radą", "zbierz radę", "nie mogę się zdecydować", plus the should-I-X-or-Y-with-real-stakes case) and a "Do NOT use" clause (one-right-answer factual questions, creation tasks, processing/summarize tasks, casual should-I with no meaningful tradeoff); body carries `## Run ID` with the `` !`date +%Y%m%d%H%M%S` `` preload, a `## Workflow` (intake, host-repo context enrichment capped at 2-3 files, at most ONE clarifying AskUserQuestion, slug + language with slug reuse when the decision concerns an existing `docs/business/<slug>/` idea, capture write, dispatch `council-this-chairman` (Skill) with the labeled line `capture: .temp/superbiz/council/capture-<RUN_ID>.md`, relay of the fork's tagged line as a 3-4 sentence summary without re-verifying), a `## Capture file format` fenced block with sections `# Question`, `# Slug`, `# Language`, `# Context files`, `# Constraints`, `# Extra context`, and a closing line stating the artifact is written by the fork, never by this skill.
5. `superbiz/.claude-plugin/plugin.json` `skills[]` has exactly six entries, the two new ones appended after `"./skills/product-phase-roadmap-writer/"` in pair order: `"./skills/council-this/"` then `"./skills/council-this-chairman/"`.
6. Hygiene over the whole `superbiz/` tree: zero em/en dashes, zero emoji (the ✅/⚠️/❌ set), zero Markdown table separator lines, zero occurrences of `Karpathy` or any other source-attribution names.
7. `superbiz/CLAUDE.md` is synced: intro says the plugin also turns a framed decision into a council verdict and that the catalog of record is `skills[]` + `agents[]`; the Layout tree shows `agents/` (five files) and the two new skill dirs; `## Skills` gains two bullets (entry: intake, capture path `.temp/superbiz/council/capture-<RUN_ID>.md`, dispatch, relay; fork: convenes the five agents, chairman synthesis, artifact path, tagged return line); a new `## Agents` section lists the five personas as dispatched only by the chairman fork via the Agent tool; invariants update "four skills" to "six skills", the artifact-home bullet adds `rada.md` (`council.md` in English) and `.temp/superbiz/council/`, and the honesty-rule bullet says the research and roadmap forks share the sourced-numbers invariant while the council chairman applies the same tiering to any number its verdict cites.
8. Root `CLAUDE.md` is synced at these anchors: the superbiz bullet in `## What this repo is` (three CSO-routed entry skills, the council pair, the five agents); the "each of its two forks keeps its own `references/`" sentence (now: its researcher and writer forks keep their own `references/`, the chairman fork bundles none, and superbiz now carries plugin-root `agents/`); "superbiz's two entry skills route purely via CSO descriptions" in `## Why five plugins` becomes three; the "`superui` and `superfix` both carry `agents/`" sentence adds superbiz and drops "it ships no agents"; the docs-layer invariant's `docs/business/<idea-slug>/` parenthetical mentions the council verdict; `.temp/superbiz/{validator,roadmap}/capture-<RUN_ID>.md` becomes `.temp/superbiz/{validator,roadmap,council}/capture-<RUN_ID>.md`; the one-injected-manifest invariant's "superbiz's two entry skills route the same way" becomes three; the Self-documentation invariant enumerates superbiz's six skills and states its `agents[]` carries the five council personas.
9. Root `README.md` is synced: line-3 recap says superbiz's three entry skills route via CSO descriptions; the superbiz bullet in the plugin list gains a `council-this` clause (five-advisor council verdict at `docs/business/<decision-slug>/`); the `## Super Biz` section intro says three entry skills, each backed by a fork worker, plus five council persona agents; the skill table gains two rows (`council-this`, `council-this-chairman`).

<!-- /HEADER -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superbiz): add the council-this entry skill
- Covers: criteria #4, #5
- TDD: none

### Dependencies
- Task 2 - blocks: this task (the fork it dispatches must exist)

### Files
- add - superbiz/skills/council-this/SKILL.md (interactive entry)
- modify - superbiz/.claude-plugin/plugin.json (insert `"./skills/council-this/"` before `"./skills/council-this-chairman/"`)

### Test Commands
#### Build
- none

#### Tests
- `node -e "const m=JSON.parse(require('fs').readFileSync('superbiz/.claude-plugin/plugin.json','utf8')); if(m.skills.length!==6||m.skills[4]!=='./skills/council-this/'||m.skills[5]!=='./skills/council-this-chairman/') process.exit(1)"` - expected: exit 0
- `grep -l 'user-invocable: true' superbiz/skills/council-this/SKILL.md` - expected output: the file path
- `grep -c 'capture-<RUN_ID>' superbiz/skills/council-this/SKILL.md` - expected: >= 1
- `grep -RE '—|–|✅|⚠️|❌' superbiz/skills/council-this/; test $? -eq 1` - expected: exit 0

### Approach
1. Write `superbiz/skills/council-this/SKILL.md`, shaped like `superbiz/skills/business-idea-validator/SKILL.md`. Frontmatter: `name: council-this`; `user-invocable: true`; `argument-hint: "[<decision or question>]"`; `allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)`; `description:` - one English CSO paragraph: run a question, idea, or decision with real stakes through a council of five independent advisors who each analyze it from a fundamentally different angle, synthesized into one verdict with a clear recommendation and a single first step; use whenever the user asks to pressure-test a decision, wants multiple perspectives, is torn between options, or presents a genuine tradeoff; triggers: "council this", "run the council", "pressure-test this", "stress-test this", "debate this", "przedyskutuj to z radą", "zbierz radę", "nie mogę się zdecydować", "co byś zrobił na moim miejscu", "should I X or Y" / "czy lepiej X czy Y" when the choice carries real stakes; Do NOT use for questions with one verifiable right answer, factual lookups, creation tasks (write the tweet), processing tasks (summarize the article), or a casual should-I with no meaningful tradeoff.
2. Body: one-paragraph purpose (interactive front: frames the decision, gathers context, hands one capture to the fork, which convenes the council and writes the verdict). `## Run ID` with the `` !`date +%Y%m%d%H%M%S` `` preload and the line "The line above is `<RUN_ID>` - use it verbatim."
3. `## Workflow`, numbered: (1) Intake - extract from the user's message and argument: the core decision, the options on the table, what is at stake, and any constraints (budget, time, resources); frame them as one neutral question, no steering. (2) Context enrichment - Glob/Read at most 2-3 host-repo files that would ground the advice (an existing `docs/business/<slug>/` validation report or plan when the decision concerns that idea, a product doc, a file the user referenced); list the chosen paths for the capture; never spend more than a quick pass. (3) Clarify - if the decision, options, or stakes cannot be framed, ask ONE clarifying question via AskUserQuestion; exactly one, then proceed. (4) Slug and language - when the decision concerns an idea already under `docs/business/<slug>/`, reuse that slug; otherwise derive a kebab-case `<decision-slug>` from the decision; detect the output language from the user's language. (5) Capture - write `.temp/superbiz/council/capture-<RUN_ID>.md` in the format below. (6) Dispatch - invoke `council-this-chairman` (Skill) with a labeled-line args block: `capture: .temp/superbiz/council/capture-<RUN_ID>.md`. (7) Relay - the fork returns exactly one line `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`; relay it as a 3-4 sentence summary - the user should not have to open the file to learn the verdict; do not re-verify or rewrite the verdict.
4. `## Capture file format` fenced block: `# Question` (the framed decision: core question, options, stakes), `# Slug`, `# Language`, `# Context files` (`- <path> - <one-clause why>` lines, or `none`), `# Constraints` (budget, time, resources, or `none`), `# Extra context` (anything else the user settled).
5. Closing line: the verdict the fork writes lands at `docs/business/<decision-slug>/rada.md` (`council.md` when the language is English) - written by the fork, never by this skill.
6. Insert `"./skills/council-this/"` into `skills[]` immediately before `"./skills/council-this-chairman/"`.

### Edge cases
- Question too vague to frame even after the one clarifying question: proceed with the best neutral framing - never a second question round.
- No relevant host-repo context found: `# Context files` is `none`; the council runs on the framed question alone.

### Contracts
- Capture sections: `# Question`, `# Slug`, `# Language`, `# Context files`, `# Constraints`, `# Extra context`.
- Dispatch args block: `capture: .temp/superbiz/council/capture-<RUN_ID>.md`.

### DoD
The SKILL.md exists with the exact frontmatter and workflow; `skills[]` has six entries in the required order; test commands pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - docs: register council-this across superbiz and repo docs
- Covers: criteria #6, #7, #8, #9
- TDD: none

### Dependencies
- Task 3 - blocks: this task (docs describe the finished pair + agents)

### Files
- modify - superbiz/CLAUDE.md (intro, Layout tree, Skills bullets, new `## Agents` section, invariants)
- modify - CLAUDE.md (root - superbiz bullet, forks/references sentence, entry-skill counts, agents/ carriers sentence, docs-layer + .temp invariants, manifest invariant, Self-documentation invariant)
- modify - README.md (line-3 recap, superbiz plugin bullet, `## Super Biz` section intro + two table rows)

### Test Commands
#### Build
- none

#### Tests
- `grep -RE '—|–|✅|⚠️|❌' superbiz/; test $? -eq 1` - expected: exit 0 (whole-tree hygiene sweep)
- `grep -Ri 'karpathy' superbiz/; test $? -eq 1` - expected: exit 0 (no source attribution)
- `grep -RE '^\|.*---' superbiz/; test $? -eq 1` - expected: exit 0 (no Markdown table separators in skill/agent sources)
- `grep -c 'council-this' superbiz/CLAUDE.md` - expected: >= 4
- `grep -c 'council' README.md` - expected: >= 3
- `grep -c '{validator,roadmap,council}' CLAUDE.md` - expected: 1

### Approach
1. `superbiz/CLAUDE.md`: extend the intro paragraph (the plugin also runs a framed decision through a five-advisor council; catalog of record becomes `skills[]` + `agents[]`); add `agents/` (five `council-*.md` files, one line each) and the two new skill dirs to the Layout tree; add two `## Skills` bullets mirroring the existing four (entry: intake + framing, capture to `.temp/superbiz/council/capture-<RUN_ID>.md`, dispatch via Skill, relay; fork: convenes the five persona agents in one parallel dispatch, chairman synthesis in the fork itself, writes `docs/business/<decision-slug>/rada.md` / `council.md`, returns the `COUNCIL:` line); add a `## Agents` section after `## Skills` (five one-line bullets, dispatched only by `council-this-chairman` via the Agent tool, all `model: opus`); update the invariants - "four skills" becomes "six skills" in the no-manifest bullet, the artifact-home bullet gains `rada.md` (`council.md` in English) and `.temp/superbiz/council/`, the honesty-rule bullet is rephrased: the researcher and writer forks share the sourced-numbers invariant, and the council chairman applies the same tiering to any number its verdict cites; the "Both entries are model-invocable" paragraph after the skills list becomes "All three entries".
2. Root `CLAUDE.md`, edits by anchor: the superbiz bullet in `## What this repo is` (lines 75-82) - rewrite to three CSO-routed entry pairs, adding `council-this` + `council-this-chairman` (five persona agents dispatched by the fork, verdict at `docs/business/<decision-slug>/rada.md`); the sentence "`superbiz` likewise ships no scripts and no plugin-root `references/` dir - each of its two forks keeps its own `references/`" (line 93) - now: no scripts and no plugin-root `references/`, the researcher and writer forks keep their own `references/` (the chairman fork bundles none), and it carries plugin-root `agents/` (the five council personas); "superbiz's two entry skills route purely via CSO descriptions, each backed by its own fork worker" (line 117) - two becomes three; "`superui` and `superfix` both carry `agents/`; `superbiz` carries no plugin-root `scripts/`, `references/`, or `agents/` - it ships no agents..." (line 163) - superui, superfix and superbiz carry `agents/`; superbiz still has no plugin-root `scripts/` or `references/`; the `docs/business/<idea-slug>/` parenthetical in the docs-layer invariant (lines 194-196) - add that `council-this-chairman` writes the council verdict there; `.temp/superbiz/{validator,roadmap}/capture-<RUN_ID>.md` (line 203) - add `council`; "superbiz's two entry skills route the same way, each with its own fork worker behind it" (line 213) - two becomes three; the Self-documentation invariant (lines 261-263) - superbiz's six skills enumerated (add `council-this` / `council-this-chairman`) and "it ships no `agents[]`" becomes: its `agents[]` carries the five council persona agents (dispatched by the chairman fork).
3. Root `README.md`: line 3 - "superbiz's two entry skills route via CSO descriptions, each backed by an internal fork worker" becomes three; the superbiz bullet (line 9) - append a `council-this` clause (runs a decision through a council of five advisor agents, chairman verdict written by its fork to `docs/business/<decision-slug>/`); `## Super Biz` intro (line 96) - "the two entry skills" becomes "the three entry skills route via their CSO `description:`, each backed by a fork worker; the council fork additionally dispatches five persona agents"; append two table rows: `council-this` (interactive entry - frames the decision and its stakes with the user, then hands one capture file to its fork worker) and `council-this-chairman` (fork - convenes the five council persona agents in parallel and writes the chairman verdict to `docs/business/<decision-slug>/`).
4. Repo prose style throughout: spaced ` - `, no em/en dashes, English only; README tables are allowed (the skill-source table ban does not apply to README.md).

### Edge cases
- none

### Contracts
- none

### DoD
All three docs updated at every listed anchor; hygiene sweeps over `superbiz/` pass; test commands pass.

<!-- /TASK -->
