# superui

The design / frontend ecosystem for Claude Code: a framework-agnostic design system, extracted from
screenshots or designed from intent, enforced on every UI task, and backed by professional UI/UX
standards. Flat-named (single-domain plugin, no group prefix).

## Requirements

- Node.js >= 22.6 (`node` on PATH). Nothing else — the bundled scripts are TypeScript run directly
  by Node's native type stripping (on 22.6–23.5 the skills add `--experimental-strip-types`
  automatically; from 23.6 plain `node` suffices). No `npm install`, no packages, no build step.
- Run `/superui:setup` any time to verify — it reports the runtime status as a PASS/FAIL table with
  install hints. It never installs anything itself.

## Skills

| Skill | Role |
| --- | --- |
| `design-system-extractor` | The measurement head — reverse-engineers a design system from a folder of UI screenshots. |
| `design-system-creator` | The creative head — designs a NEW design system from a prose interview (product, audience, mood) plus optional inspiration images (hints, never canon). |
| `design-system-completer` | Opt-in gap-completion — validates an existing system for what the extraction/design couldn't cover, and synthesizes only user-approved gaps. |
| `design-system-auditor` | Read-only consistency audit — checks the implementation against the system's own tokens, specs, and inventory; writes a DRIFT / GAP / UNTRACKED report under `.superui/reports/` and changes nothing. |
| `design-system-guardian` | Doctrinal enforcement — binds every UI task to the project's own extracted/designed tokens and specs; silently stands down with no `.superui/design-system/`. |
| `pro-designer` | Generic professional UI/UX standards; advisory, defers to the project's own system when one exists. |
| `setup` | User-only environment diagnostic (`/superui:setup`) — no auto-routing. |
| `design-system-generator` | Internal — the shared mechanical artifact tail invoked by the extractor and the creator; not directly invocable. |

## Quick start

- **Have screenshots to reverse-engineer?** Point `design-system-extractor` at a folder of UI
  screenshots — "extract a design system from these screens".
- **Designing from scratch?** Ask `design-system-creator` — describe the product, audience, and mood;
  optionally point it at a folder of inspiration images. It interviews you one question at a time and
  gates on your approval of the direction before generating anything.
- **Already have a system but it's missing states, dark coverage, or a token role?** Run
  `design-system-completer` — it reports gaps first and synthesizes only what you approve.
- **Wondering how far the code has drifted from the system?** Run `design-system-auditor` — a
  read-only audit that reports DRIFT (code vs tokens/specs), GAPs (needs the system doesn't
  define), and UNTRACKED components; its only output is a report under `.superui/reports/`.
- **Building or styling any UI afterward?** `design-system-guardian` engages automatically and
  enforces the system's tokens and specs; `pro-designer` backs it with generic standards wherever the
  system itself is silent.

## Artifacts

Every pipeline (extractor, creator, completer) writes to the same location:
`.superui/design-system/` — `dtcg.yml` (DTCG tokens, the authored source of truth), `DESIGN.md`,
`tokens.json` (the same tokens as vendor-neutral DTCG JSON, for Style Dictionary and friends),
`tokens.css`, per-component and per-pattern specs, and a static HTML documentation site
(`index.html` + per-foundation/component/pattern sheets). A root
`$extensions.org.superui.provenance` marker in `dtcg.yml` records whether the whole system is
`measured` (extractor) or `designed` (creator).

See `superui/CLAUDE.md` for the full architecture, agent roster, and provenance canon.
