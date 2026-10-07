# superui - the design-advisory plugin

superui ships one model-invoked skill, `pro-designer`, that holds any interface the host builds or reviews to professional UI/UX standards and measures WCAG contrast. This node owns the plugin shell (manifest, README, its one runtime dependency); the skill's body, references and scripts belong to `superui/skills/CLAUDE.md`.

## Relationships

- Child node: `superui/skills/CLAUDE.md` - the `pro-designer` skill, its references and its two bundled scripts.
- `.claude-plugin/plugin.json` `skills[]` lists `./skills/pro-designer/` and is the catalog of record; there is no `agents[]`, no `hooks/`, no manifest injection.
- Tested by `tests/superui/` (outside the plugin): the contrast checker and the Node preflight script.

## Contracts

- Runtime dependency: Node.js 22.6 or newer, optional, used only for the contrast check. The bundled `.ts` runs through Node's native type stripping (no build, no `npm install`); without a usable Node the skill skips that one check with a note and every other step runs.
- The skill calls its scripts through an interpreter (`sh`, then the resolved `node` command), pre-approved by `Bash(sh:*)` and `Bash(node:*)` in its `allowed-tools`.
- The skill works with the host's existing design system and never overwrites it: it proposes and critiques, the user decides.

## Change together

- The Node minimum (22.6) sits in `skills/pro-designer/scripts/check_node.sh`, the skill's skip note in `SKILL.md`, `superui/README.md` and the root `README.md` requirements table.
- The plugin description is duplicated in `.claude-plugin/plugin.json` and the superui entry of the root `.claude-plugin/marketplace.json`.
