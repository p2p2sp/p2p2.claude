
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


### Covered criteria
1. `superui/skills/design-system-completer/SKILL.md` exists: CSO-routable description (triggers: fill gaps / check completeness of the design system / add missing states), Python preflight, orchestrator ground rules, and an ordered checklist with a hard user-approval gate between gap report and synthesis; `"./skills/design-system-completer/"` is in `superui/.claude-plugin/plugin.json` `skills[]`.
6. The completer SKILL.md specifies all handoff contracts: gap-report entry format, synthesized-tokens list format (token-composer merge input), `completions.md` ledger format, and the `inventory.md` `## Synthesized` entry format.
