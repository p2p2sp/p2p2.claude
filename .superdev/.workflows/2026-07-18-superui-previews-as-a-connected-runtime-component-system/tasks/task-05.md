
## Task 5 — feat(superui): html-visualizer emits sheet data instead of HTML
- Covers: criterion #7

### Dependencies
- Task 1 — blocks: schema reference the agent must follow

### Files
- modify - superui/agents/html-visualizer.md (full body rewrite; frontmatter description)

### Test Commands
*Build*
- none (markdown is shipping)

*Tests*
- `grep -c "data.js" superui/agents/html-visualizer.md` — expect >= 3
- `grep -ci "sheet.template" superui/agents/html-visualizer.md` — expect 0
- `grep -q "ds-demo" superui/agents/html-visualizer.md && echo OK` — expect `OK`

### Approach
1. Rewrite as input->work->output (keep the agent name — no plugin.json/agents[] churn): inputs = sheet kind (`component`|`pattern`) + spec path, the `preview-data-format.md` reference path, output `.data.js` path, optionally previous output + findings on re-dispatch. Foundation sheets are no longer this agent's job (scripted).
2. Work: transcribe the spec 1:1 into the schema's `sections[]`; author `demo.variants[v].states[s].markup` once per variant/state with every style value `var(--token-name)`; pattern data composes via `<ds-demo name variant state>` inside `composition.markup` and NEVER inlines another component's markup; colors referenced by token varName only (the runtime shows swatches); `**Provenance:** designed, not extracted` -> `provenance: "designed"`; `> NEEDS INPUT` / `> SYNTHESIZED:` -> `needs-input` sections (synthesized flagged).
3. Self-check before returning: registry key matches `<kind>:<slug>`; no `#hex`/`rgb(`/`hsl(`/non-zero `px` inside any markup string; single registry assignment; end with output path + `self-check: clean`.
4. Keep hard rules: never read screenshots; never edit spec/dtcg.yml/tokens.css/docs.css/components.js or any file other than the one data file; gaps render as needs-input entries, never invented.

### Edge cases
- Spec documents a state the demo markup can't express with tokens alone -> needs-input entry, not a raw value.
- Re-dispatch with lint findings -> regenerate the whole data file honoring them.

### Contracts
- Output = exactly one `.data.js` conforming to `preview-data-format.md` (Task 1).

### DoD
Rewritten agent doc passes the greps, contains the schema reference input, the ds-demo composition rule, and no HTML-authoring instructions.


### Covered criteria
7. `superui/agents/html-visualizer.md` outputs exactly one `<slug>.data.js` per dispatch conforming to `preview-data-format.md`; pattern data references component demos via `<ds-demo name="...">` and never inlines another component's markup; no HTML-authoring instruction remains; provenance/`> NEEDS INPUT`/`> SYNTHESIZED:` become data fields.
