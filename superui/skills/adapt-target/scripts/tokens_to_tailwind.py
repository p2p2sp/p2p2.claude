#!/usr/bin/env python3
"""Convert a DTCG-in-YAML token file into a Tailwind v4 @theme stylesheet.

Deterministic: same input -> same output. No guessing of values; it only maps
the tokens that exist. Aliases become var(...) references in plain mode; in
--shadcn mode (and wherever a literal is required) aliases are resolved to
their literal values.

Usage:
  python tokens_to_tailwind.py TOKENS.yaml [-o OUT] [--theme-only] [--shadcn]
                               [--color-format oklch|hex]

Flags:
  TOKENS.yaml     DTCG tokens in YAML (groups with $type/$value/$extensions).
  -o, --out OUT   write the stylesheet to OUT instead of stdout.
  --theme-only    omit the leading `@import "tailwindcss";` line (both modes)
                  so the output can be pasted into <style type="text/tailwindcss">.
  --shadcn        emit the shadcn/ui idiom (:root/.dark literal variables +
                  @theme inline var() bridge) instead of the plain @theme block.
  --color-format  oklch | hex — output format for literal colors, honored in
                  BOTH modes. Default: oklch with --shadcn (matching shadcn v4),
                  hex otherwise. oklch converts sRGB (components or hex-only)
                  deterministically; hex emits #rrggbb when alpha is 1, else
                  rgb(r g b / a). Non-sRGB spaces are always emitted natively
                  (oklch()/lab()/color(<space> ...)).

Dark mode (both modes):
  The ONLY dark source is `$extensions: { org.superui: { dark: <value> } }` on
  a token — same shape/type as its $value; aliases allowed. Dark values are
  never invented.
  - plain mode: emits `@custom-variant dark (&:where(.dark, .dark *));`; when
    at least one token carries a dark value, a
    `@layer base { .dark { --<name>: <value>; } }` override block follows the
    @theme block; with no dark values a comment says so instead.
  - --shadcn mode: dark values land in the `.dark { }` block (with a TODO
    comment scaffold when no token has one).

Plain mode:
  - Namespace per token: $type + path role (see references/tailwind.md),
    overridable with `$extensions: { org.tailwindcss: { namespace, name } }`.
  - typography composites are DECOMPOSED: fontSize -> --text-<name>,
    lineHeight -> --text-<name>--line-height, letterSpacing ->
    --text-<name>--letter-spacing, fontWeight -> --font-weight-<name>,
    fontFamily -> --font-<name>; absent parts are omitted; each decomposed
    style is listed in a trailing comment. Other composite types (border,
    transition, gradient, ...) are skipped and listed in a comment.

--shadcn mode:
  - Emits ONLY color tokens and the base radius. A color maps to a shadcn
    variable when its leaf name equals a shadcn token name (background,
    foreground, primary, ..., sidebar-ring); other colors are still exposed
    as --<leaf> + --color-<leaf>. All other tokens (fonts, spacing, shadows,
    breakpoints, durations, ...) are NOT emitted and are listed in a trailing
    "not emitted" comment.
  - Base radius: the dimension token at path `radius` / `radius.base` or with
    leaf name `radius`; an alias $value is resolved to its literal. The
    derived scale uses shadcn's documented offsets:
    sm = --radius - 4px, md = --radius - 2px, lg = --radius, xl = --radius + 4px.
  - shadcn tokens absent from the file are listed in a trailing comment.

Collisions (both modes): when two tokens emit the same custom-property name,
a warning is printed to stderr and a WARNING comment is appended to the output
(in CSS the later declaration wins).
"""
import argparse
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: pip install pyyaml --break-system-packages")

ALIAS_RE = re.compile(r"^\{([^}]+)\}$")

# leading path segments that only indicate structure/role, stripped from var leaf
STRUCTURAL = {
    "color", "colors", "spacing", "space", "radius", "radii", "breakpoint",
    "breakpoints", "screen", "screens", "shadow", "shadows", "elevation",
    "font", "font-size", "font-family", "font-weight", "ease", "easing",
    "motion", "duration", "dimension", "weight", "family", "size", "typography",
}

# namespace -> css variable prefix (Tailwind v4 theme namespaces)
NS_PREFIX = {
    "color": "color", "spacing": "spacing", "radius": "radius",
    "text": "text", "font": "font", "font-weight": "font-weight",
    "breakpoint": "breakpoint", "shadow": "shadow", "ease": "ease",
    # non-utility namespaces (still emitted as theme vars):
    "duration": "duration", "plain": None,
}

COLOR_FMT = "hex"   # set in main() from --color-format / mode default

tokens = {}     # dotted path -> {type, value, ext}
varname = {}    # dotted path -> css var name (without leading --)


def walk(node, path, inherited_type):
    if not isinstance(node, dict):
        return
    node_type = node.get("$type", inherited_type)
    if "$value" in node:
        tokens[".".join(path)] = {
            "type": node_type,
            "value": node["$value"],
            "ext": node.get("$extensions", {}),
        }
        return
    for key, child in node.items():
        if not key.startswith("$"):
            walk(child, path + [key], node_type)


def dark_of(info):
    """The token's canonical dark value ($extensions.org.superui.dark), or None."""
    ext = info.get("ext") or {}
    return (ext.get("org.superui") or {}).get("dark")


def role_of(path_list, ttype, ext):
    # explicit override
    ns = (ext.get("org.tailwindcss") or {}).get("namespace") if ext else None
    if ns:
        return ns
    if ttype == "color":
        return "color"
    if ttype == "fontFamily":
        return "font"
    if ttype == "fontWeight":
        return "font-weight"
    if ttype == "cubicBezier":
        return "ease"
    if ttype == "shadow":
        return "shadow"
    if ttype == "duration":
        return "duration"
    if ttype == "number":
        return "plain"
    if ttype == "dimension":
        segs = set(path_list)
        if "radius" in segs or "radii" in segs:
            return "radius"
        if "breakpoint" in segs or "breakpoints" in segs or "screen" in segs or "screens" in segs:
            return "breakpoint"
        if "font-size" in segs or ("size" in segs and "font" in segs) or path_list[0] == "text":
            return "text"
        if "border-width" in segs or "border-widths" in segs or "stroke" in segs:
            return "plain"
        return "spacing"  # default bucket for dimensions
    return "plain"  # composites (typography/border/gradient/transition) handled separately


def leaf_name(path_list):
    p = list(path_list)
    while len(p) > 1 and p[0] in STRUCTURAL:
        p.pop(0)
    # if everything got stripped to a structural single word, keep original last
    name = "-".join(p) if p else path_list[-1]
    return name.replace("_", "-")


def compute_varnames():
    for path, info in tokens.items():
        ns = role_of(path.split("."), info["type"], info["ext"])
        prefix = NS_PREFIX.get(ns)
        tw = (info["ext"].get("org.tailwindcss") or {}) if info["ext"] else {}
        leaf = tw.get("name") or leaf_name(path.split("."))
        if prefix is None:  # plain
            varname[path] = leaf
        else:
            varname[path] = f"{prefix}-{leaf}"


def hex_to_components(hexv):
    """'#rgb'/'#rgba'/'#rrggbb'/'#rrggbbaa' -> ([r,g,b] 0..1, alpha|None)."""
    h = str(hexv).lstrip("#").strip()
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    if len(h) not in (6, 8) or any(c not in "0123456789abcdefABCDEF" for c in h):
        return None
    comps = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    a = round(int(h[6:8], 16) / 255, 4) if len(h) == 8 else None
    return comps, a


def _srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def srgb_to_oklch(r, g, b, alpha=1):
    """sRGB (0..1) -> 'oklch(L C H)' string (deterministic)."""
    import math
    lr, lg, lb = (_srgb_to_linear(x) for x in (r, g, b))
    l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
    m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
    s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
    l_, m_, s_ = (x ** (1 / 3) if x >= 0 else -((-x) ** (1 / 3)) for x in (l, m, s))
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    C = math.hypot(a, bb)
    H = math.degrees(math.atan2(bb, a)) % 360

    def _n(x):
        return f"{x:.4f}".rstrip("0").rstrip(".") or "0"

    if round(C, 4) == 0:
        body = f"{_n(round(L, 4))} 0 0"
    else:
        body = f"{_n(round(L, 4))} {_n(round(C, 4))} {_n(round(H, 2))}"
    return f"oklch({body} / {alpha})" if alpha is not None and alpha < 1 else f"oklch({body})"


def fmt_color(v):
    if isinstance(v, str):
        m = ALIAS_RE.match(v.strip())
        if m:
            return alias_var(m.group(1))
        return v  # raw css color string
    if not isinstance(v, dict):
        return str(v)
    space = v.get("colorSpace", "srgb")
    comps = v.get("components")
    hexv = v.get("hex")
    alpha = v.get("alpha")
    if space == "srgb" and comps is None and hexv:
        parsed = hex_to_components(hexv)
        if parsed:
            comps, hex_alpha = parsed
            if alpha is None and hex_alpha is not None:
                alpha = hex_alpha  # alpha embedded in #rrggbbaa
    if alpha is None:
        alpha = 1
    if space == "srgb":
        if comps is not None and len(comps) != 3:
            return f"/* invalid srgb color: {len(comps)} components, expected 3 */"
        if comps:
            if COLOR_FMT == "oklch":
                return srgb_to_oklch(comps[0], comps[1], comps[2], alpha)
            r, g, b = (round(c * 255) for c in comps)
            if alpha < 1:
                return f"rgb({r} {g} {b} / {alpha})"
            if hexv and len(str(hexv).lstrip("#")) <= 6:
                return hexv
            return f"#{r:02x}{g:02x}{b:02x}"
        if hexv:
            return hexv  # unparseable hex string — emit as-is
    if space in ("oklch", "oklab", "lch", "lab") and comps:
        nums = " ".join(str(c) for c in comps)
        tail = f" / {alpha}" if alpha < 1 else ""
        return f"{space}({nums}{tail})"
    if comps:  # generic color() function for wide-gamut spaces
        nums = " ".join(str(c) for c in comps)
        tail = f" / {alpha}" if alpha < 1 else ""
        return f"color({space} {nums}{tail})"
    return hexv or "/* unresolved color */"


def fmt_dim(v):
    if isinstance(v, str):
        m = ALIAS_RE.match(v.strip())
        if m:
            return alias_var(m.group(1))
    if isinstance(v, dict):
        return f"{v.get('value')}{v.get('unit', '')}"
    return str(v)


def fmt_font_family(v):
    if isinstance(v, str):
        m = ALIAS_RE.match(v.strip())
        if m:
            return alias_var(m.group(1))
        return v
    if isinstance(v, list):
        parts = [f'"{x}"' if " " in x else x for x in v]
        return ", ".join(parts)
    return str(v)


def fmt_shadow(v):
    layers = v if isinstance(v, list) else [v]
    out = []
    for ly in layers:
        if isinstance(ly, str):
            m = ALIAS_RE.match(ly.strip())
            if m:
                out.append(alias_var(m.group(1)))
                continue
        inset = "inset " if ly.get("inset") else ""
        ox = fmt_dim(ly.get("offsetX", {"value": 0, "unit": "px"}))
        oy = fmt_dim(ly.get("offsetY", {"value": 0, "unit": "px"}))
        bl = fmt_dim(ly.get("blur", {"value": 0, "unit": "px"}))
        sp = fmt_dim(ly.get("spread", {"value": 0, "unit": "px"}))
        col = fmt_color(ly.get("color"))
        out.append(f"{inset}{ox} {oy} {bl} {sp} {col}")
    return ", ".join(out)


def fmt_bezier(v):
    if isinstance(v, str):
        m = ALIAS_RE.match(v.strip())
        if m:
            return alias_var(m.group(1))
    if isinstance(v, list) and len(v) == 4:
        return "cubic-bezier(" + ", ".join(str(x) for x in v) + ")"
    return str(v)


def alias_var(target_path):
    vn = varname.get(target_path)
    if vn:
        return f"var(--{vn})"
    return f"/* unresolved alias {target_path} */"


def resolve_literal(value, seen=None):
    """Follow string aliases through the token table to a literal value (or None)."""
    seen = seen or set()
    if isinstance(value, str):
        m = ALIAS_RE.match(value.strip())
        if m:
            t = m.group(1)
            if t in seen or t not in tokens:
                return None
            return resolve_literal(tokens[t]["value"], seen | {t})
    return value


def emit_value(info):
    t, v = info["type"], info["value"]
    if t == "color":
        return fmt_color(v)
    if t == "dimension":
        return fmt_dim(v)
    if t == "fontFamily":
        return fmt_font_family(v)
    if t == "fontWeight":
        if isinstance(v, str) and ALIAS_RE.match(v.strip()):
            return alias_var(ALIAS_RE.match(v.strip()).group(1))
        return str(v)
    if t == "shadow":
        return fmt_shadow(v)
    if t == "cubicBezier":
        return fmt_bezier(v)
    if t == "duration":
        return fmt_dim(v)
    if t == "number":
        if isinstance(v, str) and ALIAS_RE.match(v.strip()):
            return alias_var(ALIAS_RE.match(v.strip()).group(1))
        return str(v)
    return None  # composite: typography decomposed by caller, others -> comment


def decompose_typography(leaf, v):
    """DTCG typography composite -> [(namespace, var name, css value)].

    fontSize -> text-<leaf>; lineHeight/letterSpacing -> text-<leaf>--<part>
    (Tailwind v4 font-size sub-values); fontWeight -> font-weight-<leaf>;
    fontFamily -> font-<leaf>. Absent parts are omitted.
    """
    if not isinstance(v, dict):
        return []
    out = []
    if "fontSize" in v:
        out.append(("text", f"text-{leaf}", fmt_dim(v["fontSize"])))
    if "lineHeight" in v:
        out.append(("text", f"text-{leaf}--line-height", fmt_dim(v["lineHeight"])))
    if "letterSpacing" in v:
        out.append(("text", f"text-{leaf}--letter-spacing", fmt_dim(v["letterSpacing"])))
    if "fontWeight" in v:
        fw = v["fontWeight"]
        m = ALIAS_RE.match(fw.strip()) if isinstance(fw, str) else None
        out.append(("font-weight", f"font-weight-{leaf}", alias_var(m.group(1)) if m else str(fw)))
    if "fontFamily" in v:
        out.append(("font", f"font-{leaf}", fmt_font_family(v["fontFamily"])))
    return out


def collision_lines(emitted):
    """emitted: css var name -> [token paths]. Warn on stderr, return CSS comment lines."""
    coll = {n: ps for n, ps in emitted.items() if len(ps) > 1}
    if not coll:
        return []
    lines = ["", "/* WARNING: custom-property name collisions (the later declaration wins): */"]
    for n in sorted(coll):
        print(f"warning: collision: --{n} emitted by {', '.join(coll[n])}", file=sys.stderr)
        lines.append(f"/*   --{n}: {', '.join(coll[n])} */")
    return lines


# ---------------------------------------------------------------------------
# shadcn/ui compatibility (Tailwind v4): emit :root / .dark + @theme inline
# using shadcn's semantic token names. Source: ui.shadcn.com/docs/theming
# ---------------------------------------------------------------------------

# Ordered for readable output. Each is a CSS var --<name> under :root.
SHADCN_COLOR_TOKENS = [
    "background", "foreground",
    "card", "card-foreground",
    "popover", "popover-foreground",
    "primary", "primary-foreground",
    "secondary", "secondary-foreground",
    "muted", "muted-foreground",
    "accent", "accent-foreground",
    "destructive", "destructive-foreground",
    "border", "input", "ring",
    "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
    "sidebar", "sidebar-foreground",
    "sidebar-primary", "sidebar-primary-foreground",
    "sidebar-accent", "sidebar-accent-foreground",
    "sidebar-border", "sidebar-ring",
]
SHADCN_SET = set(SHADCN_COLOR_TOKENS)


def color_to_css(value):
    """Resolve aliases to a literal color, then format per COLOR_FMT."""
    lit = resolve_literal(value)
    if lit is None:
        return f"/* unresolved alias {value} */"
    return fmt_color(lit)


def emit_shadcn(theme_only):
    lines = []
    if not theme_only:
        lines.append('@import "tailwindcss";')
    lines.append("@custom-variant dark (&:is(.dark *));")
    lines.append("")

    mapped = {}          # shadcn name -> token path (later token wins)
    extra = []           # (leaf, path) non-shadcn color tokens, still exposed
    dark_vals = {}       # emitted var name -> css dark value
    radius_path = None
    skipped = []         # (path, $type) tokens shadcn mode does not emit
    emitted = {}         # emitted var name -> [paths] (collision detection)

    for path, info in tokens.items():
        leaf = leaf_name(path.split("."))
        if info["type"] == "color":
            name = leaf if leaf in SHADCN_SET else None
            if name:
                mapped[name] = path
            else:
                extra.append((leaf, path))
                name = leaf
            emitted.setdefault(name, []).append(path)
            dark = dark_of(info)
            if dark is not None:
                dark_vals[name] = color_to_css(dark)
        elif info["type"] == "dimension" and (path in ("radius", "radius.base") or leaf == "radius"):
            if radius_path is None:
                radius_path = path
            emitted.setdefault("radius", []).append(path)
            dark = dark_of(info)
            if dark is not None:
                lit = resolve_literal(dark)
                dark_vals["radius"] = fmt_dim(lit) if lit is not None else f"/* unresolved alias {dark} */"
        else:
            skipped.append((path, info["type"]))

    # :root
    lines.append(":root {")
    if radius_path:
        lit = resolve_literal(tokens[radius_path]["value"])
        if lit is not None:
            lines.append(f"  --radius: {fmt_dim(lit)};")
        else:
            lines.append(f"  /* --radius: unresolved alias {tokens[radius_path]['value']} */")
    for name in SHADCN_COLOR_TOKENS:
        if name in mapped:
            lines.append(f"  --{name}: {color_to_css(tokens[mapped[name]]['value'])};")
    for leaf, path in extra:
        lines.append(f"  --{leaf}: {color_to_css(tokens[path]['value'])};")
    lines.append("}")
    lines.append("")

    # .dark — only from $extensions.org.superui.dark; never invent dark values
    lines.append(".dark {")
    if dark_vals:
        if "radius" in dark_vals:
            lines.append(f"  --radius: {dark_vals['radius']};")
        for name in SHADCN_COLOR_TOKENS:
            if name in dark_vals:
                lines.append(f"  --{name}: {dark_vals[name]};")
        for leaf, _ in extra:
            if leaf in dark_vals and leaf not in SHADCN_SET:
                lines.append(f"  --{leaf}: {dark_vals[leaf]};")
    else:
        lines.append("  /* TODO: provide dark-mode values. Not auto-generated to")
        lines.append("     avoid fabricating colors - add a dark layout image or set")
        lines.append("     $extensions.org.superui.dark on the relevant tokens. */")
    lines.append("}")
    lines.append("")

    # @theme inline — expose vars to Tailwind utilities + derived radius scale
    lines.append("@theme inline {")
    if radius_path:
        lines += [
            "  --radius-sm: calc(var(--radius) - 4px);",
            "  --radius-md: calc(var(--radius) - 2px);",
            "  --radius-lg: var(--radius);",
            "  --radius-xl: calc(var(--radius) + 4px);",
        ]
    for name in SHADCN_COLOR_TOKENS:
        if name in mapped:
            lines.append(f"  --color-{name}: var(--{name});")
    for leaf, _ in extra:
        lines.append(f"  --color-{leaf}: var(--{leaf});")
    lines.append("}")

    missing = [n for n in SHADCN_COLOR_TOKENS if n not in mapped]
    if missing:
        lines.append("")
        lines.append("/* shadcn tokens not found in the token file (rename tokens to these")
        lines.append("   leaf names to emit them): */")
        lines.append("/*   " + ", ".join(missing) + " */")

    if skipped:
        lines.append("")
        lines.append("/* tokens not emitted in --shadcn mode (only colors + the base radius are;")
        lines.append("   run without --shadcn for the full @theme, or add these by hand): */")
        for path, t in skipped:
            lines.append(f"/*   {path}  ($type: {t}) */")

    lines += collision_lines(emitted)
    return "\n".join(lines) + "\n"


def emit_plain(theme_only):
    lines = []
    if not theme_only:
        lines.append('@import "tailwindcss";')
        lines.append("")
    lines.append("@custom-variant dark (&:where(.dark, .dark *));")
    lines.append("")
    lines.append("@theme {")

    skipped = []         # (path, $type) composites not auto-mapped
    decomposed = []      # (path, leaf) typography composites decomposed
    dark_entries = []    # (var name, css value) from $extensions.org.superui.dark
    emitted = {}         # var name -> [paths] (collision detection)

    # group output by namespace for readability, in a stable order
    order = ["color", "font", "font-weight", "text", "spacing", "radius",
             "shadow", "breakpoint", "ease", "duration", "plain"]
    by_ns = {k: [] for k in order}
    for path, info in tokens.items():
        ns = role_of(path.split("."), info["type"], info["ext"])
        dark = dark_of(info)
        val = emit_value(info)
        if val is None:
            if info["type"] == "typography":
                parts = decompose_typography(varname[path], info["value"])
                if parts:
                    decomposed.append((path, varname[path]))
                    for pns, nm, cv in parts:
                        by_ns.setdefault(pns, []).append((nm, cv))
                        emitted.setdefault(nm, []).append(path)
                    for pns, nm, cv in decompose_typography(varname[path], dark or {}):
                        dark_entries.append((nm, cv))
                    continue
            skipped.append((path, info["type"]))
            continue
        name = varname[path]
        by_ns.setdefault(ns, []).append((name, val))
        emitted.setdefault(name, []).append(path)
        if dark is not None:
            dval = emit_value({"type": info["type"], "value": dark})
            if dval is not None:
                dark_entries.append((name, dval))

    for ns in order:
        items = by_ns.get(ns) or []
        if not items:
            continue
        label = ns if ns != "plain" else "other"
        lines.append(f"  /* {label} */")
        for name, val in items:
            lines.append(f"  --{name}: {val};")
        lines.append("")
    lines.append("}")

    # dark overrides — only from $extensions.org.superui.dark; never invented
    lines.append("")
    if dark_entries:
        lines.append("@layer base {")
        lines.append("  .dark {")
        for name, val in dark_entries:
            lines.append(f"    --{name}: {val};")
        lines.append("  }")
        lines.append("}")
    else:
        lines.append("/* no dark overrides in design-tokens.yaml ($extensions.org.superui.dark);")
        lines.append("   if the L1 tokens.css has a .dark block, port it manually */")

    if decomposed:
        lines.append("")
        lines.append("/* typography composites decomposed into --text-* / --font-weight-* / --font-*: */")
        for path, leaf in decomposed:
            lines.append(f"/*   {path} -> --text-{leaf}[--line-height|--letter-spacing], "
                         f"--font-weight-{leaf}, --font-{leaf} */")

    if skipped:
        lines.append("")
        lines.append("/* Composite tokens not auto-mapped (build by hand if needed): */")
        for path, t in skipped:
            lines.append(f"/*   {path}  ($type: {t}) */")

    lines += collision_lines(emitted)
    return "\n".join(lines) + "\n", len(skipped), len(decomposed)


def main():
    global COLOR_FMT
    ap = argparse.ArgumentParser(
        description="Deterministic DTCG-in-YAML -> Tailwind v4 @theme stylesheet "
                    "(--shadcn: shadcn/ui :root/.dark + @theme inline idiom). "
                    "Dark values come only from $extensions.org.superui.dark.")
    ap.add_argument("tokens")
    ap.add_argument("-o", "--out")
    ap.add_argument("--theme-only", action="store_true",
                    help="omit the @import \"tailwindcss\"; line (both modes)")
    ap.add_argument("--shadcn", action="store_true",
                    help="emit shadcn/ui-compatible :root/.dark + @theme inline")
    ap.add_argument("--color-format", choices=["oklch", "hex"], default=None,
                    help="literal-color output format, both modes "
                         "(default: oklch with --shadcn, hex otherwise)")
    args = ap.parse_args()
    COLOR_FMT = args.color_format or ("oklch" if args.shadcn else "hex")

    with open(args.tokens, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    walk(data, [], None)
    compute_varnames()

    if args.shadcn:
        out = emit_shadcn(args.theme_only)
        summary = f"Wrote {args.out} (shadcn-compatible)"
    else:
        out, n_skipped, n_decomposed = emit_plain(args.theme_only)
        summary = (f"Wrote {args.out}  ({len(tokens)} tokens, {n_skipped} composites "
                   f"skipped, {n_decomposed} typography decomposed)")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out)
        print(summary)
    else:
        print(out)


if __name__ == "__main__":
    main()
