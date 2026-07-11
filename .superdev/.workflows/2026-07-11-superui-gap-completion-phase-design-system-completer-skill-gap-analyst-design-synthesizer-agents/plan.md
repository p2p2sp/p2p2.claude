# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "superui gap-completion phase: design-system-completer skill + gap-analyst/design-synthesizer agents"

---
<!-- HEADER -->

## Goal
The superui plugin gains an opt-in "gap completion" phase: a new `design-system-completer` skill that (stage 1) validates an already-extracted design system under `.superui/design-system/` against a completeness checklist and presents a gap report, and (stage 2) only after explicit per-gap/per-category user approval, designs the missing pieces via a new `design-synthesizer` agent — every synthesized token flagged `$extensions.org.superui.synthesized: true`, every synthesized spec/section carrying a provenance marker, all writes flowing through the existing single-writer pipeline (`token-composer` for dtcg.yml, `html-visualizer` for sheets). `fidelity-reviewer` skips synthesized entries; `design-system-guardian` routes design gaps to the completer; the extractor stays pure measurement and only reports when a re-extraction overwrote previous syntheses.

## Context
The extractor's doctrine is measure-or-mark-gap: agents never invent values the screenshots don't show, so a system extracted from incomplete screens lacks states, dark coverage, or token roles. Today the guardian routes ALL gaps back to the extractor, which cannot help when the source never contained the value. The approved design (user interview, decisions D1–D6) adds a separate completion phase that keeps extraction pure and makes synthesis explicit, user-gated, provenance-marked, and reproducible after re-extraction via a durable ledger `.superui/design-system/completions.md`. This repo ships markdown/JSON/scripts directly — no build or test infra; verification is script runs plus careful reading.

## Acceptance criteria
1. `superui/skills/design-system-completer/SKILL.md` exists: CSO-routable description (triggers: fill gaps / check completeness of the design system / add missing states), Python preflight, orchestrator ground rules, and an ordered checklist with a hard user-approval gate between gap report and synthesis; `"./skills/design-system-completer/"` is in `superui/.claude-plugin/plugin.json` `skills[]`.
2. `superui/skills/design-system-completer/scripts/check_completeness.py` runs standalone: `<python> check_completeness.py DESIGN_SYSTEM_DIR OUT.md` writes a facts file with four sections (tier facts, dark facts, spec state facts, provenance facts), exit 0 on success (gaps are data, not errors), exit 1 on missing/unreadable `dtcg.yml`; its header comment carries the I/O contract.
3. `superui/agents/gap-analyst.md` and `superui/agents/design-synthesizer.md` exist with frontmatter per repo pattern (`name`, `description` with routing/scope guard, `tools`) and both are listed in `plugin.json` `agents[]` (and in no `skills[]`).
4. `superui/agents/token-composer.md` merge job writes `$extensions.org.superui.synthesized: true` on entries marked synthesized and preserves existing flags; `superui/agents/fidelity-reviewer.md` skips synthesized-flagged tokens and provenance-marked specs/sections and reports the skipped count; `superui/agents/html-visualizer.md` renders `> SYNTHESIZED:` notes and the spec `**Provenance:**` line.
5. `superui/skills/design-system-guardian/SKILL.md` routes gaps dually (measurable-from-source → extractor; absent-from-source → completer) and its writes-there absolute names both pipelines; `superui/skills/design-system-extractor/SKILL.md` "Present results" reports overwritten syntheses when `<out>/completions.md` exists.
6. The completer SKILL.md specifies all handoff contracts: gap-report entry format, synthesized-tokens list format (token-composer merge input), `completions.md` ledger format, and the `inventory.md` `## Synthesized` entry format.
7. `superui/CLAUDE.md` documents the new skill, both agents, the script, the ledger, and the amended invariants; `superui/.claude-plugin/plugin.json` parses as valid JSON.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 — feat(superui): add check_completeness.py facts extractor
- Covers: criteria #2

### Dependencies
- none

### Files
- add - superui/skills/design-system-completer/scripts/check_completeness.py (main, load_tokens, tier_facts, dark_facts, spec_state_facts, provenance_facts)

### Test Commands
*Build*
- `python3 -m py_compile superui/skills/design-system-completer/scripts/check_completeness.py` — exit 0

*Tests*
- Build a minimal fixture under `.temp/fixtures/ds-min/` (a `dtcg.yml` with one color group where one token has `$extensions.org.superui.dark` and one lacks it, one alias token, one token with `$extensions.org.superui.synthesized: true`; `components/button.md` with a `## States` table holding Default and Hover rows; `patterns/list.md` without `## States`), then `python3 superui/skills/design-system-completer/scripts/check_completeness.py .temp/fixtures/ds-min .temp/fixtures/out.md` — exit 0 and `out.md` contains all four `## ` sections with the expected entries
- `python3 superui/skills/design-system-completer/scripts/check_completeness.py .temp/fixtures/nonexistent .temp/fixtures/out2.md` — exit 1 with a one-line error

### Approach
1. Write a stdlib+pyyaml script (mirror the loading/walking style of `superui/skills/design-system-extractor/scripts/validate_tokens.py`, incl. its token-vs-group walk and `$extensions` access): CLI `check_completeness.py DESIGN_SYSTEM_DIR OUT.md`, header comment with the I/O contract, self-verifying (re-read the written file; any I/O or parse failure prints one error line and exits 1).
2. `tier_facts(tokens)` — top-level groups with token counts; per group: raw-value count vs alias count (a string `$value` matching `{...}` is an alias); flag which of the three tiers appear (primitive = groups holding raw values; semantic = alias-carrying purpose groups; component = component-scoped groups).
3. `dark_facts(tokens)` — total color tokens, count carrying `$extensions.org.superui.dark`, and when that count is > 0, the list of color tokens lacking it; when 0, a single "no dark theme detected" line.
4. `spec_state_facts(dir)` — for every `components/*.md` and `patterns/*.md`: whether `## States` exists and the row names parsed from the first cell of its `|`-table rows (facts only — no judgment about which states SHOULD exist).
5. `provenance_facts(dir, tokens)` — tokens already flagged `org.superui.synthesized`, spec files containing a `**Provenance:**` line or `> SYNTHESIZED:` marker, and whether `completions.md` exists (list its `- ` entries verbatim).

### Edge cases
- `dtcg.yml` present but `components/`/`patterns/` absent or empty → facts sections state "none found", exit 0.
- Malformed YAML → exit 1 with the parser message (no partial output file left behind).
- A spec `## States` section without a table → "no state rows found" fact, not an error.

### Contracts
- Facts file (OUT.md) sections, each a `## ` heading: `## Tier facts`, `## Dark facts`, `## Spec state facts`, `## Provenance facts`; entries are single `- ` lines. This file is the gap-analyst's primary input (Task 2).

### DoD
Script compiles, both fixture runs behave per Test Commands, header documents CLI + exit codes + output sections.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 — feat(superui): add gap-analyst agent
- Covers: criteria #3 (gap-analyst half)

### Dependencies
- Task 1 — blocks: consumes the facts-file contract

### Files
- add - superui/agents/gap-analyst.md
- modify - superui/.claude-plugin/plugin.json (agents[] gains "./agents/gap-analyst.md")

### Test Commands
*Build*
- `python3 -c "import json; json.load(open('superui/.claude-plugin/plugin.json'))"` — exit 0

*Tests*
- `grep -c "design-system-gap\|gap-analyst" superui/agents/gap-analyst.md` — frontmatter name present; manual read-through against the checklist below

### Approach
1. Frontmatter per repo pattern: `name: gap-analyst`, folded `description: >-` carrying the routing/scope guard ("Judgment stage of a design-system completion run — turns completeness FACTS into judged gaps; names WHAT is missing, never a fill value. Spawn exactly one."), `tools: Read, Write, Glob, Grep`.
2. Body input -> work -> output, no caller narrative: inputs = facts-file path, design-system dir, checklist reference paths (extractor's `references/design-system-foundations.md` and `references/component-spec.md`, pro-designer's `references/components-states.md`), output gap-report path, optional `completions.md` path (re-apply mode).
3. Work: judge each fact against the checklists — Hover/Focus-visible/Active rows are gaps only for interactive components (judge interactivity from the spec's own Definition/Anatomy); loading/empty/error trio applies at pattern level; a used primitive with no semantic role token is a tier gap; missing dark on color tokens is a gap only when the system carries any dark extension. Filter script false-positives instead of forwarding them.
4. Re-apply mode: classify every ledger entry as `still-missing` | `now-measured` (the re-extracted system now covers it) | `obsolete`, in a dedicated report section.
5. Output: gap report grouped by category (`## States`, `## Token tiers`, `## Dark coverage`, `## Re-apply` when applicable) with a leading `## Summary` count line; entry format per Contracts. Hard rules: read-only towards `.superui/design-system/`; never propose a fill value; never talk to the user.

### Edge cases
- Zero gaps → report is `## Summary` + "no gaps" (a valid, complete run).
- Facts file reports "no dark theme detected" → dark absence is reported as a NOTE for the user, not a per-token gap list.

### Contracts
- Gap entry line: `- [G<n>] <state|tier|dark> · <component-slug or token.path> · <what is missing> · basis: <checklist source or fact line>` — `[G<n>]` ids are what the user approves and what design-synthesizer receives.

### DoD
Agent file present per repo agent pattern, plugin.json valid and listing it, report/entry contract matches Task 5's dispatch text.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 — feat(superui): add design-synthesizer agent
- Covers: criteria #3 (design-synthesizer half)

### Dependencies
- Task 2 — blocks: consumes the `[G<n>]` gap-entry contract

### Files
- add - superui/agents/design-synthesizer.md
- modify - superui/.claude-plugin/plugin.json (agents[] gains "./agents/design-synthesizer.md")

### Test Commands
*Build*
- `python3 -c "import json; json.load(open('superui/.claude-plugin/plugin.json'))"` — exit 0

*Tests*
- Manual read-through: frontmatter fields, extrapolate-first rule, SYNTHESIZED-TOKENS output format, hard rules present

### Approach
1. Frontmatter: `name: design-synthesizer`, folded `description: >-` with scope guard ("Designs the user-APPROVED gaps of one scope in a design-system completion run — extrapolates from the existing tokens/specs first, generic professional standards second. Emits a synthesized-tokens list and provenance-marked spec content; never edits dtcg.yml. Spawn one per approved scope, in parallel."), `tools: Read, Write, Glob, Grep`.
2. Inputs: the approved `[G<n>]` gap entries for ONE scope (one component/pattern slug, or one token category); design-system dir (dtcg.yml, specs, DESIGN.md); pro-designer references dir path (fallback doctrine); extractor's spec-template reference + example-spec paths (when writing spec content); output paths — the spec file (when spec work) and a synthesized-tokens list file.
3. Work order per gap: FIRST extrapolate from the measured system (derive a missing hover/pressed from the system's own state treatment and scales, a missing dark value from the system's existing light->dark relationships, a missing semantic role by aliasing the primitive already used); ONLY where the system offers no basis, fall back to pro-designer reference standards. Record which basis was used in the rationale.
4. Spec output: new spec files follow the template structure with a `**Provenance:** designed, not extracted` line appended to the meta line; synthesized sections inside an existing measured spec get a `> SYNTHESIZED: <rationale>` marker (modeled on the sanctioned `> NEEDS INPUT` convention). Token references by NAME only; a needed value with no token becomes a synthesized-tokens entry, never a raw value in the spec.
5. Output message: paths written + the synthesized-tokens list per Contracts (or `SYNTHESIZED-TOKENS: none`). Hard rules: NEVER edit dtcg.yml, tokens.css, inventory.md, or any file outside the given output paths; one scope only; never talk to the user.

### Edge cases
- An approved gap that turns out to be extrapolatable to an EXISTING token (pure alias) → emit the alias as a synthesized-tokens entry (value = `{existing.path}`), do not duplicate the raw value.
- A gap whose synthesis would contradict a measured value → return it as a `> NEEDS INPUT` item instead of overriding measurement.

### Contracts
- Synthesized-tokens list (token-composer merge input, marked): header `SYNTHESIZED-TOKENS:` then `- <proposed.token.name> = <value> (evidence: synthesized — <basis rationale>) [G<n>]` — mirrors spec-writer's MISSING-TOKENS shape so token-composer's merge job consumes it unchanged, plus the synthesized marking Task 4 teaches the composer to flag.

### DoD
Agent file present per repo agent pattern, plugin.json valid and listing both new agents, output contract consistent with Tasks 2/4/5.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 — feat(superui): teach provenance to token-composer, fidelity-reviewer and html-visualizer
- Covers: criteria #4

### Dependencies
- Task 3 — blocks: flags/markers must match design-synthesizer's output contract

### Files
- modify - superui/agents/token-composer.md (Merge job + Hard rules)
- modify - superui/agents/fidelity-reviewer.md (Inputs + What to do + Output)
- modify - superui/agents/html-visualizer.md (What to do + Hard rules)

### Test Commands
*Build*
- none (markdown only)

*Tests*
- `grep -l "org.superui.synthesized" superui/agents/token-composer.md superui/agents/fidelity-reviewer.md` — both listed
- `grep -c "SYNTHESIZED" superui/agents/html-visualizer.md` — ≥ 1

### Approach
1. token-composer.md: extend the Merge input line — a merge list may arrive as `SYNTHESIZED-TOKENS:` entries; each such token is written with `$extensions.org.superui.synthesized: true`, and existing synthesized flags in dtcg.yml are PRESERVED on merge. Extend Hard rules: the never-fabricate rule is unchanged — synthesized values are provided list entries; the flag is metadata the composer writes, never a license to invent.
2. fidelity-reviewer.md: in "What to do", exclude tokens carrying `$extensions.org.superui.synthesized` from the token spot-check, and exclude spec files/sections marked `**Provenance:** designed, not extracted` or `> SYNTHESIZED:` from pixel comparison — synthesized content has no source pixels BY DESIGN, not as a mismatch. In Output: report the count of skipped synthesized items alongside PASS/mismatches.
3. html-visualizer.md: in "What to do", render `> SYNTHESIZED:` notes the same way as `> NEEDS INPUT` notes, and render a spec's `**Provenance:** designed, not extracted` line as a visible note line in the sheet header area using existing chrome classes only (no new chrome).

### Edge cases
- A spec that is entirely synthesized (whole-file provenance) → fidelity-reviewer skips the file and says so; its sheet still renders normally.
- Merge list mixing measured MISSING-TOKENS and SYNTHESIZED-TOKENS entries → only the synthesized entries get the flag.

### Contracts
- consumes: `$extensions.org.superui.synthesized: true` (dtcg.yml token metadata), `**Provenance:** designed, not extracted` (spec meta line), `> SYNTHESIZED: <rationale>` (spec inline marker) — the single provenance vocabulary all three agents and Task 5 share.

### DoD
All three agent files updated, grep checks pass, no change to compose-job behavior or to the never-invent doctrine's meaning.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 — feat(superui): add design-system-completer orchestrator skill
- Covers: criteria #1, #6

### Dependencies
- Task 1 — blocks: script CLI in step dispatches
- Task 2 — blocks: gap-analyst dispatch contract
- Task 3 — blocks: design-synthesizer dispatch contract
- Task 4 — blocks: token-composer synthesized-merge dispatch

### Files
- add - superui/skills/design-system-completer/SKILL.md
- modify - superui/.claude-plugin/plugin.json (skills[] gains "./skills/design-system-completer/")

### Test Commands
*Build*
- `python3 -c "import json; json.load(open('superui/.claude-plugin/plugin.json'))"` — exit 0

*Tests*
- `grep -c "check_completeness.py\|gap-analyst\|design-synthesizer\|token-composer\|html-visualizer\|completions.md" superui/skills/design-system-completer/SKILL.md` — all referenced
- Read-through: every `!` preload line is shell-portable (no unquoted `?`/`*`/`[` args)

### Approach
1. Frontmatter: `name: design-system-completer`; description = narrow CSO ("Validates an EXTRACTED design system (.superui/design-system/) for completeness gaps and, only with explicit user approval, designs the missing pieces with marked provenance. Use when the user asks to fill gaps in the design system, check design-system completeness, add missing states/dark coverage/token roles, or re-apply syntheses after re-extraction. Requires an existing extraction — does not extract, does not read screenshots. Distinct from design-system-extractor (measurement) and design-system-guardian (enforcement)."); `allowed-tools: Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*)`.
2. Python preflight: same `!`-preload block as the extractor (`sh "${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_python.sh"`), same PYTHON_MISSING/PYTHON_OK handling, interpreter forwarded to Bash-bearing agents (token-composer).
3. Ground rules mirroring the extractor's: orchestrator does no worker work (exception below); one writer per file (dtcg.yml only via token-composer); workers never talk to the user; re-dispatch convention capped at two rounds; trust the scripts. Sibling-path convention stated once: extractor-owned scripts/references are addressed as `${CLAUDE_SKILL_DIR}/../design-system-extractor/scripts/...` and `.../references/...`; pro-designer references as `${CLAUDE_SKILL_DIR}/../pro-designer/references/`. Paths: `<out>` = `.superui/design-system/` (user may override), `<run>` = `.temp/design-system-completer/<out-dir-basename>/`.
4. Checklist steps: 1 Gate [you] — `<out>/DESIGN.md` + `<out>/dtcg.yml` must exist, else point at design-system-extractor and stop; `mkdir` `<run>`. 2 Facts [script] — `python .../check_completeness.py <out> <run>/completeness-facts.md`. 3 Judge [gap-analyst x1] — facts + checklist refs (+ `<out>/completions.md` when present) → `<run>/gap-report.md`. 4 Approval GATE [you + user] — present the report grouped by category with `[G<n>]` ids; the user approves per gap or per category; nothing approved → present the report and STOP (validation-only is a successful run). 5 Synthesis fan-out [design-synthesizer, xN parallel ~5] — one per approved scope; collect the `SYNTHESIZED-TOKENS:` blocks into `<run>/synthesized-tokens.md`. 6 Merge [token-composer x1, merge job — only if synthesized tokens exist] — inputs as the extractor's step 11 plus the synthesized marking; then regenerate `tokens.css` and run `check_spec_tokens.py` (rename handling identical to the extractor's step 11). 7 Sheets [html-visualizer, xN parallel] — one per new/changed spec; then `build_index.py` + `lint_previews.py` with re-dispatch on lint hits. 8 Bookkeeping [you] — append applied entries to `<out>/completions.md` and synthesized components to `inventory.md` `## Synthesized` (mechanical transcription of approved entries — the sole orchestrator-write exception, no judgment involved; parallel workers must not contend for these two files). 9 Present results [you] — artifact paths, applied/declined gap counts, `NEEDS INPUT` items.
5. Contracts section spelling out (verbatim formats): the gap-entry line (Task 2), the SYNTHESIZED-TOKENS list (Task 3), the `completions.md` ledger (`## Tokens`: `- <token.name> = <value> (synthesized — <rationale>; run: <run-slug>)`; `## Specs`: `- <slug> — <whole spec | sections: <list>> (run: <run-slug>)`), and the inventory `## Synthesized` entry (`- <slug> — <Display name> · atomic|composite · synthesized (no canonical screen) · states: <list>`).

### Edge cases
- No extraction present → step-1 gate stops with a pointer to design-system-extractor (never scaffolds `<out>` itself).
- Re-apply run: `now-measured` ledger entries are dropped from the ledger during bookkeeping; only `still-missing` approved entries are re-synthesized.
- User approves zero token gaps but some spec gaps → steps 6 skipped, 7–8 still run.

### Contracts
- Introduces the four verbatim formats above; consumes the facts-file sections (Task 1), the `[G<n>]` entries (Task 2), the SYNTHESIZED-TOKENS block (Task 3) and the provenance vocabulary (Task 4).

### DoD
SKILL.md present with all steps/gates/contracts, plugin.json valid and listing the skill, grep + portability read-through clean.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 — feat(superui): route design gaps to completer in guardian and extractor
- Covers: criteria #5

### Dependencies
- Task 5 — blocks: routes to the skill by its final name

### Files
- modify - superui/skills/design-system-guardian/SKILL.md (Absolutes + Gaps sections)
- modify - superui/skills/design-system-extractor/SKILL.md (Present results step)

### Test Commands
*Build*
- none (markdown only)

*Tests*
- `grep -c "design-system-completer" superui/skills/design-system-guardian/SKILL.md` — ≥ 2
- `grep -c "completions.md" superui/skills/design-system-extractor/SKILL.md` — ≥ 1

### Approach
1. guardian Absolutes: rewrite the writes-there absolute — "NEVER edit anything under `.superui/design-system/` — this skill reads and enforces; only the extraction and completion pipelines (`design-system-extractor`, `design-system-completer`) write there."
2. guardian Gaps: replace the single-pointer bullet with dual routing — a gap the source screenshots COULD show (present but unmeasured) → `design-system-extractor`; a gap the source never contained (missing state, dark coverage, token role, unshown component) → `design-system-completer`, which designs it with marked provenance on the user's approval. Keep the `design-system-gap:` code-comment convention and the proceed-only-on-explicit-call rule unchanged.
3. extractor "Present results": add one line — when `<out>/completions.md` exists, report that this re-extraction regenerated the artifacts wholesale and previous syntheses were overwritten; suggest running `design-system-completer` to re-validate and re-apply them.

### Edge cases
- none

### Contracts
- consumes: the skill name `design-system-completer` and the `<out>/completions.md` ledger location (Task 5).

### DoD
Both files updated; guardian remains read-only towards `.superui/design-system/`; no other guardian rules altered.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 — docs(superui): document the gap-completion phase in superui/CLAUDE.md
- Covers: criteria #7

### Dependencies
- Task 5 — blocks: documents final names/paths
- Task 6 — blocks: documents the amended routing

### Files
- modify - superui/CLAUDE.md (Skills, Agents, Layout, Architecture invariants, Scripts inventory)
- modify - CLAUDE.md (repo root — the two "eight extraction agents/workers" mentions become stale at ten agents)

### Test Commands
*Build*
- `python3 -c "import json; json.load(open('superui/.claude-plugin/plugin.json'))"` — exit 0 (final catalog sanity)

*Tests*
- Read-through: every new file (skill, 2 agents, script) and both amended invariants appear; no contradiction with the root CLAUDE.md remains

### Approach
1. Skills section: add `design-system-completer` (two-stage gap validation + user-gated synthesis; provenance flag; ledger; sibling-path reuse of extractor scripts/references).
2. Agents section: add `gap-analyst` and `design-synthesizer` with their one-line contracts.
3. Architecture invariants: amend "Design artifacts location"/single-writer wording — extraction AND completion pipelines write under `.superui/design-system/`; `dtcg.yml` still only via `token-composer`; add the provenance canon (`$extensions.org.superui.synthesized`, `**Provenance:**` line, `> SYNTHESIZED:` marker — coordinated vocabulary across token-composer/fidelity-reviewer/html-visualizer, like the dark canon) and the `completions.md` ledger + inventory `## Synthesized` ownership (completer flow, never component-scout).
4. Scripts inventory: add `check_completeness.py` with its one-line CLI contract. Layout tree: add the new skill dir and the two agent files.
5. Root CLAUDE.md: update the superui summary's agent count/wording in "What this repo is" ("dispatching eight extraction agents") and in the self-documentation invariant ("superui's eight extraction workers") to cover the two completion workers; change nothing else at root.

### Edge cases
- none

### Contracts
- none

### DoD
superui/CLAUDE.md fully reflects the shipped state; plugin.json parses; catalog (`skills[]`+`agents[]`), CLAUDE.md and the actual files list identically.

<!-- /TASK -->
