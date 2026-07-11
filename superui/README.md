# superui

The design / frontend ecosystem for Claude Code: a framework-agnostic design system, extracted from
screenshots or designed from intent, enforced on every UI task, and backed by professional UI/UX
standards. Flat-named (single-domain plugin, no group prefix).

## Requirements

- Python 3 (`python`, `python3`, or `py` on PATH — any one works).
- `pip install pillow numpy pyyaml` — Pillow + numpy for inspiration-image / screenshot sampling,
  PyYAML for the token pipeline (`dtcg.yml`). Contrast checks, spec/preview linting, and index
  generation are stdlib-only and work under any interpreter, even without the three modules.
- Run `/superui:setup` any time to verify — it reports interpreter + module status as a PASS/FAIL
  table with install hints. It never installs anything itself.

## Skills

| Skill | Role |
| --- | --- |
| `design-system-extractor` | The measurement head — reverse-engineers a design system from a folder of UI screenshots. |
| `design-system-creator` | The creative head — designs a NEW design system from a prose interview (product, audience, mood) plus optional inspiration images (hints, never canon). |
| `design-system-completer` | Opt-in gap-completion — validates an existing system for what the extraction/design couldn't cover, and synthesizes only user-approved gaps. |
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
- **Building or styling any UI afterward?** `design-system-guardian` engages automatically and
  enforces the system's tokens and specs; `pro-designer` backs it with generic standards wherever the
  system itself is silent.

## Artifacts

Every pipeline (extractor, creator, completer) writes to the same location:
`.superui/design-system/` — `dtcg.yml` (DTCG tokens), `DESIGN.md`, `tokens.css`, per-component and
per-pattern specs, and a static HTML documentation site (`index.html` + per-foundation/component/
pattern sheets). A root `$extensions.org.superui.provenance` marker in `dtcg.yml` records whether the
whole system is `measured` (extractor) or `designed` (creator).

See `superui/CLAUDE.md` for the full architecture, agent roster, and provenance canon.
