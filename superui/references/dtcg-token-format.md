# DTCG token format (2025.10) — YAML serialization

Author tokens in **YAML using the exact DTCG object model** (same `$`-prefixed keys, same value shapes). The scripts in this skill load the YAML and treat it as the DTCG structure 1:1, so it converts losslessly to DTCG JSON — `tokens_to_json.ts` does exactly that on every run, emitting `tokens.json` beside `tokens.css` as the vendor-neutral interchange file for downstream tooling (Style Dictionary, JSON Schema validation). `dtcg.yml` stays the authored source of truth; `tokens.json` is generated and never hand-edited.

## Core shape

A **token** is any object with a `$value`. Its parent key is the token name.

```yaml
color:
  brand:
    "500":
      $type: color
      $value:
        colorSpace: srgb
        components: [0.20, 0.40, 0.95]
        alpha: 1
        hex: "#3366f2"   # optional convenience mirror of components
      $description: "Primary brand color, sampled from the CTA button"
```

Rules that matter:

- `$value` and `$type` are **required** (per token, or `$type` inherited from the nearest parent group that sets it).
- Token / group names **must not** start with `$` and must not contain `.`, `{`, `}` (those are reserved for the alias syntax). Prefer kebab/lower names.
- Allowed token metadata: `$description`, `$extensions`, `$deprecated`.
- A **group** is any object without `$value`. Groups may set a group-wide `$type`. Groups are organizational only — do not encode meaning a tool must rely on (we use a small, explicit **role** convention; see below).

## Aliases (references)

A value may reference another token with curly-brace path syntax:

```yaml
color:
  text:
    primary:
      $type: color
      $value: "{color.gray.900}"   # alias → resolves to that token's value
```

Use aliases to build the **semantic layer** on top of **primitives**. Never duplicate a raw value in two places — alias instead.

## Types

### color
sRGB object form (preferred, matches 2025.10):

```yaml
$type: color
$value:
  colorSpace: srgb        # srgb | srgb-linear | hsl | hwb | lab | lch | oklab | oklch | display-p3 | a98-rgb | prophoto-rgb | rec2020 | xyz-d65 | xyz-d50
  components: [0.2, 0.4, 0.95]   # numbers; for srgb each in 0..1
  alpha: 1                 # 0..1, optional (default 1)
  hex: "#3366f2"           # optional; include for sRGB to ease CSS output
```
Always include `hex` for sRGB colors — `sample_colors.ts` emits it and it gives the most readable output when a downstream target adapter writes CSS / theme code.

### dimension
A number plus a unit. Use for spacing, sizes, radii, border widths, font sizes, breakpoints.

```yaml
$type: dimension
$value: { value: 16, unit: px }   # unit: px | rem
```

### fontFamily
String or array (fallback stack).

```yaml
$type: fontFamily
$value: ["Inter", "system-ui", "sans-serif"]
```

### fontWeight
Number (1–1000) or a standard keyword (`regular`, `medium`, `bold`, …).

```yaml
$type: fontWeight
$value: 600
```

### duration
```yaml
$type: duration
$value: { value: 200, unit: ms }   # unit: ms | s
```

### cubicBezier
```yaml
$type: cubicBezier
$value: [0.4, 0, 0.2, 1]
```

### number
Unitless number (opacity, z-index, line-height multiplier, …).

```yaml
$type: number
$value: 1.5
```

## Composite types

### typography
```yaml
$type: typography
$value:
  fontFamily: "{font.family.sans}"
  fontSize: "{dimension.font-size.300}"
  fontWeight: "{font.weight.semibold}"
  lineHeight: 1.4            # number (multiplier) — note: NOT a dimension here
  letterSpacing: { value: 0, unit: px }
```

### shadow
Single object or an array of layers.

```yaml
$type: shadow
$value:
  - color: { colorSpace: srgb, components: [0,0,0], alpha: 0.08, hex: "#000000" }
    offsetX: { value: 0, unit: px }
    offsetY: { value: 1, unit: px }
    blur:    { value: 3, unit: px }
    spread:  { value: 0, unit: px }
    inset: false
```

### border
```yaml
$type: border
$value:
  color: "{color.border.default}"
  width: { value: 1, unit: px }
  style: solid          # solid | dashed | dotted | ... (or a strokeStyle object)
```

### gradient
Array of stops.

```yaml
$type: gradient
$value:
  - color: "{color.brand.500}"
    position: 0
  - color: "{color.brand.700}"
    position: 1
```

### transition
```yaml
$type: transition
$value:
  duration: "{motion.duration.fast}"
  timingFunction: "{motion.ease.standard}"
  delay: { value: 0, unit: ms }
```

## Role convention (our extension)

DTCG says tools should not infer purpose from group names. A downstream target adapter, however, needs to know a dimension token's **role** (is `16px` spacing, a radius, or a font size?) to map it correctly. Capture the role at the agnostic L1 layer — by **top-level-group convention** (the group name IS the role) and, when a token lives outside its conventional group, by an explicit `$extensions` override:

```yaml
spacing:           # convention: group name == role
  "4": { $type: dimension, $value: { value: 16, unit: px } }

radius:
  control:
    $type: dimension
    $value: { value: 8, unit: px }
    $extensions:
      role: radius   # explicit role override wins over the group name
```

Recognized roles: `color`, `spacing`, `radius`, `font-size` (`text`), `font-family`, `font-weight`, `breakpoint`, `shadow`, `ease`. These roles are neutral. Anything unmapped is carried through as a plain `--<group>-<name>` custom property.

## Dark mode — `$extensions.org.superui.dark` (our extension)

A token whose value differs in dark mode carries the complete dark replacement under `$extensions`:

```yaml
color:
  surface:
    base:
      $type: color
      $value: "{color.gray.50}"
      $extensions:
        org.superui:
          dark: "{color.gray.900}"
```

- `dark` has the same shape and type as `$value`; aliases and composites are allowed.
- A token with no light/dark difference has no such extension.
- This is the only source of truth for dark in L1: the `.dark` block of `tokens.css` is derived from it by `tokens_to_css.ts`, and `validate_tokens.ts` validates `dark` exactly like `$value`.

## Platform variants — deliberately out of scope

A token carries ONE technology-agnostic value, plus its dark counterpart. Per-platform replacement values (a different radius on one platform, a different type ramp on another) do NOT belong in `dtcg.yml`: they live in the consuming repo's target adapter — e.g. Style Dictionary platforms — fed by the generated `tokens.json`. This is a decision, not an omission.

Dark mode earns its in-plugin extension because it is a closed, universal axis of a design system that every artifact already models (`tokens_to_css.ts` renders a `.dark` block, the sheets carry a dark toggle, `validate_tokens.ts` type-checks the value). A platform axis has none of those properties:

- `org.superui` already reserves `dark`, `synthesized`, and `provenance`. An open-ended label set in that same namespace makes every typo — `darkk`, `provenence` — validate silently as "a platform".
- The label set is defined by the consuming project, so the plugin could never enumerate it, and `tokens_to_css.ts` renders base values only — platform variants would be unrenderable in the docs and unverifiable by `fidelity-reviewer`.
- Platform mapping is exactly what a target adapter exists to do, and DTCG JSON is the sanctioned handoff point for it.

## Recommended file skeleton

```yaml
$description: "Design tokens extracted from <project> mockups"
# --- PRIMITIVES ---
color: { gray: {...}, brand: {...} }
dimension:
  font-size: {...}
font:
  family: {...}
  weight: {...}
spacing: {...}
radius: {...}
border-width: {...}
shadow: {...}
motion: { duration: {...}, ease: {...} }
zindex: {...}
breakpoint: {...}
# --- SEMANTIC (aliases into primitives) ---
# color.text.*, color.surface.*, color.border.*, color.accent.*, etc.
# typography.* composite styles
```

Start from `assets/tokens.template.yaml`.
