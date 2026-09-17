# superui

## Purpose

The design/frontend plugin. ONE skill, `pro-designer` - the cross-cutting professional UI/UX
standards advisor. Advisory only: it proposes and critiques, writes no knowledge layer of its
own, and dispatches nothing. Ships NO hooks, NO manifest, NO agents; no plugin-root dirs at all
- the single skill bundles its own `references/` and `scripts/`. Routes purely via CSO
`description:`.

## Entry points

- `skills/pro-designer/SKILL.md` - the advisor itself. Step 0 loads `references/anti-slop.md`
  in full, unconditionally, before any other reasoning (the forensic generated-UI tells
  catalog), deliberately outside the on-demand reference routing.
- `skills/pro-designer/references/` - fifteen on-demand reference files: visual hierarchy,
  color-system discipline, type ramps, 4/8pt spacing, accessibility, component states,
  form-validation UX, evidence-based conversion psychology (hard anti-dark-pattern rules),
  concepting/distinctiveness (anti-AI-slop layout direction), tokens (primitive/semantic/
  component layering), motion (animation doctrine). Verify the current file list and coverage
  from the directory before restating specifics.
- `skills/pro-designer/scripts/` - `check_contrast.ts` (WCAG 2.2 AA/large/UI contrast gate,
  plain ESM TypeScript, `node:` builtins only, no build step) + `check_node.sh` (Node env-check
  run as an explicit early step, no `!` preflight; a byte-identical copy lives in `superfix` -
  any edit here must be mirrored there).

## Contracts & invariants

- No hooks, no manifest, no agents - nothing to dispatch and nothing to auto-route beyond the
  one skill's CSO description. Do not reintroduce a manifest.
- One skill, so everything is skill-local. No plugin-root `scripts/`/`references/`/`agents/`/
  `shared/` dir while `pro-designer` is the only consumer - a second skill is the trigger for
  promoting anything to plugin root, not a hypothetical one.
- Scripts are trusted by their caller: a self-verifying script carries its I/O contract in its
  header comment; the caller does not re-verify or retry its result.
- A missing Node runtime is a SKIP, never a hard stop - `pro-designer` is advisory, so
  `NODE_MISSING` costs it the contrast check plus a note; the rest of the review continues. This
  is the deliberate, documented Node dependency the root's stack-agnostic rule allows.

## Anti-patterns

- Treating the contrast check as blocking when Node is absent.
- Adding a knowledge-layer write, a dispatch, or a manifest to this plugin - it is advisory by
  design.

## Related context

- Root cross-plugin invariants: `../CLAUDE.md`
- superfix shares the byte-identical `check_node.sh`: `../superfix/CLAUDE.md`
