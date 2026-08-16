# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "feat: add superbiz as the fifth plugin (business validation + phased roadmap)"

---
<!-- HEADER -->

## Goal
The repo ships a fifth self-contained plugin `superbiz/` (no hooks, no manifest, no agents, no scripts) with four skills: `business-idea-validator` (entry) + `business-idea-validator-researcher` (fork), `product-phase-roadmap` (entry) + `product-phase-roadmap-writer` (fork). Content is ported from the user's private web skills at `/Users/dario/.claude/skills/business-idea-validator/` and `/Users/dario/.claude/skills/product-phase-roadmap/`, adapted to Claude Code only and to `.claude/rules/_skills.md`. The catalog/install layer (marketplace, README, root CLAUDE.md), `release.sh`, and the release test suite all know about the fifth plugin, and the full test suite passes.

## Context
User has two proven personal skills in web Claude and wants them shipped as a marketplace plugin. Interview settled: cut the Claude.ai track entirely (1.1); keep dense reasoning prose but remove hard `_skills.md` violations - tables, emoji, italics, em/en dashes (2.2); split each skill into a small interactive entry plus a fork worker that does web research and file writing out of the main context (3.1); persisted artifacts land at `docs/business/<idea-slug>/` in the host repo (4.2); both entries are model-invocable via CSO description and user-invocable, and the validator offers chaining the roadmap after delivering its report (5.1). Out of scope: changes to the other four plugins, commit/push/publishing, deleting the private skills in `~/.claude/skills/`.

## Acceptance criteria
1. `superbiz/.claude-plugin/plugin.json` exists, parses as JSON, follows the supergh field order (`name`, `version`, `description`, `author{name,email}`, `skills[]`), has `version` `"0.28.2"`, `description` `"Super Biz ecosystem for Claude Code."`, exactly four `skills[]` entries with trailing slashes (`"./skills/business-idea-validator/"`, `"./skills/business-idea-validator-researcher/"`, `"./skills/product-phase-roadmap/"`, `"./skills/product-phase-roadmap-writer/"`), and no `agents`, `hooks`, or `dependencies` keys.
2. `superbiz/CLAUDE.md` exists with the supergh-shaped skeleton: H1 `# superbiz - ...`, dev-time-orientation blockquote, intro with the no-hooks/no-manifest rationale, `## Layout (superbiz internals)` fenced tree, `## Skills (qualified` superbiz:<name> `)`, `## Architecture invariants (superbiz-specific)`, and a closing cross-plugin-chains statement.
3. The two entry SKILL.md files carry `user-invocable: true`, NO `disable-model-invocation`, descriptions ported near-1:1 from the sources (Polish trigger phrases included) with a strengthened "Do NOT use" guard, and `allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)`.
4. The two fork SKILL.md files carry `context: fork`, `background: false`, `user-invocable: false`, a description guard `Invoked only by the <entry> skill, never directly.`, `WebSearch` and `WebFetch` in `allowed-tools`; researcher has `model: opus` + `effort: high`, writer has `model: sonnet` + `effort: high`.
5. The three references files are ported: `superbiz/skills/business-idea-validator-researcher/references/frameworks.md` and `references/report-template.md`, and `superbiz/skills/product-phase-roadmap-writer/references/phase-blueprint.md`; skill bodies reference them as relative `references/<file>.md`.
6. `grep -R` over `superbiz/` finds zero em dashes, zero en dashes, zero emoji checkmarks (the ✅/⚠️/❌ set), zero `/mnt/user-data` strings, and zero Markdown table rows (`|---`-style separator lines) anywhere under `superbiz/`.
7. Skill bodies pin the artifact contract: validator report at `docs/business/<idea-slug>/walidacja.md` (`validation.md` when the report language is English), roadmap folder at `docs/business/<idea-slug>/plan/`, capture files at `.temp/superbiz/validator/capture-<RUN_ID>.md` and `.temp/superbiz/roadmap/capture-<RUN_ID>.md`; the validator entry ends by offering (AskUserQuestion) to invoke `product-phase-roadmap` (Skill).
8. `.claude-plugin/marketplace.json` has a fifth entry (`name` `superbiz`, `source` `./superbiz`, `description` `"Super Biz ecosystem for Claude Code."`) appended after `superfix`, and its top-level `version` is `"3.4.0"`.
9. Root `README.md` says "Five independent..." with a superbiz clause in line 3, has a superbiz bullet in the plugin list, an install line `claude plugin install superbiz@p2p2 --scope user`, mentions superbiz in the line-28 routing recap, and carries a new `## Super Biz` section with a `| Skill | Role |` table for the four skills.
10. Root `CLAUDE.md` is updated: "four" plugin counts become "five" (incl. the `## Why four plugins` heading), a superbiz bullet in `## What this repo is`, a `superbiz/` line in the layout tree, `## Versioning` says all five manifests, the docs-layer invariant lists `docs/business/<idea-slug>/` and the `.temp/` invariant lists `.temp/superbiz/`, the manifest-less-plugin statements and the self-documentation invariant name superbiz.
11. `.github/scripts/release.sh` `manifests` array includes `superbiz/.claude-plugin/plugin.json` and its header comments say five plugins; `tests/github/release.test.ts` `PLUGINS` includes `"superbiz"` with fixture comments and the "all four" test title updated; `node --test "tests/**/*.test.ts"` passes from the repo root.

<!-- /HEADER -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superbiz): port business-idea-validator as entry skill + researcher fork
- Covers: criteria #3, #4, #5, #6, #7
- TDD: none

### Dependencies
- Task 1 - blocks: this task (plugin dir + manifest entries must exist)

### Files
- add - superbiz/skills/business-idea-validator/SKILL.md (interactive entry)
- add - superbiz/skills/business-idea-validator-researcher/SKILL.md (fork worker)
- add - superbiz/skills/business-idea-validator-researcher/references/frameworks.md (ported)
- add - superbiz/skills/business-idea-validator-researcher/references/report-template.md (ported)

### Test Commands
#### Build
- none

#### Tests
- `grep -RE '—|–|✅|⚠️|❌' superbiz/; test $? -eq 1` - expected: exit 0 (no matches anywhere in the plugin tree so far)
- `grep -R '/mnt/user-data' superbiz/; test $? -eq 1` - expected: exit 0
- `grep -RE '^\|.*---' superbiz/; test $? -eq 1` - expected: exit 0 (no Markdown table separators)
- `grep -l 'context: fork' superbiz/skills/business-idea-validator-researcher/SKILL.md` - expected output: the file path
- `grep -c 'WebSearch' superbiz/skills/business-idea-validator-researcher/SKILL.md` - expected: >= 1

### Approach
1. Write the entry `superbiz/skills/business-idea-validator/SKILL.md`. Frontmatter: `name: business-idea-validator`; `description:` ported near-1:1 from `/Users/dario/.claude/skills/business-idea-validator/SKILL.md` line 3 (keep all Polish trigger phrases; replace em dashes with ` - `; strengthen the final guard to: not for analyzing a running company's quarterly performance, not for pure marketing copywriting, and not for casual conversation about business topics with no concrete idea of the user's own on the table); `user-invocable: true`; `allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)`. Body = source Phase 1 (Intake) only, reshaped as: extract problem/target customer/solution/monetization/geography/resources from the user's description; ask what is missing and materially changes the analysis via AskUserQuestion (geography and B2B/B2C first; never ask what desk research can answer); restate the idea in one paragraph and list the 3-5 leap-of-faith assumptions, confirm with the user; derive `<idea-slug>` (kebab-case, confirm with the user) and detect the report language from the user's language; write the capture file `.temp/superbiz/validator/capture-<RUN_ID>.md` (`RUN_ID` from `date +%Y%m%d%H%M%S`) with labeled sections: `# Idea` (restated paragraph), `# Slug`, `# Language`, `# Geography`, `# Customer`, `# Monetization`, `# Resources`, `# Assumptions` (the leap-of-faith list), `# Extra context` (anything else the user settled); invoke `business-idea-validator-researcher` (Skill) with args block `capture: <path>`; on return relay the fork's verdict line to the user as a 3-4 sentence summary, then AskUserQuestion whether to turn the report into a phased plan - on yes invoke `product-phase-roadmap` (Skill) with args `report: docs/business/<idea-slug>/walidacja.md` (the actual path from the fork's return line).
2. Write the fork `superbiz/skills/business-idea-validator-researcher/SKILL.md`. Frontmatter: `name`, `description: Invoked only by the business-idea-validator skill, never directly.`, `context: fork`, `background: false`, `model: opus`, `effort: high`, `user-invocable: false`, `allowed-tools: Read, Write, Glob, WebSearch, WebFetch, Bash(date:*)`. Body starts with `# Input contract` (single labeled arg `capture: <path>`; Read it first; it carries every user decision - never ask, never assume beyond it) and ports source Phases 2-5 with these deltas: keep the four context blocks (occupied markets, AI-assisted development, investor lens, honesty rule) as body sections framed on the input, dropping caller narrative; keep the full Phase 2 deep-research program (8-15 searches, pain-point deep dive, execution-gap and feature-gap mining), Phase 3 analysis (read `references/frameworks.md`), Phase 4 verdict and how-to-win, Phase 5 report per `references/report-template.md`; replace the whole source Phase 5 output block with: write the report to `docs/business/<slug-from-capture>/walidacja.md` when the capture `# Language` is Polish, `validation.md` for English, analogous filename translation otherwise (create directories as needed via Write); keep the always-Markdown rule (the report is a `.md` file, never another format), the plain-Markdown/no-citation-tags rule, and the Limitations section; end with `# Output format`: return exactly one line `REPORT: <path> | VERDICT: <GO|PIVOT|NO-GO> | <one-sentence reason>`. Remove the source language-rule paragraph's chat-conversation clause (the fork does not converse) - report language comes from the capture.
3. Port `references/frameworks.md` from `/Users/dario/.claude/skills/business-idea-validator/references/frameworks.md`: keep all framework guidance and reasoning prose; convert the scoring-rubric Markdown table (source lines 76-86) into a per-dimension list (`- Problem evidence: 1 = no trace of anyone complaining; 5 = abundant, recent, high-intensity complaints.` etc.); replace the `✅ / ⚠️ / ❌` cell markers in the Feature comparison matrix section (source lines 37, 39, 43) with the same textual markers as step 4; replace em/en dashes with ` - `/plain hyphen; strip italics (keep bold).
4. Port `references/report-template.md` from `/Users/dario/.claude/skills/business-idea-validator/references/report-template.md`: keep the fenced report skeleton and all formatting rules; replace `✅ / ⚠️ / ❌` cell markers (wherever they appear; in the source only section 5b) with the textual markers `[ok]` / `[słabo - cytuj skargę]` / `[brak]` (with the note to translate the labels to the report language); state that comparison "tables" in the generated report are the report's own concern and the report may use Markdown tables (the ban applies to skill sources, and the generated artifact lands in the host repo, not under skills/); replace em/en dashes.
5. Apply `_skills.md` throughout both new SKILL.md files: most critical instructions first under clear headings, bullets over narrative where it does not lose precision, no emoji/italics/tables, no "read CLAUDE.md" line, spaced-hyphen punctuation.

### Edge cases
- Capture file missing or unreadable in the fork: return `ERROR: capture unreadable at <path>` as the single output line instead of researching from nothing.
- No reliable data found for a research area: the report says so explicitly per the honesty rule (three-tier labeling) - never invented numbers.
- User declines the roadmap chain: entry ends after the verdict summary; no further action.
- `docs/business/<slug>/` already exists with a previous report: the fork overwrites `walidacja.md` (a re-validation supersedes the old report) - no versioned copies.

### Contracts
- Entry-to-fork args block: `capture: <path to .temp/superbiz/validator/capture-<RUN_ID>.md>` (single labeled line; value is a PATH, never inlined content).
- Fork return line: `REPORT: <path> | VERDICT: <GO|PIVOT|NO-GO> | <one-sentence reason>`.
- Capture file sections: `# Idea`, `# Slug`, `# Language`, `# Geography`, `# Customer`, `# Monetization`, `# Resources`, `# Assumptions`, `# Extra context`.

### DoD
All four files exist; frontmatter matches criteria #3/#4; grep checks pass (no dashes/emoji/tables/web paths); the body pins the `docs/business/<idea-slug>/walidacja.md` contract and the roadmap chain offer.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superbiz): port product-phase-roadmap as entry skill + writer fork
- Covers: criteria #3, #4, #5, #6, #7
- TDD: none

### Dependencies
- Task 1 - blocks: this task (plugin dir + manifest entries must exist)

### Files
- add - superbiz/skills/product-phase-roadmap/SKILL.md (interactive entry)
- add - superbiz/skills/product-phase-roadmap-writer/SKILL.md (fork worker)
- add - superbiz/skills/product-phase-roadmap-writer/references/phase-blueprint.md (ported)

### Test Commands
#### Build
- none

#### Tests
- `grep -RE '—|–|✅|⚠️|❌' superbiz/; test $? -eq 1` - expected: exit 0 (whole plugin tree, criterion #6 end-to-end once Tasks 1-3 are in)
- `grep -RE '^\|.*---' superbiz/; test $? -eq 1` - expected: exit 0
- `grep -R '/mnt/user-data' superbiz/; test $? -eq 1` - expected: exit 0
- `grep -l 'model: sonnet' superbiz/skills/product-phase-roadmap-writer/SKILL.md` - expected output: the file path
- `grep -c 'docs/business/' superbiz/skills/product-phase-roadmap-writer/SKILL.md` - expected: >= 1

### Approach
1. Write the entry `superbiz/skills/product-phase-roadmap/SKILL.md`. Frontmatter: `name: product-phase-roadmap`; `description:` ported near-1:1 from `/Users/dario/.claude/skills/product-phase-roadmap/SKILL.md` line 3 (keep Polish trigger phrases; ` - ` for dashes; add the sibling framing "especially a validation report produced by the business-idea-validator skill" kept as-is); `user-invocable: true`; `argument-hint: "[<validation-report path>]"`; `allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)`. Body = source Phase A reshaped: resolve the validation report - a `report:` labeled arg or bare path argument wins, else Glob `docs/business/*/walidacja.md` and `docs/business/*/validation.md` and the conversation, else ask; no report found: gather the product one-pager fields from the user (product paragraph, target customer, wedge, feature set, pricing, market/language) and offer running `business-idea-validator` (Skill) first; then the mandatory single-pass interview via AskUserQuestion (batched up to the tool's limit; never skipped even on "just run it"): all open decisions - report items marked "do decyzji"/"założenie do zweryfikowania", scope of optional MVP modules, naming/domain, revenue targets, budget and weekly-hours envelope; decisions that depend on future data become explicit decision rules with a numeric threshold and a resolving phase; derive `<idea-slug>` (from the report's directory when chained, else confirm with the user); write `.temp/superbiz/roadmap/capture-<RUN_ID>.md` with sections `# Product`, `# Slug`, `# Language`, `# Report` (path or `none`), `# Decisions` (every interview answer), `# Decision rules` (threshold + resolving phase each), `# Extra context`; invoke `product-phase-roadmap-writer` (Skill) with `capture: <path>`; on return relay the source Phase E summary (phase count, total timeline, the single most important Phase 1 exit criterion, decisions the user still owes - which must be none given the interview).
2. Write the fork `superbiz/skills/product-phase-roadmap-writer/SKILL.md`. Frontmatter: `name`, `description: Invoked only by the product-phase-roadmap skill, never directly.`, `context: fork`, `background: false`, `model: sonnet`, `effort: high`, `user-invocable: false`, `allowed-tools: Read, Write, Glob, WebSearch, WebFetch, Bash(date:*)`. Body: `# Input contract` (single arg `capture: <path>`; Read it plus the `# Report` path when present; the capture is the complete decision record - never ask, no unresolved placeholder may survive into the output); port source Phases B-D: Phase B web refresh (4-8 searches, mandatory, honesty rule with fact/estimate labeling, no "[do decyzji]" tier in output); Phase C structure (read `references/phase-blueprint.md`; default five phases, exit-criteria gates, marketing as scheduled work, trigger-shipped deferrals, checkbox steps with estimates, trace-to-report clauses); Phase D output rewritten for the approved layout: folder `docs/business/<slug-from-capture>/plan/` containing `README.md` (overview, phase list with goal/duration/exit criteria, timeline, sources) plus one file per phase (`faza-0-fundament.md` ... `faza-4-wzrost.md`, names translated to the output language, count matching the designed structure); keep pure-Markdown/no-citation-tags and acronym-expansion rules; note the phase files may use Markdown tables for the metrics sections (generated artifact, not skill source); end with `# Output format`: single line `PLAN: <dir> | PHASES: <n> | TIMELINE: <total estimate> | PHASE1-EXIT: <the cheapest kill-switch criterion>`.
3. Port `references/phase-blueprint.md` from `/Users/dario/.claude/skills/product-phase-roadmap/references/phase-blueprint.md` near-1:1: keep the per-phase section template (fenced block), the five phase skeletons with benchmark starting points and source list, and the runtime-refresh query suggestions; replace em/en dashes with ` - `/plain hyphen (incl. inside the fenced template); strip italics.
4. Apply `_skills.md` to both SKILL.md files as in Task 2 step 5.

### Edge cases
- `report:` path given but file missing: fall back to the no-report branch (gather inputs, offer validation) after telling the user.
- Capture unreadable in the fork: return `ERROR: capture unreadable at <path>`.
- `docs/business/<slug>/plan/` already exists: overwrite the folder contents (a regenerated plan supersedes the old one).
- Phase count differs from five (merge/split per the report): README phase list and file names follow the designed count, not the default.

### Contracts
- Entry-to-fork args block: `capture: <path>` (PATH only).
- Fork return line: `PLAN: <dir> | PHASES: <n> | TIMELINE: <total estimate> | PHASE1-EXIT: <criterion>`.
- Capture sections: `# Product`, `# Slug`, `# Language`, `# Report`, `# Decisions`, `# Decision rules`, `# Extra context`.

### DoD
All three files exist; frontmatter matches criteria #3/#4; grep checks pass; the body pins `docs/business/<idea-slug>/plan/` and the zero-unresolved-placeholders rule.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(marketplace): co-list superbiz and document it in the README
- Covers: criteria #8, #9
- TDD: none

### Dependencies
- Task 1 - blocks: this task (marketplace `source` must point at an existing plugin dir)

### Files
- modify - .claude-plugin/marketplace.json (append entry, bump version)
- modify - README.md (intro count, bullet list, install block, routing recap, new section)

### Test Commands
#### Build
- none

#### Tests
- `node -e "const m=JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); if(m.version!=='3.4.0'||m.plugins.length!==5||m.plugins[4].name!=='superbiz') process.exit(1)"` - expected: exit 0
- `grep -c 'superbiz' README.md` - expected: >= 4

### Approach
1. In `.claude-plugin/marketplace.json`: bump `version` `"3.3.0"` to `"3.4.0"`; append after the superfix entry: `{"name": "superbiz", "source": "./superbiz", "description": "Super Biz ecosystem for Claude Code."}` (same 3-key shape and order as siblings).
2. In `README.md` line 3: "Four independent" to "Five independent"; extend the parenthetical routing sentence with `superbiz` among the manifest-less plugins (both its entry skills route via CSO descriptions with fork workers behind them).
3. Add a bullet after the superfix bullet (line 8): `- **superbiz** - the business validation / product roadmap ecosystem: ...` describing the validator (deep web research, GO/PIVOT/NO-GO report at `docs/business/<idea-slug>/`) and the roadmap (phased execution docs at `docs/business/<idea-slug>/plan/`), closing with "No manifest, no hooks - both entry skills route via CSO descriptions."
4. Add `claude plugin install superbiz@p2p2 --scope user` to the install block after the superfix line (line 21).
5. Extend the line-28 recap sentence to name superbiz among CSO-routed plugins. Do NOT touch the Node.js line 26 (superbiz ships no scripts).
6. Append a `## Super Biz` section after `## Super Fix`: one-line lede ("Flat-named... No manifest, no hooks - the two entry skills route via their CSO `description:`, each backed by a fork worker:") plus a `| Skill | Role |` table with four rows (validator entry, researcher fork, roadmap entry, writer fork) in the style of the `## Super GH` table, mentioning the in-plugin validator-to-roadmap chain.

### Edge cases
- none

### Contracts
- Marketplace entry `description` string identical to `superbiz/.claude-plugin/plugin.json` `description`.

### DoD
Both files updated; JSON parses with 5 entries and version 3.4.0; README names superbiz in all five spots; test commands pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - docs: register superbiz across the root CLAUDE.md
- Covers: criterion #10
- TDD: none

### Dependencies
- Task 1 - blocks: this task (documents what Task 1-3 ship)

### Files
- modify - CLAUDE.md (root; plugin counts, bullets, layout tree, invariants, versioning)

### Test Commands
#### Build
- none

#### Tests
- `grep -c 'superbiz' CLAUDE.md` - expected: >= 8
- `grep -n 'Why four plugins' CLAUDE.md; test $? -eq 1` - expected: exit 0 (heading renamed)

### Approach
1. Top blockquote and `## What this repo is`: "Four self-contained..." to "Five...", add `superbiz` to every plugin enumeration (source-of note, marketplace co-listing sentence, `"./superbiz"` in the catalog lists), and add a `- **superbiz** - ...` bullet after superfix: business validation + phased roadmap ecosystem, two CSO-routed entry skills each with a fork worker (researcher: opus web research to `docs/business/<idea-slug>/walidacja.md`; writer: phased plan folder at `docs/business/<idea-slug>/plan/`), no hooks/no manifest; the per-plugin-CLAUDE.md note gains `superbiz/CLAUDE.md`.
2. "no hooks and no manifest" enumerations throughout (`superui` / `supergh` / `superfix` lists, the artefacts paragraph "only superdev has hooks", the one-injected-manifest invariant): add `superbiz` to each list.
3. `## Why four plugins`: rename to `## Why five plugins`, add the superbiz install-subset clause (just the business ecosystem) and its manifest-less rationale to the closing parenthetical.
4. `## Repository layout (top level)`: add `superbiz/` tree line after `superfix/` (`The superbiz plugin (business validation / product roadmap; NO hooks, NO manifest) -> superbiz/CLAUDE.md`); update the marketplace.json comment line to name five entries.
5. `## Versioning`: "all four" to "all five" (both occurrences), add `superbiz/` to the manifest list.
6. `## Cross-plugin architecture invariants`: docs-layer invariant gains `docs/business/<idea-slug>/` (superbiz's validator report + `plan/` folder); the `.temp/` clause gains `.temp/superbiz/` capture files; the self-documentation invariant names superbiz's `skills[]` (four skills, no agents); the per-plugin-invariants pointer sentence gains superbiz.
7. `## When editing`: the marketplace co-listing sentence gains `"./superbiz"`.
8. Keep "four" wherever it genuinely still means four (none expected - verify each remaining `four` before leaving it).

### Edge cases
- none

### Contracts
- none

### DoD
Root CLAUDE.md consistently describes five plugins; no stale "four" enumeration that should include superbiz remains; grep checks pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - feat(release): bump superbiz manifest in release.sh and its test suite
- Covers: criterion #11
- TDD: none

### Dependencies
- Task 1 - blocks: this task (release.sh path must exist on disk; jq fails on a missing manifest under `set -euo pipefail`)

### Files
- modify - .github/scripts/release.sh (manifests array, header comments)
- modify - tests/github/release.test.ts (PLUGINS array, fixture comments, test title)

### Test Commands
#### Build
- none

#### Tests
- `node --test "tests/github/release.test.ts"` - expected: all tests pass, 0 failures
- `node --test "tests/**/*.test.ts"` - expected: full suite passes, 0 failures

### Approach
1. `.github/scripts/release.sh` line 26: append `superbiz/.claude-plugin/plugin.json` to the `manifests` array.
2. Same file header comments: line 2 `superdev + superui + supergh + superfix` gains `+ superbiz`; lines 5-6 `ALL FOUR subdir plugin manifests` to `ALL FIVE`, dir list gains `superbiz/`.
3. `tests/github/release.test.ts` line 37: `PLUGINS` gains `"superbiz"`.
4. Same file: comments at lines 77 (`Writes the four fixture manifests`) and 107 (`four fixture manifests`) to `five`; test title at line 320 `bumps all four manifests'` to `bumps all five manifests'`.
5. Run the release test file, then the full suite from the repo root.

### Edge cases
- zsh `nomatch`: keep the test glob quoted exactly as `"tests/**/*.test.ts"` (repo-documented invocation).

### Contracts
- `manifests` array order mirrors the marketplace plugin order (superbiz last).

### DoD
Both files updated; `node --test "tests/**/*.test.ts"` exits 0 with all tests passing.

<!-- /TASK -->
