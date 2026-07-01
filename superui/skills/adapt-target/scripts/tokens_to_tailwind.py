#!/usr/bin/env python3
"""Convert a DTCG-in-YAML token file into a Tailwind v4 @theme stylesheet.

Deterministic: same input -> same output. No guessing of values; it only maps
the tokens that exist. Aliases become var(...) references.

Usage:
  python tokens_to_tailwind.py TOKENS.yaml [-o theme.css] [--theme-only]

  --theme-only  emit just the @theme {...} block (to paste into a prototype's
                <style type="text/tailwindcss">), without @import "tailwindcss".
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
    "motion", "duration", "dimension", "weight", "family", "size",
}

# namespace -> css variable prefix (Tailwind v4 theme namespaces)
NS_PREFIX = {
    "color": "color", "spacing": "spacing", "radius": "radius",
    "text": "text", "font": "font", "font-weight": "font-weight",
    "breakpoint": "breakpoint", "shadow": "shadow", "ease": "ease",
    # non-utility namespaces (still emitted as :root vars):
    "duration": "duration", "plain": None,
}

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


def fmt_color(v):
    if isinstance(v, str):
        m = ALIAS_RE.match(v.strip())
        if m:
            return alias_var(m.group(1))
    if not isinstance(v, dict):
        return str(v)
    alpha = v.get("alpha", 1)
    hexv = v.get("hex")
    space = v.get("colorSpace", "srgb")
    comps = v.get("components")
    if space == "srgb":
        if hexv and (alpha is None or alpha >= 1):
            return hexv
        if comps is not None and len(comps) != 3:
            return f"/* invalid srgb color: {len(comps)} components, expected 3 */"
        if comps:
            r, g, b = (round(c * 255) for c in comps)
            if alpha is not None and alpha < 1:
                return f"rgb({r} {g} {b} / {alpha})"
            return f"rgb({r} {g} {b})"
        if hexv:
            return hexv
    if space in ("oklch", "oklab", "lch", "lab") and comps:
        nums = " ".join(str(c) for c in comps)
        tail = f" / {alpha}" if (alpha is not None and alpha < 1) else ""
        return f"{space}({nums}{tail})"
    if comps:  # generic color() function for wide-gamut spaces
        nums = " ".join(str(c) for c in comps)
        tail = f" / {alpha}" if (alpha is not None and alpha < 1) else ""
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
    if isinstance(v, list) and len(v) == 4:
        return "cubic-bezier(" + ", ".join(str(x) for x in v) + ")"
    return str(v)


def alias_var(target_path):
    vn = varname.get(target_path)
    if vn:
        return f"var(--{vn})"
    return f"/* unresolved alias {target_path} */"


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
    return None  # composite handled as comment


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


def shadcn_name(path, info):
    """Resolve a token's shadcn name via $extensions or matching leaf name."""
    tw = (info["ext"].get("org.shadcn") or {}) if info["ext"] else {}
    if tw.get("token"):
        return tw["token"]
    leaf = leaf_name(path.split("."))
    return leaf if leaf in SHADCN_SET else None


def resolve_color(value, seen=None):
    """Follow aliases to a literal color object/string; return (kind, payload)."""
    seen = seen or set()
    if isinstance(value, str):
        m = ALIAS_RE.match(value.strip())
        if m:
            t = m.group(1)
            if t in seen or t not in tokens:
                return None
            return resolve_color(tokens[t]["value"], seen | {t})
        return ("css", value)  # raw css color string
    if isinstance(value, dict):
        return ("obj", value)
    return None


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


def color_to_css(value, fmt):
    """Resolved literal color -> css string in requested format (oklch|hex|raw)."""
    res = resolve_color(value)
    if not res:
        return "/* unresolved */"
    kind, payload = res
    if kind == "css":
        return payload
    obj = payload
    alpha = obj.get("alpha", 1)
    space = obj.get("colorSpace", "srgb")
    comps = obj.get("components")
    hexv = obj.get("hex")
    if fmt == "oklch" and space == "srgb" and comps and len(comps) >= 3:
        return srgb_to_oklch(comps[0], comps[1], comps[2], alpha)
    if fmt == "hex" and hexv and (alpha is None or alpha >= 1):
        return hexv
    return fmt_color(obj)  # fall back to the generic formatter


def emit_shadcn(theme_only, color_fmt):
    lines = []
    if not theme_only:
        lines.append('@import "tailwindcss";')
    lines.append("@custom-variant dark (&:is(.dark *));")
    lines.append("")

    # collect shadcn color tokens
    mapped = {}        # shadcn name -> token path
    dark_overrides = {}
    extra = []         # custom (non-shadcn) color tokens, still exposed
    radius_path = None
    for path, info in tokens.items():
        if info["type"] == "color":
            name = shadcn_name(path, info)
            if name:
                mapped[name] = path
                ov = (info["ext"].get("org.shadcn") or {}).get("dark") if info["ext"] else None
                if ov is not None:
                    dark_overrides[name] = ov
            else:
                extra.append((leaf_name(path.split(".")), path))
        elif info["type"] == "dimension":
            tw = (info["ext"].get("org.shadcn") or {}) if info["ext"] else {}
            if tw.get("token") == "radius" or leaf_name(path.split(".")) == "radius":
                radius_path = path

    # :root
    lines.append(":root {")
    if radius_path:
        lines.append(f"  --radius: {fmt_dim(tokens[radius_path]['value'])};")
    for name in SHADCN_COLOR_TOKENS:
        if name in mapped:
            lines.append(f"  --{name}: {color_to_css(tokens[mapped[name]]['value'], color_fmt)};")
    for leaf, path in extra:
        lines.append(f"  --{leaf}: {color_to_css(tokens[path]['value'], color_fmt)};")
    lines.append("}")
    lines.append("")

    # .dark — only emit values we actually have; never invent dark colors
    lines.append(".dark {")
    if dark_overrides:
        for name in SHADCN_COLOR_TOKENS:
            if name in dark_overrides:
                lines.append(f"  --{name}: {color_to_css(dark_overrides[name], color_fmt)};")
    else:
        lines.append("  /* TODO: provide dark-mode values. Not auto-generated to")
        lines.append("     avoid fabricating colors — add a dark layout image or set")
        lines.append("     $extensions.org.shadcn.dark on the relevant tokens. */")
    lines.append("}")
    lines.append("")

    # @theme inline — expose vars to Tailwind utilities + derived radius scale
    lines.append("@theme inline {")
    if radius_path:
        lines += [
            "  --radius-sm: calc(var(--radius) * 0.6);",
            "  --radius-md: calc(var(--radius) * 0.8);",
            "  --radius-lg: var(--radius);",
            "  --radius-xl: calc(var(--radius) * 1.4);",
            "  --radius-2xl: calc(var(--radius) * 1.8);",
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
        lines.append("/* shadcn tokens not found in the token file (name them, or set")
        lines.append("   $extensions.org.shadcn.token, to emit them): */")
        lines.append("/*   " + ", ".join(missing) + " */")
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tokens")
    ap.add_argument("-o", "--out")
    ap.add_argument("--theme-only", action="store_true")
    ap.add_argument("--shadcn", action="store_true",
                    help="emit shadcn/ui-compatible :root/.dark + @theme inline")
    ap.add_argument("--color-format", choices=["oklch", "hex"], default=None,
                    help="color output format (default: oklch in --shadcn, else hex)")
    args = ap.parse_args()

    with open(args.tokens) as f:
        data = yaml.safe_load(f)
    walk(data, [], None)
    compute_varnames()

    if args.shadcn:
        out = emit_shadcn(args.theme_only, args.color_format or "oklch")
        if args.out:
            with open(args.out, "w") as f:
                f.write(out)
            print(f"Wrote {args.out} (shadcn-compatible)")
        else:
            print(out)
        return

    lines = []
    if not args.theme_only:
        lines.append('@import "tailwindcss";')
        lines.append("")
    lines.append("@theme {")

    skipped = []
    # group output by namespace for readability, in a stable order
    order = ["color", "font", "font-weight", "text", "spacing", "radius",
             "shadow", "breakpoint", "ease", "duration", "plain"]
    by_ns = {k: [] for k in order}
    for path, info in tokens.items():
        ns = role_of(path.split("."), info["type"], info["ext"])
        val = emit_value(info)
        if val is None:
            skipped.append((path, info["type"]))
            continue
        by_ns.setdefault(ns, []).append((varname[path], val))

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

    if skipped:
        lines.append("")
        lines.append("/* Composite tokens not auto-mapped (build by hand if needed): */")
        for path, t in skipped:
            lines.append(f"/*   {path}  ($type: {t}) */")

    out = "\n".join(lines) + "\n"
    if args.out:
        with open(args.out, "w") as f:
            f.write(out)
        print(f"Wrote {args.out}  ({len(tokens)} tokens, {len(skipped)} composites skipped)")
    else:
        print(out)


if __name__ == "__main__":
    main()
