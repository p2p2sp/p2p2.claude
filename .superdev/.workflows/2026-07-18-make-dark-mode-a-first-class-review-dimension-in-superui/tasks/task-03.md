
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


### Covered criteria
7. `design-system-creator/SKILL.md` step 7 splits contrast QA per theme, resolves a dark entry
   through `$extensions.org.superui.dark` with a `$value` fallback, and scopes each
   `design-director` re-dispatch to the failing pairs of ONE theme, run sequentially; both themes
   share the unchanged two-round cap.
