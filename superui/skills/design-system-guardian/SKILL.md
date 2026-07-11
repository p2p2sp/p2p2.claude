---
name: design-system-guardian
description: Enforces the project's EXTRACTED design system on every UI task. Use whenever creating, building, adding, fixing, updating, modifying, styling, restyling, theming, refactoring, or reviewing ANY user interface — a page, screen, view, dashboard, form, component, layout, or a single CSS/style tweak — even if the user only says "build/add/fix" and never mentions a design system; applies in any language, phrasing, and framework. Invoke on every such task without checking anything first — the skill itself verifies `.superui/design-system/` (the design-system-extractor output — tokens, DESIGN.md, component/pattern specs) and silently stands down when it is absent. Distinct from pro-designer, which gives generic UI/UX standards — this skill binds the work to THIS project's concrete tokens and specs, which take precedence.
---

# Design System Guardian

This skill is a pointer, not a payload — it names WHERE the extracted design
system lives; every value lives ONLY in the host files. NEVER quote, cache, or
invent token values from memory; read them fresh from the files below.

## Gate — verify the system exists

- Check that `.superui/design-system/DESIGN.md` exists (Glob).
- ABSENT -> this skill does not apply. Stand down silently and proceed with your
  normal standards. Suggest running `design-system-extractor` only if the user
  explicitly asks about a design system.
- PRESENT -> every rule below is MANDATORY for all UI work in this task —
  creation, styling, and review alike.

## Required reading — BEFORE writing or judging any UI code

Read from `.superui/design-system/`, in this order, only this much:

- ALWAYS: the `## Using this design system (for agents)` section of `DESIGN.md`
  — the system's own agent contract; its rules bind exactly like this skill's
  (on conflict between the two, the more restrictive rule wins).
- ALWAYS, for every component or pattern touched that has a spec:
  `components/<slug>.md` / `patterns/<slug>.md`.
- ONLY when adding new UI: `inventory.md` — check whether a component or
  pattern for the need already exists BEFORE creating anything new.
- ONLY when composing a whole screen or reviewing beyond one component: the
  full `DESIGN.md` (consistency rules, theming, accessibility).

No deeper cascades: these files are the single level of indirection. Do not
skip them because the change "is small" — a one-line style tweak drifts a
system exactly as fast as a new screen.

## Absolutes

- ONLY tokens. Every color, font size, spacing, radius, shadow, and motion
  value comes from the extracted tokens — `var(--<token-path>)` from
  `tokens.css`, or that token's equivalent in the host's styling convention.
  NEVER a raw hex/rgb/px/rem/ms value that a token covers.
- ALWAYS semantic over primitive: reach for role tokens first; use a primitive
  token only when no semantic token carries the role.
- NEVER invent a variant, size, state, or anatomy part the spec does not
  define. Spec absence is a decision, not an oversight.
- NEVER restyle an existing component ad hoc — change flows through its spec
  and tokens or it does not happen.
- Accent discipline: accent tokens appear ONLY where `DESIGN.md` allows them.
  NEVER promote the accent to backgrounds, borders, or text it does not list.
- Dark mode ONLY through tokens (the `.dark` block of `tokens.css`). NEVER a
  hardcoded dark-specific value, NEVER a parallel dark palette.
- NEVER edit anything under `.superui/design-system/` — this skill reads and
  enforces; only the extractor writes there.

## Gaps — when the system has no answer

A needed value with no token, or a needed component with no spec, is a GAP —
not permission to improvise:

- NEVER inline the missing value or design the missing component freehand.
- Report the gap to the user and point at `design-system-extractor` to extend
  the system; proceed only on the user's explicit call, and mark every
  deviation in the code with a `design-system-gap:` comment naming the missing
  token or spec.

## Self-check — MANDATORY after generating or editing UI code

Before presenting the result, verify each line against the files you read:

1. Zero raw color/font-size/spacing/radius/shadow/motion values that a token
   covers.
2. Semantic tokens used wherever a semantic role exists.
3. Accent tokens appear only in locations `DESIGN.md` permits.
4. Every touched component matches its spec: states, anatomy, variants.
5. Nothing exists in the output that the specs and `DESIGN.md` do not define.
6. Dark mode resolves through tokens alone — toggling `.dark` needs no code
   change.
7. Nothing under `.superui/design-system/` was created or modified.

Any failure -> fix it before presenting, or report it as a gap. Never present
UI code with an unchecked list.

## Review mode

When reviewing existing UI, the self-check above is the finding list: report
each violation with the file/line and the token or spec rule it breaks.

## Scope boundary

Generic UI/UX standards (hierarchy, contrast, spacing rhythm) belong to
`pro-designer`; this skill owns fidelity to the concrete extracted system.
Where the two disagree, the extracted system wins.
