
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


### Covered criteria
4. `superbiz/skills/council-this/SKILL.md` exists with frontmatter `name: council-this`, `user-invocable: true`, `argument-hint: "[<decision or question>]"`, `allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)`, and a CSO `description:` in English carrying EN+PL trigger phrases (at minimum "council this", "run the council", "pressure-test this", "debate this", "przedyskutuj to z radą", "zbierz radę", "nie mogę się zdecydować", plus the should-I-X-or-Y-with-real-stakes case) and a "Do NOT use" clause (one-right-answer factual questions, creation tasks, processing/summarize tasks, casual should-I with no meaningful tradeoff); body carries `## Run ID` with the `` !`date +%Y%m%d%H%M%S` `` preload, a `## Workflow` (intake, host-repo context enrichment capped at 2-3 files, at most ONE clarifying AskUserQuestion, slug + language with slug reuse when the decision concerns an existing `docs/business/<slug>/` idea, capture write, dispatch `council-this-chairman` (Skill) with the labeled line `capture: .temp/superbiz/council/capture-<RUN_ID>.md`, relay of the fork's tagged line as a 3-4 sentence summary without re-verifying), a `## Capture file format` fenced block with sections `# Question`, `# Slug`, `# Language`, `# Context files`, `# Constraints`, `# Extra context`, and a closing line stating the artifact is written by the fork, never by this skill.
5. `superbiz/.claude-plugin/plugin.json` `skills[]` has exactly six entries, the two new ones appended after `"./skills/product-phase-roadmap-writer/"` in pair order: `"./skills/council-this/"` then `"./skills/council-this-chairman/"`.
