
## Task 1 - feat(superui): split the auditor contrast pre-pass per theme
- Covers: criteria #1, #2

### Dependencies
- none - blocks: Task 5

### Files
- modify - superui/skills/design-system-auditor/SKILL.md (step 3 "Deterministic pre-pass" Contrast bullet; "Report structure" item 2)

### Test Commands
*Build*
- none (markdown source; no build at any level in this repo)

*Tests*
- `grep -n "contrast-pairs-light.json\|contrast-pairs-dark.json" superui/skills/design-system-auditor/SKILL.md` - expect both filenames present
- `grep -c 'check_contrast.py" --json' superui/skills/design-system-auditor/SKILL.md` - expect 2 (returns 1 today). Match the closing quote: the path is written `"${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.py" --json`, so a bare `check_contrast.py --json` never occurs; and a bare `check_contrast.py` would also count this task's own prose mention of `parse_color()`.
- `grep -n -A 4 "## Operational findings" superui/skills/design-system-auditor/SKILL.md` - expect the System health description to name two theme-labeled contrast blocks (today it reads "validator + contrast output, verbatim lines", with no theme labeling)
- `grep -n "contrast-pairs.json" superui/skills/design-system-auditor/SKILL.md` - expect no bare (unsuffixed) hit remaining

### Approach
1. In step 3, replace the single Contrast bullet with a two-run bullet: build the SAME token roles
   twice - once from `<sys>/tokens.css` `:root` into `<run>/contrast-pairs-light.json`, once from
   the `.dark` block into `<run>/contrast-pairs-dark.json`, a token with no dark override taking its
   inherited `:root` value - then run `check_contrast.py --json` once per file.
2. Keep the existing pair-selection rule verbatim (pairs `DESIGN.md`'s accessibility/theming
   sections name; when they name none, each text role on each surface role and each `on-<bg>` role
   on its own `<bg>`; skip alpha-bearing values) - state it once, applied to both themes. Add the
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
- `<run>/contrast-pairs-light.json`, `<run>/contrast-pairs-dark.json` - existing
  `check_contrast.py --json` item shape, unchanged: `{"fg","bg","type","label"}`. No `theme` field;
  the theme is the file.

### DoD
Step 3 describes two pair files and two runs with the skip rule; the report structure names two
theme-labeled contrast blocks; no other section of the file changed.


### Covered criteria
1. `design-system-auditor/SKILL.md` step 3 builds two pair files (`contrast-pairs-light.json` from
   `:root`, `contrast-pairs-dark.json` from `.dark`) and runs `check_contrast.py --json` once per
   file, with an absent or empty `.dark` block recorded as an explicit skip note, never a failure.
   Alias values are dereferenced to a literal before the pair is written; an unresolvable one is
   skipped like an alpha-bearing value, never handed to `check_contrast.py`.
2. The auditor's report `### System health` section carries both contrast runs as separate,
   theme-labeled verbatim blocks.
