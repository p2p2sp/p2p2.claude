# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Make dark mode a first-class review dimension in superui"

---
<!-- HEADER -->

## Goal
Every dark value superui writes is verified before it ships: contrast is checked per theme (two
pair sets, two runs, separate exit codes) in both the auditor and the creator, dark pixels get a
dedicated fidelity-review scope in the extractor, and a "dark: yes" brief obliges `design-director`
to full, contrast-verified dark coverage enforced by a mechanical gate.

## Context
superui writes dark values (`foundation-analyst` measures them, `token-composer` stores them in
`$extensions.org.superui.dark`) but never verifies them. `fidelity-reviewer.md` does not mention
dark at all, the auditor's contrast pre-pass reads only `tokens.css` `:root`, and in the creative
head dark is a parenthetical in `design-director.md` step 3 whose values reach no contrast check.
Result: the default theme is well fitted, the second theme has holes. This plan closes the review
gap without touching the token format — the light/dark axis stays closed and every change is
additive in the verification layer. Editing markdown here IS shipping: there is no build, test, or
lint at any level, so verification is textual and structural.

## Acceptance criteria
1. `design-system-auditor/SKILL.md` step 3 builds two pair files (`contrast-pairs-light.json` from
   `:root`, `contrast-pairs-dark.json` from `.dark`) and runs `check_contrast.py --json` once per
   file, with an absent or empty `.dark` block recorded as an explicit skip note, never a failure.
   Alias values are dereferenced to a literal before the pair is written; an unresolvable one is
   skipped like an alpha-bearing value, never handed to `check_contrast.py`.
2. The auditor's report `### System health` section carries both contrast runs as separate,
   theme-labeled verbatim blocks.
3. `design-director.md` records `CONTRAST-PAIRS:` entries with a leading theme column in a single
   section, and verifies dark pairs with `check_contrast.py` before writing them.
4. `design-director.md` obliges complete dark coverage when the brief says dark is wanted, and
   forbids any dark value when it does not; exactly one `design-director` dispatch remains.
5. `design-system-creator/SKILL.md` step 2 asks the user explicitly whether the system needs dark
   mode and records the answer in `<run>/brief.md`.
6. `design-system-creator/SKILL.md` step 4 GATE additionally requires dark `CONTRAST-PAIRS` entries
   when the brief asked for dark.
7. `design-system-creator/SKILL.md` step 7 splits contrast QA per theme, resolves a dark entry
   through `$extensions.org.superui.dark` with a `$value` fallback, and scopes each
   `design-director` re-dispatch to the failing pairs of ONE theme, run sequentially; both themes
   share the unchanged two-round cap.
8. `design-system-extractor/SKILL.md` step 7 dispatches one additional dark scope, only when the
   source map reports dark screens.
9. `fidelity-reviewer.md` handles a dark scope with colour-only checks (surface/elevation order,
   accent discipline, dark-value spot-check) and does not repeat geometry or state checks there.
10. `superui/CLAUDE.md` "Dark-mode canon" states that dark is verified: two contrast runs and a
    conditional dark fidelity scope.
11. `superui/.claude-plugin/plugin.json` is byte-identical to its pre-change state, and no Python
    script, doc-chrome asset, or spec-producing agent is modified.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 — feat(superui): split the auditor contrast pre-pass per theme
- Covers: criteria #1, #2

### Dependencies
- none — blocks: Task 5

### Files
- modify - superui/skills/design-system-auditor/SKILL.md (step 3 "Deterministic pre-pass" Contrast bullet; "Report structure" item 2)

### Test Commands
*Build*
- none (markdown source; no build at any level in this repo)

*Tests*
- `grep -n "contrast-pairs-light.json\|contrast-pairs-dark.json" superui/skills/design-system-auditor/SKILL.md` — expect both filenames present
- `grep -c 'check_contrast.py" --json' superui/skills/design-system-auditor/SKILL.md` — expect 2 (returns 1 today). Match the closing quote: the path is written `"${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.py" --json`, so a bare `check_contrast.py --json` never occurs; and a bare `check_contrast.py` would also count this task's own prose mention of `parse_color()`.
- `grep -n -A 4 "## Operational findings" superui/skills/design-system-auditor/SKILL.md` — expect the System health description to name two theme-labeled contrast blocks (today it reads "validator + contrast output, verbatim lines", with no theme labeling)
- `grep -n "contrast-pairs.json" superui/skills/design-system-auditor/SKILL.md` — expect no bare (unsuffixed) hit remaining

### Approach
1. In step 3, replace the single Contrast bullet with a two-run bullet: build the SAME token roles
   twice — once from `<sys>/tokens.css` `:root` into `<run>/contrast-pairs-light.json`, once from
   the `.dark` block into `<run>/contrast-pairs-dark.json`, a token with no dark override taking its
   inherited `:root` value — then run `check_contrast.py --json` once per file.
2. Keep the existing pair-selection rule verbatim (pairs `DESIGN.md`'s accessibility/theming
   sections name; when they name none, each text role on each surface role and each `on-<bg>` role
   on its own `<bg>`; skip alpha-bearing values) — state it once, applied to both themes. Add the
   literal-resolution rule: `tokens_to_css.py` emits alias tokens as `var(--target-path)` in BOTH
   blocks and `check_contrast.py` `parse_color()` accepts only `#rgb`, `#rrggbb`, `rgb(r,g,b)`, so
   dereference every `var(--x)` chain to its literal before writing the pair; a value that resolves
   to no literal is skipped exactly like an alpha-bearing one. Resolution is THEME-AWARE: a
   `var(--x)` in the dark set resolves to `.dark`'s `--x` when `.dark` declares it, else to
   `:root`'s. Resolving a dark alias straight against `:root` silently re-checks the light value
   and makes the dark run mirror the light one.
3. State the skip rule: `tokens.css` carries no `.dark` block or the block declares nothing ->
   record a one-line skip note for the dark run and continue; never a failure, never a stop.
4. In "Report structure" item 2, change the `### System health` description so the contrast output
   appears as two theme-labeled verbatim blocks (light, dark or its skip note).
5. Leave the step-3 GATE line, the validators, the scanner, and the known-gap grep untouched.

### Edge cases
- No `.dark` block, or a `.dark` block with zero declarations -> skip note, exit-code irrelevant.
- Alpha-bearing dark values -> skipped exactly as on the light side.
- An alias that cannot be dereferenced to a literal -> skipped with the same note; never passed to
  `check_contrast.py`, whose `parse_color()` would raise and take the whole run non-zero.
- `check_contrast.py` exit 1 on either run -> a System health finding, not a stop (matches the
  existing "a broken system is itself a finding, not a stop" rule).

### Contracts
- `<run>/contrast-pairs-light.json`, `<run>/contrast-pairs-dark.json` — existing
  `check_contrast.py --json` item shape, unchanged: `{"fg","bg","type","label"}`. No `theme` field;
  the theme is the file.

### DoD
Step 3 describes two pair files and two runs with the skip rule; the report structure names two
theme-labeled contrast blocks; no other section of the file changed.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 — feat(superui): make dark a gated, obligatory decision in the creative head
- Covers: criteria #3, #4, #5, #6

### Dependencies
- none — blocks: Task 3 (step 7 consumes the theme-columned `CONTRAST-PAIRS`), Task 5

### Files
- modify - superui/agents/design-director.md (Method step 3 and 4; Output notes-colors.md `CONTRAST-PAIRS:` line; the dark-inline sentence in the "Output — four notes files" preamble, scoped to finding lines)
- modify - superui/skills/design-system-creator/SKILL.md (step 2 Interview; step 4 GATE)

### Test Commands
*Build*
- none

*Tests*
- `grep -n "CONTRAST-PAIRS" superui/agents/design-director.md` — expect the entry format to carry a leading `<theme>` field
- `grep -c "CONTRAST-PAIRS:" superui/agents/design-director.md` — expect 1 (one section, not two)
- `grep -n "per-pair verification" superui/agents/design-director.md` — expect the new scoping of the dark-inline rule (zero hits today; `finding line` alone already matches and would be vacuous)
- `grep -n "dark" superui/skills/design-system-creator/SKILL.md` — expect hits in step 2 and step 4
- `grep -n "Spawn exactly one" superui/agents/design-director.md` — expect the single-dispatch rule intact

### Approach
1. In `design-director.md` Method step 3, promote dark from the `(incl. dark)` parenthetical to an
   explicit obligation keyed on the brief: brief asks for dark -> every colour token whose role
   differs in dark carries a dark value; brief does not -> no dark value at all (never fabricate).
2. In Method step 4, extend the existing before-writing verification to dark pairs, so the
   prevention-over-correction rule covers both themes.
3. In the `notes-colors.md` output bullet, change the `CONTRAST-PAIRS:` entry format to
   `- <theme> · <fg-token> on <bg-token> (<type>): <ratio> PASS`, keeping ONE section. Scope the
   inline hard rule explicitly in the same file so the two cannot be read as conflicting: the
   "dark value inline on the same finding line, never a separate section" rule governs the notes'
   token FINDING lines (a token's dark value beside its light value); `CONTRAST-PAIRS` rows are
   per-pair verification records, one row per checked pair, so a dark row is neither a separate
   section nor a violation.
4. In `design-system-creator/SKILL.md` step 2, add the dark question to the prose interview list
   (one question per turn, no forms), answer written to `<run>/brief.md` with the other answers.
5. In step 4, extend the GATE with the mechanical condition: brief asked for dark -> `CONTRAST-PAIRS`
   in `<run>/notes-colors.md` contains dark entries; missing -> re-dispatch per the RE-DISPATCH
   CONVENTION, capped at two rounds, after which the residue is carried to the user as
   `> NEEDS INPUT`. The creator has no global remediation cap in its ground rules, so this gate
   states its own — an uncapped loop would otherwise be unbounded.

### Edge cases
- Brief says no dark -> gate requires NO dark entries; a dark value present is itself a violation.
- User is undecided -> treated as no dark, stated in the brief, so nothing is fabricated.
- Re-dispatch on a failed dark gate is bounded by the two-round cap this task adds to step 4; the
  creator's other bounds (step 5's two-rejection rule, step 7's contrast cap) do not cover it.

### Contracts
- `CONTRAST-PAIRS:` entry: `- <theme> · <fg-token> on <bg-token> (<type>): <ratio> PASS`, `<theme>`
  being `light` or `dark`; consumed by `design-system-creator` step 7.
- `<run>/brief.md` gains a dark-mode answer; no schema, prose as with every other brief answer.

### DoD
`design-director.md` obliges or forbids dark coverage per the brief and verifies dark pairs before
writing; the `CONTRAST-PAIRS` format carries a theme column in one section; the creator asks the
dark question and gates step 4 on dark entries; the single-dispatch rule is untouched.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 — feat(superui): split the creator contrast QA per theme
- Covers: criteria #7

### Dependencies
- Task 2 — blocks: Task 5

### Files
- modify - superui/skills/design-system-creator/SKILL.md (step 7 "Contrast QA")

### Test Commands
*Build*
- none

*Tests*
- `grep -n "org.superui.dark" superui/skills/design-system-creator/SKILL.md` — expect step 7's dark resolution rule (zero hits today)
- `grep -n -A 25 "### 7 — Contrast QA" superui/skills/design-system-creator/SKILL.md` — read for the sequential per-theme re-dispatch (a bare `one at a time` grep already matches the step-40 ground rule and would be vacuous)
- `grep -n "two rounds\|Cap remediation" superui/skills/design-system-creator/SKILL.md` — expect the cap unchanged

### Approach
1. In step 7, split the re-run of `check_contrast.py` by the `CONTRAST-PAIRS` theme column: the
   light entries and the dark entries are verified as two runs against the FINAL `<out>/dtcg.yml`
   values, keeping the existing composer-rename resolution. State the per-theme resolution rule —
   a `light` entry resolves each token to `$value`; a `dark` entry resolves it to
   `$extensions.org.superui.dark`, falling back to `$value` when the token carries no dark
   override — and dereference alias chains to a literal before the check, skipping any value that
   resolves to none (same rule as the auditor pre-pass). Without this the dark run re-checks light
   values and can only mirror the light result.
2. Scope the remediation loop: a failing run re-dispatches `design-director` with the failing pairs
   of THAT theme only, so a corrected palette is never derived from mixed-theme constraints.
   Per-theme re-dispatches run SEQUENTIALLY — never two `design-director` instances at once, per
   its "Spawn exactly one" rule and the creator's "one at a time, never in parallel with itself"
   ground rule.
3. Leave the three remediation sub-steps (re-dispatch, `token-composer` merge + `tokens_to_css.py`,
   re-check), the two-round cap, and the `> NEEDS INPUT` carry-over unchanged.

### Edge cases
- Brief said no dark -> no dark entries exist -> only the light run happens; absence is not a failure.
- Both themes fail -> both are remediated inside the SAME two-round cap; a round may carry one
  re-dispatch per failing theme, run one after the other. The cap never becomes four rounds.

### Contracts
- Consumes the Task 2 `CONTRAST-PAIRS` entry format; produces nothing new.

### DoD
Step 7 verifies each theme separately and scopes each re-dispatch to one theme's failing pairs, with
the existing cap and NEEDS INPUT behaviour intact.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 — feat(superui): add a conditional dark fidelity-review scope
- Covers: criteria #8, #9

### Dependencies
- none — blocks: Task 5

### Files
- modify - superui/skills/design-system-extractor/SKILL.md (step 7 "Fidelity review fan-out")
- modify - superui/agents/fidelity-reviewer.md ("Inputs you are given"; "What to do")

### Test Commands
*Build*
- none

*Tests*
- `grep -n "dark" superui/skills/design-system-extractor/SKILL.md` — expect the conditional dark scope in step 7
- `grep -n "dark" superui/agents/fidelity-reviewer.md` — expect the dark-scope handling
- `grep -n "provenance: designed" superui/agents/fidelity-reviewer.md` — expect the root-marker wholesale skip intact

### Approach
1. In extractor step 7, add one dark scope to the fan-out list, conditional on
   `<run>/source-map.md`'s `## Dark-mode coverage` reporting dark screens — no dark screens, no
   extra dispatch. It gets the dark screens, the artifact paths, the sampler path, and output
   `<run>/review-dark.md`; routing of its mismatches follows the existing re-dispatch convention.
2. In `fidelity-reviewer.md` "Inputs you are given", state that the verification scope may be a
   dark scope (the dark screens plus their light counterparts).
3. In "What to do", add the dark-scope branch: run only the colour-bearing checks — surface and
   elevation order on the dark screens via `--regions`, accent discipline in dark, and a spot-check
   of `$extensions.org.superui.dark` values against the dark pixels. State explicitly that geometry,
   radii, and state form are theme-invariant and are NOT re-checked in a dark scope.
4. Leave the root-provenance wholesale skip, the synthesized skips, the report format, and the hard
   rules untouched.

### Edge cases
- Dark screens exist but no token carries a dark value -> report it as a finding, not silence.
- A dark screen with no light counterpart -> order and accent checks still apply; pair-based
  comparison is reported as uncertainty per the existing uncertainty rule.
- Root marker `provenance: designed` -> the dark scope is skipped wholesale like every other scope.

### Contracts
- `<run>/review-dark.md` — the existing fidelity report format, no new fields.

### DoD
The extractor dispatches a dark scope only when dark screens exist, and `fidelity-reviewer` runs
colour-only checks for it without repeating theme-invariant checks.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 — docs(superui): record dark verification in the dark-mode canon
- Covers: criteria #10, #11

### Dependencies
- Task 1, Task 2, Task 3, Task 4 — blocks: nothing

### Files
- modify - superui/CLAUDE.md ("Dark-mode canon" invariant)

### Test Commands
*Build*
- none

*Tests*
- `grep -n -A 20 "Dark-mode canon" superui/CLAUDE.md` — expect the verification sentence present
- `git log -1 --format=%s -- superui/.claude-plugin/plugin.json` — expect a subject predating this
  plan (NOT one of Task 1-4's commit subjects). A working-tree `git diff` is vacuous here:
  `simplebuild` commits per task, so by Task 5 the tree is clean either way.
- `git log -1 --format=%s -- superui/scripts/ superui/assets/` — same expectation
- `git log -1 --format=%s -- superui/agents/spec-writer.md superui/agents/spec-designer.md` — same expectation (specs stay light-only; a blanket `superui/agents/` check is impossible because Tasks 2 and 4 legitimately modify `design-director.md` and `fidelity-reviewer.md`)

### Approach
1. Extend the "Dark-mode canon" invariant with the verification half: dark is checked by two
   contrast runs (auditor pre-pass and creator step 7, one pair file per theme) and by a
   conditional dark fidelity scope in the extractor.
2. Note that the creative head gates dark coverage on the brief, so an unrequested dark theme is
   never fabricated.
3. Keep the existing canon text (the `$extensions.org.superui.dark` literal, the whole-page toggle,
   the `sheet.template.html` / `build_index.py` duplication warning) verbatim — this is an addition,
   not a rewrite.
4. Verify the untouched surfaces with the three `git log -1` commands above.

### Edge cases
- none

### Contracts
- none

### DoD
The canon documents dark verification; `plugin.json`, the Python scripts, the doc-chrome assets, and
the two spec-producing agents (`spec-writer.md`, `spec-designer.md`) carry no commit from this plan.

<!-- /TASK -->
