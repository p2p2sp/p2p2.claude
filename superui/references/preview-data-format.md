# Preview data format — `*.data.js` contract

The schema shared by `components.js` (the runtime that renders it), `html-visualizer` (the sole author of
component/pattern data), and `build_foundation_data.ts` (the sole author of foundation data). A `.data.js`
file is a classic (non-module) script — `file://`-safe, loaded via `<script src>`, never `fetch()` — that
registers one entry in a global registry:

```js
window.SUPERUI_DATA = window.SUPERUI_DATA || {};
window.SUPERUI_DATA["<kind>:<slug>"] = { /* sheet object, see below */ };
```

`<kind>` is one of `foundation | component | pattern`. `<slug>` matches the sheet's own file basename (e.g.
`components/button.data.js` registers `"component:button"`). Each `.data.js` file registers exactly one key —
one file, one writer, one entry.

## Sheet object

```js
{
  title: "Button",                    // required — h1
  subtitle: "One-line description",   // required — sheet-sub
  provenance: "designed",             // optional — present only when the WHOLE sheet is wholly
                                       // synthesized (mirrors the spec's "**Provenance:** designed,
                                       // not extracted" line); components.js renders it as a visible
                                       // header note. Omit for measured content.
  demo: {                             // components only — the live markup ds-demo and the
                                       // state-matrix section render from
    defaultVariant: "primary",
    defaultState: "default",
    variants: {
      primary: {
        states: {
          default: { markup: "<button class=\"btn\" style=\"background:var(--color-accent-base)\">Save</button>" },
          hover:   { markup: "..." }
        }
      },
      secondary: { states: { default: { markup: "..." } } }
    }
  },
  sections: [ /* typed entries, in render order — see below */ ]
}
```

`title` is also what `build_index.ts` uses as the link label on the index page (fallback: the shell's
`<title>`), so keep it short and human-facing.

## The color rule

A color is **always** given as a token `varName`, **never a literal**. No section item, table cell, or demo
`markup` string ever carries a raw hex/`rgb()`/`hsl()`. Wherever a color is named, name its `varName` and the
runtime paints the swatch — `lint_previews.ts` enforces this by scanning `.data.js` source text for raw
color/px literals inside `markup`/`html` strings and inside `render: color` item values.

`varName` (used everywhere below) is a CSS custom-property name **without** the leading `--` — dtcg.yml path
with dots as hyphens, e.g. `"color-surface-base"`. The runtime always emits `var(--color-surface-base)`.

## `sections[]` — typed entries

Every entry carries `type` plus its own fields; `heading` / `subheading` are optional on every type and render
as the section's `h2` / `section-sub`. Unknown `type` values are skipped by the runtime with a `console.warn`
— never a throw.

- **`token-grid`** — a card grid of tokens (foundation sheets; also usable wherever a component/pattern spec
  documents its own token usage).
  ```js
  { type: "token-grid", heading: "Accent", items: [
    { name: "Accent 500", varName: "color-accent-500", value: "#5b4cf0", usage: "Primary buttons, links",
      render: "color" }
  ] }
  ```
  `render` is one of `color | type | spacing | radius | shadow | opacity | motion | none` — selects the live
  sample the runtime draws (swatch, styled text, sized bar, rounded block, shadowed block, faded block, timed
  transition, or no live sample). `value` is a plain human-readable readout (e.g. `"8px"`, `"#5b4cf0"`) —
  informational text, not a style value, so a literal here is fine; the live sample itself always paints from
  `varName`.

- **`prose`** — free text.
  ```js
  { type: "prose", html: "<p>Use the accent scale for interactive elements only.</p>" }
  ```

- **`state-matrix`** — the variant x state grid for a component's OWN `demo` (component sheets only).
  ```js
  { type: "state-matrix", variants: ["primary", "secondary"], states: ["default", "hover", "disabled"] }
  ```
  Rendered by looking up `demo.variants[v].states[s].markup` for each pair; a missing pair renders a
  `needs-input` chip in its place, not a throw.

- **`anatomy`** — labeled structural notes.
  ```js
  { type: "anatomy", items: [
    { label: "Icon slot", note: "Optional, leading edge only" },
    "Label is always present"
  ] }
  ```
  An item is either a `{ label, note }` object or a plain string.

- **`props-table`** — a properties/API table.
  ```js
  { type: "props-table", columns: ["Prop", "Type", "Default"], rows: [
    ["variant", "primary | secondary", "primary"]
  ] }
  ```

- **`dos-donts`** — paired guidance lists.
  ```js
  { type: "dos-donts", dos: ["Use for the single primary action"], donts: ["Stack two primary buttons"] }
  ```

- **`composition`** — a pattern's composed example (patterns only). `markup` is an HTML string that may
  embed `<ds-demo name="<component-slug>" variant="..." state="...">` tags to reuse a component's own demo
  markup verbatim instead of re-inlining it; `variant`/`state` default to that component's
  `demo.defaultVariant` / `demo.defaultState` when omitted.
  ```js
  { type: "composition", markup: "<div class=\"frame-grid\"><ds-demo name=\"button\" variant=\"primary\"></ds-demo></div>" }
  ```

- **`needs-input`** — a gap or a synthesized note, same chrome placement as the sheet-level `provenance`
  note.
  ```js
  { type: "needs-input", text: "Dark hover value has no measured source.", synthesized: false }
  ```
  `synthesized: true` renders the `"> SYNTHESIZED: "` prefix (mirrors a spec's `> SYNTHESIZED:` marker);
  omitted/`false` renders the `"> NEEDS INPUT: "` prefix.

## Registry lookups

- A sheet renders from `window.SUPERUI_DATA["<kind>:<slug>"]`; a missing key renders a `needs-input` note
  (`"data missing: <key>"`), never a throw — data `<script src>` order relative to `<ds-sheet>` never matters
  because rendering defers to `DOMContentLoaded`.
- `<ds-demo name="...">` always looks up `"component:<name>"` regardless of the current sheet's own kind, so
  a pattern sheet can reuse a component's demo markup.
