# superui

The design / frontend ecosystem for Claude Code. Flat-named (single-domain plugin, no group prefix).

superui pairs Claude Code CLI (measurement, agentic fan-out) with Claude Design (live, inline-styled Design
Components) through a **two-stage** pipeline. `/superui:design-extractor <screenshots-dir> [<target>]` turns
a folder of UI screenshots into the pure, platform-neutral design system alone - `DESIGN.md` (YAML
front-matter tokens plus a prose body loosely conforming to the design.md standard) - at `docs/design-system/`,
or `docs/design-system/<target>/` when you pass the optional second argument (a monorepo with separate bundles
per app). Every measured value in it traces to a pixel sample or a stated in-image reference. It then loops to
offer chaining `/superui:component-extractor <screenshots-dir> <platform> [<target>]` (`platform`: `web-app` |
`mobile` | `website`), which reads that `DESIGN.md` and builds one platform's component/pattern bundle -
`DESIGN.components.md`, `DESIGN.patterns.md`, `screens/<file>.png` - at
`docs/design-system/[<target>/]<platform>/`. `component-extractor` also runs standalone against an
already-extracted `DESIGN.md`, any number of times, one platform per run. Claude Design consumes both layers to
build the live components. No token file, no CSS, no generated documentation site ships in either layer: a
component or pattern missing against that platform's expected-components checklist is invented from
`DESIGN.md`'s own tokens and marked `> NEEDS ATTENTION` for review, never silently guessed.

## Requirements

- Node.js >= 22.6 (`node` on PATH). Nothing else - the bundled scripts are TypeScript run directly
  by Node's native type stripping (on 22.6–23.5 the skills add `--experimental-strip-types`
  automatically; from 23.6 plain `node` suffices). No `npm install`, no packages, no build step.
- Run `/superui:setup` any time to verify - it reports the runtime status as a PASS/FAIL table with
  install hints. It never installs anything itself.

## Skills

| Skill | Role |
| --- | --- |
| `pro-designer` | Professional UI/UX standards - visual hierarchy, color discipline, type ramps, 4/8pt spacing, accessibility, component states, form-validation UX, and evidence-based conversion psychology with anti-dark-pattern rules. Fires when creating, styling, or reviewing any interface. |
| `setup` | User-only environment diagnostic (`/superui:setup`) - reports Node.js runtime status; installs nothing. |
| `design-extractor` | User-only (`/superui:design-extractor <screenshots-dir> [<target>]`) - turns a folder of UI screenshots into the pure, platform-neutral design system alone (`DESIGN.md`) at `docs/design-system/` (or `docs/design-system/<target>/`). Resolves ambiguity with the user - including asking before it overwrites an existing `DESIGN.md` - then dispatches the builder for the rest. Ends by looping to offer chaining `component-extractor` per platform. |
| `design-extractor-builder` | Internal fork worker, not user-invocable - the mechanical tail of `design-extractor`: fans out to its measuring/writing agents and the plugin's rendering/validation scripts to produce `DESIGN.md` alone. |
| `component-extractor` | Model-invocable via a guarded CSO description (so `design-extractor`'s ending loop can chain into it), also user-runnable (`/superui:component-extractor <screenshots-dir> <platform> [<target>]`, `platform`: `web-app` \| `mobile` \| `website`) - reads an existing `DESIGN.md` and builds that platform's component/pattern bundle (`DESIGN.components.md`, `DESIGN.patterns.md`, canonical `screens/`) at `docs/design-system/[<target>/]<platform>/`. Hard-stops pointing at `design-extractor` when `DESIGN.md` is absent. Runs any number of times, one platform per run, chained or standalone. |
| `component-extractor-builder` | Internal fork worker, not user-invocable - the mechanical tail of `component-extractor`: parses `DESIGN.md` back into a registry, fans out to its spec-writing/inventing agents plus the plugin's copy/assemble/validation scripts, then dispatches a bundle reviewer over the finished platform bundle. A component or pattern missing against the platform's expected-components checklist is invented from registry tokens only, marked `> NEEDS ATTENTION`. |

See `superui/CLAUDE.md` for the architecture and the handoff-bundle pipeline.
