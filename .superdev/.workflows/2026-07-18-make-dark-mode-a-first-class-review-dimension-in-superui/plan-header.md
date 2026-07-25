Title: "Make dark mode a first-class review dimension in superui"


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
gap without touching the token format - the light/dark axis stays closed and every change is
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

