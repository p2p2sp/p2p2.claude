
## Task 6 - refactor(superui): platform-neutral vocabulary in foundation agents
- Covers: criterion #6
- TDD: none

### Dependencies
- none

### Files
- modify - superui/agents/source-scout.md (Screen inventory, Phenomena to measure)
- modify - superui/agents/foundation-analyst.md (Colors coverage, Subtle effects, motion examples)
- modify - superui/agents/design-synthesizer.md (Two duties list)

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. `source-scout.md`: replace "viewport class (desktop/tablet/mobile...)" with a neutral screen-class judgment (form factor and density as observed, named freely); replace the fixed "hover/focus/selected/disabled/error" list with "interaction states as the platform shows them (e.g. pointer hover, press, focus, selected, disabled, error)".
2. `foundation-analyst.md`: replace the surface list "page/canvas, sidebar, content panel, topbar, cards, menus" with "every major region (base canvas, navigation surfaces, content surfaces, raised blocks, overlays)"; rephrase "derive the CSS shadow shorthand yourself" to "derive the shadow value in offset / blur / color notation" keeping the same measurement steps; make the motion examples platform-neutral ("a collapse, an overlay entrance, a transient notification"); "focus ring" in accent locations becomes "focus indicator".
3. `design-synthesizer.md`: "focus ring" -> "focus indicator"; "a 4/8px step ramp" -> "a 4/8 step ramp in reference px"; shadows/gradients wording unchanged otherwise (values keep today's notation - the neutralization is declarative, per the confirmed design).

### Edge cases
- Do not touch the measurement law, duty split, exits, or any token-name prefix (`shadow.*`, `border.*` etc.) - only prose vocabulary changes.

### Contracts
- none

### DoD
`grep -n "CSS\|viewport\|sidebar\|topbar\|hover/focus\|focus ring\|4/8px" superui/agents/source-scout.md superui/agents/foundation-analyst.md superui/agents/design-synthesizer.md` returns zero matches; regression suite green.


### Covered criteria
6. `superui/agents/source-scout.md`, `superui/agents/foundation-analyst.md` and `superui/agents/design-synthesizer.md` carry no web-only vocabulary: screen classes instead of desktop/tablet/mobile viewports, platform-neutral interaction-state and surface wording, shadow described as offset/blur/color measurement notation (not "CSS shadow shorthand"), spacing ramp phrased in reference px.
