
## Task 1 - feat(superbiz): scaffold the plugin manifest and dev-time CLAUDE.md
- Covers: criteria #1, #2
- TDD: none

### Dependencies
- none - blocks: Task 2, Task 3

### Files
- add - superbiz/.claude-plugin/plugin.json (plugin manifest; creates the new superbiz/ directory tree)
- add - superbiz/CLAUDE.md (dev-time orientation, supergh-shaped skeleton)

### Test Commands
#### Build
- none (markdown/JSON repo, no build step)

#### Tests
- `node -e "const m=JSON.parse(require('fs').readFileSync('superbiz/.claude-plugin/plugin.json','utf8')); if(m.version!=='0.28.2'||m.skills.length!==4||m.agents||m.hooks) process.exit(1)"` - expected: exit 0, no output
- `grep -c '"./skills/' superbiz/.claude-plugin/plugin.json` - expected output: `4`

### Approach
1. Write `superbiz/.claude-plugin/plugin.json` cloning `supergh/.claude-plugin/plugin.json` shape exactly: `name` `"superbiz"`, `version` `"0.28.2"`, `description` `"Super Biz ecosystem for Claude Code."`, `author` `{"name": "Dariusz Lenartowicz", "email": "dariusz.lenartowicz@p2p2.com.pl"}`, `skills` `["./skills/business-idea-validator/", "./skills/business-idea-validator-researcher/", "./skills/product-phase-roadmap/", "./skills/product-phase-roadmap-writer/"]`; 2-space indent, trailing newline.
2. Write `superbiz/CLAUDE.md` following the `supergh/CLAUDE.md` skeleton: H1 `# superbiz - the business validation / product roadmap ecosystem`; the standard dev-time blockquote ("not a plugin input... see the root CLAUDE.md"); intro paragraph stating single-domain flat naming, no hooks/no manifest (CSO routing suffices), catalog of record = `plugin.json` `skills[]`; `## Layout (superbiz internals)` fenced tree (`.claude-plugin/plugin.json`, `skills/` with the four skills, references under the two forks); `## Skills (qualified` superbiz:<name> `)` - one bullet per skill: the two entries (interactive front: intake/interview via AskUserQuestion, capture file to `.temp/superbiz/...`, dispatch fork, relay result; validator additionally offers the roadmap chain), the two forks (web research + artifact writing out of context, tagged-line return); `## Architecture invariants (superbiz-specific)` - bullets: no manifest/no hooks rationale; entry-asks/fork-works split (AskUserQuestion is main-session-only, research bulk stays out of the main context); artifact home `docs/business/<idea-slug>/` (`walidacja.md`/`validation.md` + `plan/`), scratch in `.temp/superbiz/`; honesty rule (every number sourced, three-tier fact/estimate/assumption labeling) as the content invariant both forks share; closing line: `superbiz` declares no cross-plugin chains (the validator-to-roadmap chain is in-plugin).
3. Match repo prose style: spaced hyphen ` - `, no em/en dashes, English only.

### Edge cases
- none

### Contracts
- `plugin.json` `skills[]` order = validator entry, validator fork, roadmap entry, roadmap fork (entry before its fork).

### DoD
Both files exist; JSON parses with the exact field order and values above; CLAUDE.md carries all six skeleton sections; test commands pass.


### Covered criteria
1. `superbiz/.claude-plugin/plugin.json` exists, parses as JSON, follows the supergh field order (`name`, `version`, `description`, `author{name,email}`, `skills[]`), has `version` `"0.28.2"`, `description` `"Super Biz ecosystem for Claude Code."`, exactly four `skills[]` entries with trailing slashes (`"./skills/business-idea-validator/"`, `"./skills/business-idea-validator-researcher/"`, `"./skills/product-phase-roadmap/"`, `"./skills/product-phase-roadmap-writer/"`), and no `agents`, `hooks`, or `dependencies` keys.
2. `superbiz/CLAUDE.md` exists with the supergh-shaped skeleton: H1 `# superbiz - ...`, dev-time-orientation blockquote, intro with the no-hooks/no-manifest rationale, `## Layout (superbiz internals)` fenced tree, `## Skills (qualified` superbiz:<name> `)`, `## Architecture invariants (superbiz-specific)`, and a closing cross-plugin-chains statement.
