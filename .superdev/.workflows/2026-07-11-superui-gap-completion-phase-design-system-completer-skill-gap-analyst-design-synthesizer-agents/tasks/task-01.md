
## Task 1 - feat(superui): add check_completeness.py facts extractor
- Covers: criteria #2

### Dependencies
- none

### Files
- add - superui/skills/design-system-completer/scripts/check_completeness.py (main, load_tokens, tier_facts, dark_facts, spec_state_facts, provenance_facts)

### Test Commands
*Build*
- `python3 -m py_compile superui/skills/design-system-completer/scripts/check_completeness.py` - exit 0

*Tests*
- Build a minimal fixture under `.temp/fixtures/ds-min/` (a `dtcg.yml` with one color group where one token has `$extensions.org.superui.dark` and one lacks it, one alias token, one token with `$extensions.org.superui.synthesized: true`; `components/button.md` with a `## States` table holding Default and Hover rows; `patterns/list.md` without `## States`), then `python3 superui/skills/design-system-completer/scripts/check_completeness.py .temp/fixtures/ds-min .temp/fixtures/out.md` - exit 0 and `out.md` contains all four `## ` sections with the expected entries
- `python3 superui/skills/design-system-completer/scripts/check_completeness.py .temp/fixtures/nonexistent .temp/fixtures/out2.md` - exit 1 with a one-line error

### Approach
1. Write a stdlib+pyyaml script (mirror the loading/walking style of `superui/skills/design-system-extractor/scripts/validate_tokens.py`, incl. its token-vs-group walk and `$extensions` access): CLI `check_completeness.py DESIGN_SYSTEM_DIR OUT.md`, header comment with the I/O contract, self-verifying (re-read the written file; any I/O or parse failure prints one error line and exits 1).
2. `tier_facts(tokens)` - top-level groups with token counts; per group: raw-value count vs alias count (a string `$value` matching `{...}` is an alias); flag which of the three tiers appear (primitive = groups holding raw values; semantic = alias-carrying purpose groups; component = component-scoped groups).
3. `dark_facts(tokens)` - total color tokens, count carrying `$extensions.org.superui.dark`, and when that count is > 0, the list of color tokens lacking it; when 0, a single "no dark theme detected" line.
4. `spec_state_facts(dir)` - for every `components/*.md` and `patterns/*.md`: whether `## States` exists and the row names parsed from the first cell of its `|`-table rows (facts only - no judgment about which states SHOULD exist).
5. `provenance_facts(dir, tokens)` - tokens already flagged `org.superui.synthesized`, spec files containing a `**Provenance:**` line or `> SYNTHESIZED:` marker, and whether `completions.md` exists (list its `- ` entries verbatim).

### Edge cases
- `dtcg.yml` present but `components/`/`patterns/` absent or empty → facts sections state "none found", exit 0.
- Malformed YAML → exit 1 with the parser message (no partial output file left behind).
- A spec `## States` section without a table → "no state rows found" fact, not an error.

### Contracts
- Facts file (OUT.md) sections, each a `## ` heading: `## Tier facts`, `## Dark facts`, `## Spec state facts`, `## Provenance facts`; entries are single `- ` lines. This file is the gap-analyst's primary input (Task 2).

### DoD
Script compiles, both fixture runs behave per Test Commands, header documents CLI + exit codes + output sections.


### Covered criteria
2. `superui/skills/design-system-completer/scripts/check_completeness.py` runs standalone: `<python> check_completeness.py DESIGN_SYSTEM_DIR OUT.md` writes a facts file with four sections (tier facts, dark facts, spec state facts, provenance facts), exit 0 on success (gaps are data, not errors), exit 1 on missing/unreadable `dtcg.yml`; its header comment carries the I/O contract.
