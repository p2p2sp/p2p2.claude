
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


### Covered criteria
3. The two entry SKILL.md files carry `user-invocable: true`, NO `disable-model-invocation`, descriptions ported near-1:1 from the sources (Polish trigger phrases included) with a strengthened "Do NOT use" guard, and `allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)`.
4. The two fork SKILL.md files carry `context: fork`, `background: false`, `user-invocable: false`, a description guard `Invoked only by the <entry> skill, never directly.`, `WebSearch` and `WebFetch` in `allowed-tools`; researcher has `model: opus` + `effort: high`, writer has `model: sonnet` + `effort: high`.
5. The three references files are ported: `superbiz/skills/business-idea-validator-researcher/references/frameworks.md` and `references/report-template.md`, and `superbiz/skills/product-phase-roadmap-writer/references/phase-blueprint.md`; skill bodies reference them as relative `references/<file>.md`.
6. `grep -R` over `superbiz/` finds zero em dashes, zero en dashes, zero emoji checkmarks (the ✅/⚠️/❌ set), zero `/mnt/user-data` strings, and zero Markdown table rows (`|---`-style separator lines) anywhere under `superbiz/`.
7. Skill bodies pin the artifact contract: validator report at `docs/business/<idea-slug>/walidacja.md` (`validation.md` when the report language is English), roadmap folder at `docs/business/<idea-slug>/plan/`, capture files at `.temp/superbiz/validator/capture-<RUN_ID>.md` and `.temp/superbiz/roadmap/capture-<RUN_ID>.md`; the validator entry ends by offering (AskUserQuestion) to invoke `product-phase-roadmap` (Skill).
