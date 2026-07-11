## Output Format

### Strengths

- Every one of the 10 acceptance criteria is met, and every grep/build/test command listed in the
  plan's Task Test Commands sections passes as written (re-verified live: `plugin.json` JSON-valid,
  `check_python.sh` -> `PYTHON_OK python3`, `validate_tokens.py` usage-error exit 1, all "no stale
  path" greps return zero hits, `check_env.sh` prints the documented `PYTHON`/`MODULE` lines and
  exits 0, the Task 4 provenance-marker fixture validates with 0 errors and `check_completeness.py`
  reports `system provenance: designed (root marker present)`).
- The consolidation in Task 1 is clean and complete: `superui/shared/` is gone, `scripts/`,
  `references/`, `assets/` sit at the plugin root, `component-patterns.md` correctly stayed under the
  extractor, `check_completeness.py` correctly stayed under the completer, pro-designer kept only its
  `references/`. Script header comments were updated to their new paths (verified
  `check_python.sh`).
- `design-system-generator` is a faithful, non-`context: fork` `user-invocable: false` sub-skill
  exactly per the documented harness constraint (a forked subagent can't spawn subagents); its input
  contract, ground rules, and 10-step checklist match the plan's Task 2 approach almost line for line,
  including the re-dispatch convention, the batched-fan-out rule, and the "trust the scripts" clause.
- The extractor (Task 3) and creator (Task 6) are genuinely symmetric heads sharing the tail: both
  gate through `check_python.sh`, both hand off via one `Skill` invocation with the same labeled-arg
  shape (`run:`/`out:`/`spec-producer:`/`provenance:`/optional `source:`/`context:`/`intake:`), both
  relay the generator's return verbatim. The extractor's `allowed-tools` correctly dropped `Bash(cp:*)`
  and gained `Skill`; the generator correctly gained `Bash(cp:*)` for the doc-chrome copy.
- The provenance canon extension (Task 4) is coherent end to end: `token-composer` writes/preserves the
  root marker, `fidelity-reviewer` gates its entire comparison on it, `check_completeness.py` reports
  it under a new `## Provenance facts` section, and `validate_tokens.py` needed no change (confirmed
  live with a correctly-shaped DTCG fixture) because it already skips `$`-prefixed top-level keys.
  `superui/CLAUDE.md`'s "Provenance canon" bullet documents all four markers, writers, and consumers
  consistently with the code.
- `design-director` and `spec-designer` (Task 5) match their agents' contracts precisely: both preload
  `pro-designer` via frontmatter `skills:`, both use the `> NEEDS INPUT` convention instead of ever
  talking to the user, `spec-designer`'s `SYNTHESIZED-TOKENS:` block is byte-for-byte the same shape
  `design-synthesizer` already established, and `design-director`'s synthesized inventory-entry shape
  (`· synthesized (no canonical screen) · states: <list>`) matches the "sanctioned" shape the completer
  already uses in its `## Synthesized` ledger — a genuine, non-obvious cross-plan consistency check
  that holds.
- Documentation sync (Task 7) is unusually thorough: `superui/README.md`, root `README.md`,
  `superui/CLAUDE.md`, and root `CLAUDE.md` all agree on skill/agent counts (7 skills, 12 agents),
  the `shared/scripts` root-level convention sentence was correctly updated to describe superui's
  root-level layout vs. supergh's `shared/` layout, and the manifest was correctly left untouched
  since it names no artifact writers (matching the plan's conditional instruction).
- `check_env.sh` and the `setup` skill honor the script/fork trust invariant precisely: the script is
  self-verifying and always exits 0 (diagnostic data, not failure), and the skill body explicitly says
  "trust its lines verbatim — do not re-verify them."

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- File: `superui/agents/design-doc-writer.md` (unmodified by this plan; dispatched differently by
  `design-system-generator` step 4 for the two heads). The generator's step 4
  (`superui/skills/design-system-generator/SKILL.md:51-52`) hands `design-doc-writer` a brief path
  "as narrative context" when the creator invokes it (`provenance: designed`, no `source:`/no
  `source-map.md`), but `design-doc-writer.md` was never updated to acknowledge this second mode. Its
  own "Evidence only" hard rule ("every claim traces to dtcg.yml, a notes file, or the source map")
  and its step-2 wording ("Principles: only rules **the source** demonstrably shows") are written
  entirely around the measured/extraction case. This mostly self-resolves in practice — the notes
  files `design-director` produces are in the same format `foundation-analyst` produces, so "a notes
  file" already covers the creator path as an allowed evidence source — but the brief itself is never
  named as a legitimate input, and the "the source demonstrably shows" phrasing has no natural reading
  for a system with no source screenshots at all. Failure scenario: a run through `design-system-creator`
  dispatches `design-doc-writer` with a `notes-*.md` set plus `brief.md` and no `source-map.md`; the
  agent's own contract gives it no explicit license to draw principles/theming narrative from the brief,
  so it either ignores the brief (weaker, generic-sounding DESIGN.md prose for a "designed" system) or
  hedges with `> NEEDS INPUT` markers for principles a competent read of the brief would have answered.
  This is best read as a plan gap — Task 2's Files list for `design-system-generator` never included
  `design-doc-writer.md`, even though the generator's own step 4 changes what gets handed to it. Fix:
  add a short "designed systems" note to `design-doc-writer.md` naming the brief as an allowed
  narrative-context source and rephrasing "the source demonstrably shows" to cover both the measured
  and designed cases (e.g. "only rules the evidence — source, notes, or brief — demonstrably shows").

#### Minor (Nice to Have)

- File: `superui/skills/design-system-creator/SKILL.md:104-113` (Contrast QA, step 7). The step
  re-runs `check_contrast.py` "against the FINAL `<out>/dtcg.yml` token values," but `check_contrast.py`
  only accepts literal `#rgb`/`#rrggbb`/`rgb(r,g,b)` strings (confirmed by reading
  `superui/scripts/check_contrast.py`), never token names, and `dtcg.yml` color values are DTCG
  `{colorSpace, components}` objects, not hex strings. The step doesn't spell out the
  token-name -> DTCG-value -> hex/rgb-string resolution the orchestrator has to do inline before
  calling the script. Not a functional blocker (an LLM orchestrator can do this arithmetic inline,
  and the surrounding skill already establishes the pattern of resolving composer renames "first"),
  but a one-line clarification ("read each token's `$value` `components` from `<out>/dtcg.yml` and
  format it as `rgb(r,g,b)` with components scaled 0-255 before calling the script") would remove all
  ambiguity and match this codebase's general preference for spelling out mechanical steps precisely.

### Recommendations

- Consider whether `design-doc-writer.md`'s fix above should also touch its "Theming" bullet
  (`$extensions.org.superui.dark`) — that part is already dtcg.yml-driven and provenance-agnostic, so
  no change needed there; only the "Principles" bullet and the top-level evidence rule need the
  designed-system wording.
- No other cross-file contract drift was found: `component-scout`'s section-format vocabulary,
  `token-composer`'s tier/dark/provenance rules, `fidelity-reviewer`'s skip-and-report rules, and
  `html-visualizer`'s provenance-note rendering are all already generic enough to serve both heads
  without modification, and this plan correctly left them untouched.

### Assessment

**Ready to merge?** Yes

**Reasoning:** All 10 acceptance criteria and every listed test command pass; the two heads/shared-tail
architecture is implemented faithfully and symmetrically; the provenance canon extension is coherent
end to end and independently verified with a live fixture. The one Important finding
(`design-doc-writer.md`'s contract not updated for the creator's brief-driven, source-less dispatch) is
a real but self-mitigating documentation gap — the existing "notes file" evidence clause already covers
most of it — not a broken pipeline; it can be fixed as a small follow-up without blocking merge.
