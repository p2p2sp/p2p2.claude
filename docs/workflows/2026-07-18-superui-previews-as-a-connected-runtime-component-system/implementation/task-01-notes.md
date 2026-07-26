## Task 1 - implementation notes

- Added a third custom element, `<ds-swatch name kind>`, beyond the two the Approach names (`<ds-sheet>`,
  `<ds-demo>`) - the Test Commands require `customElements.define` count >= 3, and the color rule ("a color is
  always shown via .swatch/.swatch-inline/.swatch-strip, never text alone") needed one owner so both the
  token-grid renderer and any `<ds-swatch name="...">` tag inside html-visualizer-authored `markup`/`html`
  strings share one implementation instead of duplicating swatch-painting logic.
- `token-grid` items' exact live-sample CSS mapping per `render` kind (type/spacing/radius/shadow/opacity/motion)
  is not literally specified in the task's Approach beyond the item shape - designed and documented in
  `preview-data-format.md` and in `components.js`'s inline comments (notably the guaranteed-invalid-custom-
  property trick for `render: "type"`, which sets fontFamily/fontSize/fontWeight from the same var and relies
  on the browser silently ignoring whichever doesn't apply, since a composite typography token has no single
  CSS property).
- Verified the DoD's fixture requirement beyond structural greps: built the hand-written fixture under
  `.temp/preview-refactor/` (gitignored) and additionally rendered it through `jsdom` (temp npm install, not
  committed) to confirm real DOM behavior - headers, token cards with a working `<ds-swatch>`, the state-matrix
  frame, props-table rows, the dark-toggle button (click flips `.dark` on `<html>`), and cross-file demo reuse
  (a pattern's `<ds-demo name="button">` resolving `component:button`'s registry entry from a separate
  `.data.js` file) all render correctly. This is stronger evidence than the task's own DoD asked for, so keeping
  it noted here rather than silent.
