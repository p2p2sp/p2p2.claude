# superui - the design / frontend ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skill as runtime data, and the plugin reads host-project design
> knowledge from the **consuming** repo when it runs there, never from here. See the root `CLAUDE.md` for the
> repo-wide warnings and cross-plugin invariants; this file holds only what is specific to `superui`.

superui ships **one skill**, `pro-designer` - the cross-cutting professional UI/UX standards advisor. It is
advisory only: it writes no persisted knowledge layer, creates no files of its own, and dispatches nothing.
No hooks, no manifest, no agents, no plugin-root `scripts/` / `references/` / `assets/` dirs - the skill
bundles everything it needs.

It is a **single-domain** plugin, so its skill carries **no group prefix** (the plugin name is the group) and
is flat-named. The catalog of record is `.claude-plugin/plugin.json` `skills[]`.

## Layout (superui internals)

```
superui/
  .claude-plugin/plugin.json   The plugin manifest - skills[] is the catalog of record
                     (no hooks/ - superui ships no hooks and no injected manifest; no agents[])
  skills/
    pro-designer/
      SKILL.md       The advisor itself
      references/    Fifteen on-demand reference files (anti-slop.md is the one loaded unconditionally)
      scripts/       check_contrast.ts (WCAG AA gate) + check_node.sh (the Node env-check),
                     addressed via `${CLAUDE_SKILL_DIR}/scripts/...`
```

## The skill

- `pro-designer` - the cross-cutting **professional UI/UX standards** advisor (model-invocable via CSO):
  visual hierarchy, color-system discipline (neutral foundation, dark mode, accent scales), type ramps, 4/8pt
  spacing, accessibility, component states, form-validation UX, evidence-based conversion psychology with
  hard anti-dark-pattern rules, and anti-AI-slop aesthetic direction split across three references:
  `references/concepting.md` (the mandatory pre-layout concept brief - thesis, subject world, one narrow
  out-of-web reference anchor, named anti-references, signature element with a recurrence plan, section
  sequence with a layout family per section - plus the skeleton critique, required before any new
  Persuade/Experience surface even when a design system already exists), `references/distinctiveness.md`
  (refuse the recognizable generated-look defaults, subject grounding with the point-at-3-places physical-
  artifact rule, signature element with 3-point recurrence, consistency locks, copy as design material - the
  plan-then-critique pass now defers to `concepting.md`) and `references/anti-slop.md` (the forensic
  generated-UI tells catalog: an entropy meta-rule opening it, skeleton-level section-sequence tells with
  minimum-variation requirements, uniform-padding and cardocalypse limits, second-generation tells including
  the four clone looks and the Space-Grotesk-plus-Instrument-Serif escape pairing, layout/visual/decoration
  tells covering the count reflex, the centered-section-header limit, untouched framework defaults,
  keyword-matched/sparkles AI iconography, emoji-in-headings, grain-over-gradient and the gray-on-gray dark
  mode, a dedicated **interaction-and-motion** section (scroll reveals, `opacity: 0` content, cursor-following
  beams/spotlights/tilt, `transition: all`, opacity-fade hover, the uniform hover lift) and a dedicated
  **craft** section (off-scale spacing and off-ramp type sizes, padding vs. neighbors, the
  `rounded-2xl`+`shadow-lg` reflex, optical misalignment), hero discipline including the badge-above-the-
  headline default, app-dashboard and chat/AI-surface tells, demo-content realism, banned headline formulas,
  em/en dashes in visible copy, uniform sentence rhythm, the default CTA tail, CTA-intent dedup).
  `anti-slop.md` is the one reference NOT routed on demand: SKILL.md opens with a
  **Step 0** gate loading it in full before any other reasoning, on every invocation and every job size, so the
  tells leave the candidate set before the first decision instead of being scrubbed out of a finished draft -
  hence it is deliberately absent from the "Reference routing" list, and the reference files point at it as
  already-loaded rather than telling the reader to go read it.
  `references/tokens.md` carries token-architecture
  doctrine (primitive/semantic/component layering, dark-mode-overrides-only-the-semantic-layer, paired
  surface/foreground tokens, role-based naming, derived radius/z-index scales). `references/motion.md`
  carries the animation doctrine (the four-question
  gate led by frequency, the static-page animation-opportunity hunt list, easing/duration budgets with
  strong custom curves, springs, interruption/enter/exit, clip-path recipes, gestures,
  transform/opacity-only performance rules, reduced-motion and hover gating, plus a scroll-reveal budget and
  a content-visible-without-JS rule for Persuade/Experience surfaces);
  components-states.md keeps only the page-level motion deltas (stagger recipe, will-change,
  backdrop-filter placement) and defers the doctrine to motion.md. Its SKILL.md also carries four framings
  adapted from pbakaus/impeccable (Apache-2.0): the
  surface-mode taxonomy (Persuade/Operate/Read/Experience, chosen from the surface, not the product), the
  brief-wins rule, refinement-preserves-vs-redesign-replaces, and bounded QA passes (batched inspect-fix,
  max two rounds) - Final QA adds a screenshot-based check for new Persuade/Experience surfaces (full-page
  desktop + mobile renders via host tooling, or a code-only fallback when rendering is impossible; skeleton,
  domain-artifact, signature-recurrence and memorability tests plus the squint test applied on the image).
  Fires when creating, styling, or reviewing ANY interface. Advisory only - it proposes and critiques, it
  never owns a file.

## Architecture invariants (superui-specific)

- **No hooks, no manifest, no agents.** `pro-designer` is reached purely through its CSO `description:`;
  there is nothing to dispatch and nothing to auto-route, so a `SessionStart` dispatcher manifest would add
  no value over that one description. Do not reintroduce one.
- **One skill, so everything is skill-local.** There is no plugin-root `scripts/`, `references/`, `agents/`
  or `shared/` dir and there should not be one while `pro-designer` is the only consumer - a second skill is
  the trigger for promoting a script to the plugin root, not a hypothetical one.
- **Scripts are trusted by their caller.** A self-verifying script carries its I/O contract in its header
  comment; the caller does not re-verify or retry its result.
- **A missing Node runtime is a skip, never a hard stop.** `pro-designer` is advisory, so `NODE_MISSING`
  costs it the contrast check plus a note - the rest of the review continues.

## Scripts inventory

Both scripts live at `skills/pro-designer/scripts/` and are addressed via `${CLAUDE_SKILL_DIR}/scripts/...`.
`check_contrast.ts` is plain ESM TypeScript with erasable syntax only, run directly by Node's native type
stripping (`node check_contrast.ts`; the `check_node.sh`-resolved command adds `--experimental-strip-types`
on 22.6-23.5) - `node:` builtins only, no relative imports, no npm dependencies, no build step.

- `scripts/check_node.sh` - the Node.js env-check, run as an explicit early step
  (`sh "${CLAUDE_SKILL_DIR}/scripts/check_node.sh"`) before the contrast gate - no `!` preflight. Emits
  `NODE_OK <cmd>` (`node`, or `node --experimental-strip-types` on 22.6 <= v < 23.6) or `NODE_MISSING`
  (absent / < 22.6). A byte-identical copy lives in superfix; `tests/superui/check_node.test.ts` asserts the
  two behave identically on the same input matrix, so any edit here must be mirrored there.
- `scripts/check_contrast.ts` - the WCAG 2.2 contrast checker behind pro-designer's accessibility gate.
  Pairs on argv (`FG BG [TYPE]...`) or `--json pairs.json`; TYPE is `normal` (4.5:1) | `large` (3:1) |
  `ui` (3:1). Exit 1 = a pair failed AA for its own type, exit 2 = bad input or usage. Its `contrastRatio`
  export is importable without firing `main()` - `tests/superui/import-safety.test.ts` holds that guarantee.
