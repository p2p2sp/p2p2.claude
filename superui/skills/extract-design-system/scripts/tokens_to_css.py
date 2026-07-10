#!/usr/bin/env python3
"""Deterministically transform a validated DTCG-in-YAML token file into tokens.css.

IN : argv[1] — path to design-tokens.yaml (read as UTF-8). Run
     validate_tokens.py on it FIRST; this script assumes a well-formed tree
     but still fails hard on any alias it cannot resolve.
     argv[2] — output path for tokens.css (written as UTF-8; parent dir must exist).
OUT: writes argv[2] with:
     - :root { ... } — one flat custom property per token (primitives AND
       semantic/component), in YAML order. Property name = token path with
       dots replaced by hyphens, prefixed "--" (color.surface.base ->
       --color-surface-base). Alias values emit var(--target-path). Shadow /
       border / transition composites emit one usable CSS value (nested
       aliases become var(--...)). Typography and gradient composites emit as
       CSS comments — their parts already exist as tokens, so markup consumes
       the parts directly (gradients also lack a direction in DTCG).
     - .dark { ... } — one override per token carrying
       $extensions.org.superui.dark (the L1 dark-mode canon), rendered exactly
       like $value. When no token carries a dark value, the block is a TODO
       scaffold comment.
     stdout — one summary line: "<n> declarations, <m> dark overrides -> <path>".
Exit codes: 0 = written; 1 = error (message on stderr: bad args, missing dep,
     unreadable input, unresolvable alias, unrenderable value).
Flags: none.
"""
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: python -m pip install pyyaml --break-system-packages")

ALIAS_RE = re.compile(r"^\{([^}]+)\}$")
IDENT_RE = re.compile(r"^-?[A-Za-z_][A-Za-z0-9_-]*$")
_MISSING = object()

tokens = {}  # dotted path -> {"type":..., "value":..., "dark":...}


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def css_name(path):
    return "--" + path.replace(".", "-")


def dark_of(node):
    ext = node.get("$extensions")
    if isinstance(ext, dict):
        org = ext.get("org.superui")
        if isinstance(org, dict) and "dark" in org:
            return org["dark"]
    return _MISSING


def walk(node, path, inherited_type):
    if not isinstance(node, dict):
        return
    node_type = node.get("$type", inherited_type)
    if "$value" in node:
        tokens[".".join(path)] = {"type": node_type, "value": node["$value"],
                                  "dark": dark_of(node)}
        return
    for key, child in node.items():
        if key.startswith("$"):
            continue
        walk(child, path + [key], node_type)


def alias_var(path, v):
    """Return var(--...) when v is an alias string, else None."""
    if isinstance(v, str):
        m = ALIAS_RE.match(v.strip())
        if m:
            target = m.group(1)
            if target not in tokens:
                fail(f"{path}: alias '{{{target}}}' does not resolve")
            return f"var({css_name(target)})"
    return None


def num(x):
    if isinstance(x, (int, float)) and float(x) == int(x):
        return str(int(x))
    return str(x)


def css_color(path, v):
    a = alias_var(path, v)
    if a:
        return a
    if not isinstance(v, dict):
        fail(f"{path}: color value must be an object or alias")
    alpha = v.get("alpha", 1)
    comps = v.get("components")
    space = v.get("colorSpace", "srgb")
    if space == "srgb":
        if alpha == 1 and isinstance(v.get("hex"), str):
            return v["hex"]
        if not (isinstance(comps, list) and len(comps) == 3):
            fail(f"{path}: srgb color needs 3 components")
        r, g, b = (int(round(c * 255)) for c in comps)
        if alpha == 1:
            return f"#{r:02x}{g:02x}{b:02x}"
        return f"rgb({r} {g} {b} / {num(alpha)})"
    if not isinstance(comps, list):
        fail(f"{path}: color needs a components list")
    c = " ".join(num(x) for x in comps)
    return f"color({space} {c})" if alpha == 1 else f"color({space} {c} / {num(alpha)})"


def css_dim(path, v):
    a = alias_var(path, v)
    if a:
        return a
    if not (isinstance(v, dict) and "value" in v and "unit" in v):
        fail(f"{path}: dimension/duration must be {{value, unit}} or alias")
    return f"{num(v['value'])}{v['unit']}"


def css_font_family(path, v):
    a = alias_var(path, v)
    if a:
        return a
    fams = v if isinstance(v, list) else [v]
    out = []
    for f in fams:
        f = str(f)
        out.append(f if IDENT_RE.match(f) else f'"{f}"')
    return ", ".join(out)


def css_bezier(path, v):
    a = alias_var(path, v)
    if a:
        return a
    if isinstance(v, str):
        return v  # keyword like ease-in-out
    if not (isinstance(v, list) and len(v) == 4):
        fail(f"{path}: cubicBezier must be 4 numbers, a keyword, or an alias")
    return f"cubic-bezier({', '.join(num(x) for x in v)})"


def css_shadow(path, v):
    a = alias_var(path, v)
    if a:
        return a
    layers = v if isinstance(v, list) else [v]
    parts = []
    for layer in layers:
        la = alias_var(path, layer)
        if la:
            parts.append(la)
            continue
        if not isinstance(layer, dict):
            fail(f"{path}: shadow layer must be an object or alias")
        bits = []
        if layer.get("inset"):
            bits.append("inset")
        for k in ("offsetX", "offsetY", "blur", "spread"):
            bits.append(css_dim(path, layer.get(k, {"value": 0, "unit": "px"})))
        bits.append(css_color(path, layer.get("color")))
        parts.append(" ".join(bits))
    return ", ".join(parts)


def css_border(path, v):
    a = alias_var(path, v)
    if a:
        return a
    if not isinstance(v, dict):
        fail(f"{path}: border must be an object or alias")
    style = v.get("style", "solid")
    if not isinstance(style, str):
        fail(f"{path}: strokeStyle objects are not CSS-representable; use a keyword")
    return (f"{css_dim(path, v.get('width'))} {style} "
            f"{css_color(path, v.get('color'))}")


def css_transition(path, v):
    a = alias_var(path, v)
    if a:
        return a
    if not isinstance(v, dict):
        fail(f"{path}: transition must be an object or alias")
    bits = [css_dim(path, v.get("duration"))]
    tf = v.get("timingFunction")
    if tf is not None:
        bits.append(css_bezier(path, tf))
    delay = v.get("delay")
    if delay is not None:
        bits.append(css_dim(path, delay))
    return " ".join(bits)


def sub_value(path, k, v):
    """Render one composite sub-part for a comment (typography / gradient)."""
    a = alias_var(path, v)
    if a:
        return a
    if isinstance(v, dict) and "value" in v and "unit" in v:
        return css_dim(path, v)
    if isinstance(v, dict) and ("colorSpace" in v or "hex" in v):
        return css_color(path, v)
    if isinstance(v, list):
        return ", ".join(str(x) for x in v)
    return num(v) if isinstance(v, (int, float)) else str(v)


def typography_comment(path, v):
    if not isinstance(v, dict):
        fail(f"{path}: typography must be an object")
    body = "; ".join(f"{k}: {sub_value(path, k, sv)}" for k, sv in v.items())
    return f"/* typography {path}: {body} */"


def gradient_comment(path, v):
    if not isinstance(v, list):
        fail(f"{path}: gradient must be a list of stops")
    stops = ", ".join(
        f"{sub_value(path, 'color', s.get('color'))} {num(s.get('position', 0))}"
        for s in v)
    return f"/* gradient {path}: stops [{stops}] — direction is usage-specific */"


def render(path, token_type, v):
    """Return ('decl', css_value) or ('comment', text)."""
    a = alias_var(path, v)
    if a:
        return "decl", a
    if token_type == "color":
        return "decl", css_color(path, v)
    if token_type in ("dimension", "duration"):
        return "decl", css_dim(path, v)
    if token_type in ("number", "fontWeight"):
        if isinstance(v, (int, float)):
            return "decl", num(v)
        return "decl", str(v)  # fontWeight keyword
    if token_type == "fontFamily":
        return "decl", css_font_family(path, v)
    if token_type == "cubicBezier":
        return "decl", css_bezier(path, v)
    if token_type == "shadow":
        return "decl", css_shadow(path, v)
    if token_type == "border":
        return "decl", css_border(path, v)
    if token_type == "transition":
        return "decl", css_transition(path, v)
    if token_type == "typography":
        return "comment", typography_comment(path, v)
    if token_type == "gradient":
        return "comment", gradient_comment(path, v)
    if isinstance(v, (int, float, str)):
        return "decl", num(v) if isinstance(v, (int, float)) else v
    fail(f"{path}: cannot render $type {token_type!r} to CSS")


def main():
    if len(sys.argv) != 3:
        fail("usage: tokens_to_css.py TOKENS.yaml OUTPUT.css")
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except OSError as e:
        fail(f"cannot read {sys.argv[1]!r}: {e}")
    if not isinstance(data, dict):
        fail("top level must be a mapping")

    walk(data, [], None)

    root_lines, dark_lines = [], []
    n_decl = n_dark = 0
    for path, info in tokens.items():
        kind, text = render(path, info["type"], info["value"])
        if kind == "decl":
            root_lines.append(f"  {css_name(path)}: {text};")
            n_decl += 1
        else:
            root_lines.append(f"  {text}")
        if info["dark"] is not _MISSING:
            dkind, dtext = render(f"{path} (dark)", info["type"], info["dark"])
            if dkind == "decl":
                dark_lines.append(f"  {css_name(path)}: {dtext};")
                n_dark += 1
            else:
                dark_lines.append(f"  {dtext}")

    if not dark_lines:
        dark_lines = ["  /* TODO: no dark values captured — add "
                      "$extensions.org.superui.dark to the tokens that differ "
                      "and re-run tokens_to_css.py */"]

    out = "\n".join(
        ["/* tokens.css — GENERATED from design-tokens.yaml by",
         "   extract-design-system/scripts/tokens_to_css.py. Do not edit by hand;",
         "   edit the YAML and re-run. */",
         "",
         ":root {",
         *root_lines,
         "}",
         "",
         ".dark {",
         *dark_lines,
         "}",
         ""])
    try:
        with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
            f.write(out)
    except OSError as e:
        fail(f"cannot write {sys.argv[2]!r}: {e}")
    print(f"{n_decl} declarations, {n_dark} dark overrides -> {sys.argv[2]}")


if __name__ == "__main__":
    main()
