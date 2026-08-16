
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


### Covered criteria
3. The two entry SKILL.md files carry `user-invocable: true`, NO `disable-model-invocation`, descriptions ported near-1:1 from the sources (Polish trigger phrases included) with a strengthened "Do NOT use" guard, and `allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)`.
4. The two fork SKILL.md files carry `context: fork`, `background: false`, `user-invocable: false`, a description guard `Invoked only by the <entry> skill, never directly.`, `WebSearch` and `WebFetch` in `allowed-tools`; researcher has `model: opus` + `effort: high`, writer has `model: sonnet` + `effort: high`.
5. The three references files are ported: `superbiz/skills/business-idea-validator-researcher/references/frameworks.md` and `references/report-template.md`, and `superbiz/skills/product-phase-roadmap-writer/references/phase-blueprint.md`; skill bodies reference them as relative `references/<file>.md`.
6. `grep -R` over `superbiz/` finds zero em dashes, zero en dashes, zero emoji checkmarks (the ✅/⚠️/❌ set), zero `/mnt/user-data` strings, and zero Markdown table rows (`|---`-style separator lines) anywhere under `superbiz/`.
7. Skill bodies pin the artifact contract: validator report at `docs/business/<idea-slug>/walidacja.md` (`validation.md` when the report language is English), roadmap folder at `docs/business/<idea-slug>/plan/`, capture files at `.temp/superbiz/validator/capture-<RUN_ID>.md` and `.temp/superbiz/roadmap/capture-<RUN_ID>.md`; the validator entry ends by offering (AskUserQuestion) to invoke `product-phase-roadmap` (Skill).
