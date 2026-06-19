# DTCG token format (2025.10) — YAML serialization

The W3C Design Tokens Community Group format reached its first stable version,
**2025.10**, on 2025-10-28. The spec defines a JSON file format. YAML is a
superset of JSON's data model, so we author tokens in **YAML using the exact
DTCG object model** (same `$`-prefixed keys, same value shapes). The scripts in
this skill load the YAML and treat it as the DTCG structure 1:1, so it converts
losslessly to `.tokens.json` if ever needed.

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

- `$value` and `$type` are **required** (per token, or `$type` inherited from the
  nearest parent group that sets it).
- Token / group names **must not** start with `$` and must not contain `.`, `{`,
  `}` (those are reserved for the alias syntax). Prefer kebab/lower names.
- Allowed token metadata: `$description`, `$extensions`, `$deprecated`.
- A **group** is any object without `$value`. Groups may set a group-wide
  `$type`. Groups are organizational only — do not encode meaning a tool must
  rely on (we use a small, explicit convention for Tailwind; see below).

## Aliases (references)

A value may reference another token with curly-brace path syntax:

```yaml
color:
  text:
    primary:
      $type: color
      $value: "{color.gray.900}"   # alias → resolves to that token's value
```

Use aliases to build the **semantic layer** on top of **primitives**. Never
duplicate a raw value in two places — alias instead.

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
Always include `hex` for sRGB colors — `sample_colors.py` emits it and the
Tailwind converter prefers it for readable output.

### dimension
A number plus a unit. Use for spacing, sizes, radii, border widths, font sizes,
breakpoints.

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

## Tailwind role convention (our extension)

DTCG says tools should not infer purpose from group names. The Tailwind
converter therefore needs to know a dimension token's **role** (is `16px`
spacing, a radius, or a font size?). Provide it explicitly with `$extensions`,
falling back to a top-level-group convention:

```yaml
spacing:           # convention: group name == role
  "4": { $type: dimension, $value: { value: 16, unit: px } }

radius:
  control:
    $type: dimension
    $value: { value: 8, unit: px }
    $extensions:
      org.tailwindcss: { namespace: radius }   # explicit override wins
```

Recognized roles → Tailwind namespaces: `color→color`, `spacing→spacing`,
`radius→radius`, `font-size`/`text→text`, `font-family→font`,
`font-weight→font-weight`, `breakpoint→breakpoint`, `shadow→shadow`,
`ease→ease`. Anything unmapped is emitted as a plain `--<group>-<name>` custom
property with a comment. See `tailwind-v4-mapping.md`.

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
