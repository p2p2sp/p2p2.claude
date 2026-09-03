# superui

The design / frontend ecosystem for Claude Code. Two things it does: hold every interface you build to
professional UI/UX standards, and turn a folder of UI screenshots into a design-system handoff bundle that
Claude Design consumes to build live, inline-styled Design Components.

The measurement rule is absolute: **measure, never guess**. Every measured value traces to a pixel sample
or a stated in-image reference. The one sanctioned non-measured value is an explicitly marked *proposed*
one, so an invented value can never be mistaken for a measured one.

Ships no hooks and no manifest.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superui@p2p2 --scope user
```

Requires **Node.js >= 22.6** (`node` on PATH) and nothing else - the bundled scripts are TypeScript run
directly by Node's native type stripping (on 22.6-23.5 the skills add `--experimental-strip-types`
automatically; from 23.6 plain `node` suffices). No `npm install`, no packages, no build step.

Run `/superui:setup` any time to verify - it reports the runtime as a PASS/FAIL table with install hints,
and installs nothing itself.

## Quick start

### Designing or reviewing an interface

Just build. `pro-designer` fires by itself whenever you create, style or review any interface - a page,
screen, dashboard, form, onboarding flow, landing page, navigation or a single component - even when you
only say "add a settings page" and never mention design. It also fires when you ask for a critique, add
animations, or say a UI looks generic or AI-generated.

It is advisory: visual hierarchy, color discipline, type ramps, 4/8pt spacing, accessibility, component
states, form-validation UX, evidence-based conversion psychology with hard anti-dark-pattern rules,
purposeful motion, and aesthetic direction that refuses the recognizable generated look.

### Extracting a design system from screenshots

A two-stage pipeline. Stage one is platform-neutral and runs once; stage two runs once per platform.

1. Drop your UI screenshots into a folder.
2. Run `/superui:design-extractor <screenshots-dir> [<target>]`. It resolves the input with you, then
   measures and writes the pure design system - `DESIGN.md`, YAML front-matter tokens plus a prose body -
   to `docs/design-system/`, or `docs/design-system/<target>/` when you pass the optional second argument
   (a monorepo shipping one bundle per app).
3. It then loops and offers to chain into the component stage, once per platform.
4. Run `/superui:component-extractor <screenshots-dir> <platform> [<target>]` (`platform`: `web-app` |
   `mobile` | `website`) any time to add or rebuild one platform's bundle -
   `DESIGN.components.md`, `DESIGN.patterns.md` and canonical `screens/` at
   `docs/design-system/[<target>/]<platform>/`. It runs standalone against an existing `DESIGN.md`, any
   number of times, one platform per run.

What you get on disk is Markdown plus PNG - no token file, no CSS, no generated documentation site, and no
Node needed to read it. A component or pattern missing against that platform's expected-components
checklist is invented from `DESIGN.md`'s own tokens and marked `> NEEDS ATTENTION`, never silently guessed.

Both stages regenerate their layer whole, so a non-empty output stops and asks before overwriting -
scoped to that one layer: rebuilding `DESIGN.md` never touches an existing platform subdir, and rebuilding
one platform never touches `DESIGN.md` or a sibling platform.

## Skills

| Skill | Role |
| --- | --- |
| `pro-designer` | Professional UI/UX standards - fires when creating, styling or reviewing any interface. Advisory only. |
| `setup` | User-only environment diagnostic (`/superui:setup`) - reports Node.js runtime status; installs nothing. |
| `design-extractor` | User-only (`/superui:design-extractor <screenshots-dir> [<target>]`) - turns screenshots into the platform-neutral design system (`DESIGN.md`). Resolves ambiguity with you, including before overwriting an existing bundle, then hands off to its builder. Ends by looping to offer the component stage per platform. |
| `design-extractor-builder` | Internal fork - the mechanical tail: fans out to the measuring/synthesizing agents and the bundled scripts to produce `DESIGN.md`. |
| `component-extractor` | `/superui:component-extractor <screenshots-dir> <platform> [<target>]`, also chainable from the extractor's ending loop - reads an existing `DESIGN.md` and builds that platform's component/pattern bundle. Hard-stops pointing at `design-extractor` when `DESIGN.md` is absent. |
| `component-extractor-builder` | Internal fork - parses `DESIGN.md` back into a registry, fans out to the spec-writing and spec-inventing agents, copies the canonical screens, assembles both satellites, then runs a bundle review. |

## Agents

Dispatched by the pipeline skills only, never directly.

| Agent | Role |
| --- | --- |
| `source-scout` | Maps the screenshots dir into a source map (screen roles, dedup hints). Measures nothing. |
| `foundation-analyst` | Measures ONE foundation per run (colors, typography, dimensions, effects-motion) via the pixel-sampling scripts. |
| `design-synthesizer` | Fills the gaps measurement cannot reach with PROPOSED tokens carrying a rationale - never edits a measured value. |
| `component-scout` | Builds the deduplicated component/pattern inventory and diffs it against the platform's expected-components checklist. |
| `spec-writer` | Writes ONE observed component/pattern spec from the registry plus the source screens. |
| `component-synthesizer` | Writes ONE invented spec for a checklist gap, citing only tokens already in the registry, marked `> NEEDS ATTENTION`. |
| `bundle-reviewer` | Reviews the finished platform bundle - accent discipline, dedup correctness, state completeness, surface-order coherence, flat-render mismatches. |

See `CLAUDE.md` in this directory for the architecture and the full handoff-bundle contract.
