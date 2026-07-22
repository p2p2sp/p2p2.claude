# superui

The design / frontend ecosystem for Claude Code. Flat-named (single-domain plugin, no group prefix).

superui pairs Claude Code CLI (measurement, agentic fan-out) with Claude Design (live, inline-styled Design
Components). `/superui:design-extractor <screenshots-dir>` turns a folder of UI screenshots into a lean seed
bundle — `DESIGN.md`, `DESIGN.components.md`, `DESIGN.patterns.md`, `screens/<file>.png` — that Claude Design
consumes to build the live components. No token file, no CSS, no generated documentation site ships in the
bundle: `DESIGN.md` is the single, self-contained source of foundation values (YAML front-matter tokens plus a
prose body loosely conforming to the design.md standard), and every measured value in it traces to a pixel
sample or a stated in-image reference.

## Requirements

- Node.js >= 22.6 (`node` on PATH). Nothing else — the bundled scripts are TypeScript run directly
  by Node's native type stripping (on 22.6–23.5 the skills add `--experimental-strip-types`
  automatically; from 23.6 plain `node` suffices). No `npm install`, no packages, no build step.
- Run `/superui:setup` any time to verify — it reports the runtime status as a PASS/FAIL table with
  install hints. It never installs anything itself.

## Skills

| Skill | Role |
| --- | --- |
| `pro-designer` | Professional UI/UX standards — visual hierarchy, color discipline, type ramps, 4/8pt spacing, accessibility, component states, form-validation UX, and evidence-based conversion psychology with anti-dark-pattern rules. Fires when creating, styling, or reviewing any interface. |
| `setup` | User-only environment diagnostic (`/superui:setup`) — reports Node.js runtime status; installs nothing. |
| `design-extractor` | User-only (`/superui:design-extractor <screenshots-dir>`) — turns a folder of UI screenshots into the Claude Design seed bundle (`DESIGN.md` plus the `DESIGN.components.md` / `DESIGN.patterns.md` spec satellites and canonical screens). Resolves ambiguity with the user, then dispatches the builder for the rest. |
| `design-extractor-builder` | Internal fork worker, not user-invocable — the mechanical tail of `design-extractor`: fans out to its measuring/writing agents and the plugin's rendering/validation scripts to produce the finished seed bundle (`DESIGN.md` + the two spec satellites + `screens/`). |

See `superui/CLAUDE.md` for the architecture and the handoff-bundle pipeline.
