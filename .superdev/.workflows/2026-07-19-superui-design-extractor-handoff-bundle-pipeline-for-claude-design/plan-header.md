Title: "superui design-extractor - handoff bundle pipeline for Claude Design"


## Goal
`/superui:design-extractor <screenshots-dir>` turns a folder of UI screenshots into a handoff bundle at `.temp/design-extractor/<run>/handoff/` plus a sibling `handoff.zip`, containing exactly `design.md`, `inventory.md`, `components/<slug>.md`, `patterns/<slug>.md`, `screens/<file>.png`, `meta.yml` and optionally `intake-answers.md`. Every foundation value in `design.md` traces to a pixel sample or a stated in-image reference. The bundle carries no token file and no documentation-site artifact.

## Context
superui is being rebuilt around the pairing of Claude Code CLI and Claude Design. The old self-contained design-system pipeline (6 skills, 15 agents, 11 scripts) is set aside in `.temp/superui-legacy/` as read-only reference. The consumer on the Claude Design side builds live inline-styled Design Components and reads foundation values from `design.md` alone, so a parallel token file or generated doc site would create a competing source of truth and break click-to-edit. The surviving asset `sample_colors.ts` covers color, luminance-ranked surface order and accent inventory, but measures no geometry at all - that gap is the main new code. The bundle is one-shot input material: after iteration in Claude Design the authoritative artifact becomes the regenerated DTCG coming back, which a later skill will own.

## Acceptance criteria
1. Running the head skill on a screenshots directory produces `.temp/design-extractor/<run>/handoff/` with all required members present and a sibling `handoff.zip` that unpacks to the same tree.
2. The bundle contains no `*.json` token file, no `*.css`, no `*.js` and no `*.html` - verified by listing the bundle.
3. `design.md` carries sections 3.1 through 3.10, each non-empty, with every value table rendered by `render_design_md.ts` from `registry.json` rather than authored by an agent.
4. `validate_bundle.ts` exits 1 with a named finding when a spec cites a token absent from the registry, when a spec or inventory entry cites a CANONICAL screen absent from `screens/`, or when a required section of `design.md` is empty; it exits 0 on a clean bundle, including one whose inventory `appears:` lists screens that do not ship.
5. `measure_geometry.ts` reports the known geometry of a synthetic fixture image within the tolerance stated in its header, for each of its four modes.
6. The head SKILL.md performs no measuring and authors no measured or generated artifact inline - `design.md`, the specs, `inventory.md`, `screens/`, `meta.yml` and the zip all originate elsewhere. Transcribing the user's own intake answers to `<run>/intake-answers.md` is the one write it owns, and necessarily so, since `AskUserQuestion` runs only in the main context. The fork worker SKILL.md contains no user-facing question and no `AskUserQuestion`.
7. `superui/.claude-plugin/plugin.json` lists four skills and five agents, with no worker appearing in both arrays, and `superui/CLAUDE.md`, `superui/README.md`, root `README.md` and root `CLAUDE.md` describe the shipped state with no mid-rewrite or no-agents wording left anywhere.
8. No file under `superui/`, and neither root `README.md` nor root `CLAUDE.md`, references a removed artifact - `.superui/design-system/`, `tokens.css`, `DESIGN.md` generation, spec-token or preview linting, the doc chrome, or any set-aside skill name. The `.temp/`, `.docs/` and `.superdev/` trees keep the old names deliberately and are out of scope.

