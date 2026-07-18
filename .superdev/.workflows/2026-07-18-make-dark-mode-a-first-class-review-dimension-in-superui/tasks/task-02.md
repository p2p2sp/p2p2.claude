
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


### Covered criteria
3. `design-director.md` records `CONTRAST-PAIRS:` entries with a leading theme column in a single
   section, and verifies dark pairs with `check_contrast.py` before writing them.
4. `design-director.md` obliges complete dark coverage when the brief says dark is wanted, and
   forbids any dark value when it does not; exactly one `design-director` dispatch remains.
5. `design-system-creator/SKILL.md` step 2 asks the user explicitly whether the system needs dark
   mode and records the answer in `<run>/brief.md`.
6. `design-system-creator/SKILL.md` step 4 GATE additionally requires dark `CONTRAST-PAIRS` entries
   when the brief asked for dark.
