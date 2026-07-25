## Output Format

### Strengths

- `check_completeness.py` (superui/skills/design-system-completer/scripts/check_completeness.py) mirrors
  `validate_tokens.py`'s walk/alias/type conventions exactly (same `ALIAS_RE`, same `$extensions.org.superui`
  accessor pattern), self-verifies its own output by re-reading the written file, and leaves no partial file
  on any failure path. Verified by direct execution against a hand-built fixture (color group with one dark-
  flagged token, one missing-dark token, one alias, one synthesized token; a `components/button.md` with a
  `## States` table; a `patterns/list.md` without one) - all four `## ` sections appeared with correct facts,
  exit 0. The missing-dir case exited 1 with a one-line error. A third ad-hoc test (empty `dtcg.yml`, no
  components/patterns dirs) correctly produced "none found" facts at exit 0, and a malformed-YAML fixture
  correctly exited 1 with the parser's message and no output file - all edge cases the plan called out.
- `gap-analyst.md` and `design-synthesizer.md` (superui/agents/) follow the repo's agent-authoring pattern
  precisely: frontmatter scope guards ("Spawn exactly one" / "Spawn one per approved scope, in parallel"),
  input→work→output bodies with no caller narrative, and hard rules that back the doctrine (gap-analyst never
  proposes a fill value; design-synthesizer never edits `dtcg.yml`/tokens.css/inventory.md). The `[G<n>]` gap-
  entry format and `SYNTHESIZED-TOKENS:` list format are byte-identical between the agents and the completer
  SKILL.md's Contracts section - the handoff chain is airtight.
- Task 4's provenance wiring is exactly scoped: `token-composer.md` writes the flag only on
  `SYNTHESIZED-TOKENS` entries and explicitly preserves a pre-existing flag across merge; `fidelity-reviewer.md`
  excludes flagged tokens and provenance-marked specs/sections from comparison (not as a mismatch) and reports
  a skipped count; `html-visualizer.md` reuses the existing `.needs-input` chrome class for `> SYNTHESIZED:`
  and renders the `**Provenance:**` line in the existing `.sheet-header` - no new chrome introduced, matching
  the plan's "no new chrome classes" constraint.
- `design-system-completer/SKILL.md` is a complete, well-gated 9-step checklist matching the extractor's own
  authoring pattern (preflight, ground rules, sibling-path convention, re-dispatch convention capped at two
  rounds). Every sibling path it references (`design-system-foundations.md`, `component-spec.md`,
  `dtcg-token-format.md`, `example-component-spec.md`, `tokens.template.yaml`, `sheet.template.html`,
  `validate_tokens.py`, `tokens_to_css.py`, `check_spec_tokens.py`, `build_index.py`, `lint_previews.py`,
  `pro-designer/references/components-states.md`) was verified to exist on disk.
- Task 6 changes are minimal and surgical: guardian's writes-there absolute now names both pipelines, its Gaps
  section correctly dual-routes (measurable→extractor, absent-from-source→completer), and nothing else in the
  guardian was touched. The extractor's "Present results" step gained exactly the one line the plan specified,
  conditioned on `<out>/completions.md` existing.
- Task 7's documentation is thorough and internally consistent: `superui/CLAUDE.md` documents the new skill,
  both agents, the script, the ledger, and the provenance canon as a first-class invariant parallel to the
  dark canon. The root `CLAUDE.md`'s two "eight extraction agents" mentions were handled correctly, not just
  mechanically - the "What this repo is" bullet was rescoped to describe the extractor's own agent count
  specifically (still accurate) while adding a separate clause for the two completion agents, and the
  self-documentation invariant now explicitly reads "superui's ten agents - eight extraction workers plus the
  two completion workers."
- `plugin.json` parses as valid JSON, lists all 4 skills and 10 agents with no worker appearing in both lists,
  and a `git diff --stat` against the pre-plan commit shows the changeset touches exactly the files the plan
  names - nothing extraneous, nothing missing (component-scout.md, correctly, was left untouched since the
  plan reserves `## Synthesized` bookkeeping to the completer's orchestrator step alone).

### Issues

None found. All 7 tasks' acceptance criteria were checked against the actual files (not just descriptions)
and all passed, including running the script live against constructed fixtures rather than trusting the
plan's Test Commands section by inspection alone.

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
None. (The plan's own Test Commands were reproduced and passed; no gaps or rough edges surfaced during
read-through of any of the 12 changed/added files.)

### Recommendations

- None beyond what's already planned. A natural follow-up (out of scope for this plan) would be an actual
  end-to-end dry run of the completer pipeline against a real `.superui/design-system/` extraction once one
  exists in a consuming project, to catch any agent-dispatch friction that a static read-through can't surface
  - but that is integration testing beyond this repo's markdown/JSON/script-only verification model, and the
  plan's own DoD (script runs + careful reading) was fully satisfied here.

### Assessment

**Ready to merge?** Yes

**Reasoning:** Every acceptance criterion (1–7) is met by the actual shipped files, the new script behaves
exactly per its documented contract under live execution including edge cases, the agent/skill handoff
contracts are verbatim-consistent across all five touched files, and the changeset is precisely scoped with
no collateral edits or omissions.
