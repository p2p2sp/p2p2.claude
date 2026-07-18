#!/usr/bin/env python3
"""Deterministically derive foundation preview data from dtcg.yml (no LLM step).

IN : argv[1] — design-system dir. Needs dtcg.yml (read as UTF-8; run
     validate_tokens.py on it first — this script assumes a well-formed tree
     but still fails hard on any alias it cannot resolve). DESIGN.md is
     OPTIONAL — when present, its matching '## <Foundation>' section (e.g.
     '## Color') supplies a leading prose section; when absent, or when a
     given foundation has no matching section, that foundation's sheet still
     emits with tokens only.
OUT: writes <dir>/foundations/<name>.data.js for each foundation with at
     least one matching dtcg.yml group — name in
     color | typography | spacing-radius | effects (the same group mapping
     design-system-generator's step 8 uses): color (groups: color) ·
     typography (font, dimension, typography) · spacing-radius (spacing,
     radius, size, border, border-width) · effects (shadow, opacity, motion,
     zindex). Each file registers window.SUPERUI_DATA["foundation:<name>"]
     per superui/references/preview-data-format.md: one token-grid section
     per present dtcg.yml group (heading = group name), each item's varName
     a leading-'--'-free dots-to-hyphens token path, value a fully resolved
     human readout (alias chains followed to their concrete value; a token
     carrying $extensions.org.superui.dark gets a " (dark: ...)" suffix),
     usage from $description when present, render kind derived from the
     token's dtcg.yml group. A foundation with none of its mapped groups
     present is not emitted, and any stale foundations/<name>.data.js from a
     previous run is deleted.
     stdout — one summary line naming the emitted foundations.
     Self-verifies: re-reads each written file, confirms the registry key and
     that the embedded payload parses as JSON.
Exit codes: 0 = written (or nothing to emit) and self-verified; 1 = bad args,
     missing dep, unreadable dtcg.yml, an unresolvable/circular alias, or a
     self-verification failure.
Flags: none.

Regenerated wholesale — never hand-edit an emitted foundations/*.data.js;
re-run this script after any dtcg.yml token value edit and reload the sheet
in a browser. No LLM step and no HTML regeneration involved.
"""
import html
import json
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: python -m pip install pyyaml --break-system-packages")

ALIAS_RE = re.compile(r"^\{([^}]+)\}$")
_MISSING = object()  # sentinel: token has no dark extension

# Same group mapping as design-system-generator/SKILL.md step 8.
FOUNDATIONS = {
    "color": ["color"],
    "typography": ["font", "dimension", "typography"],
    "spacing-radius": ["spacing", "radius", "size", "border", "border-width"],
    "effects": ["shadow", "opacity", "motion", "zindex"],
}

TITLES = {
    "color": "Color",
    "typography": "Typography",
    "spacing-radius": "Spacing & Radius",
    "effects": "Effects",
}

SUBTITLES = {
    "color": "Core palette tokens",
    "typography": "Type scale and font tokens",
    "spacing-radius": "Spacing, sizing, and radius tokens",
    "effects": "Shadow, opacity, and motion tokens",
}

# Per-group live-sample kind — one of the render enum in preview-data-format.md
# (color | type | spacing | radius | shadow | opacity | motion | none).
GROUP_RENDER = {
    "color": "color",
    "font": "type",
    "dimension": "type",
    "typography": "type",
    "spacing": "spacing",
    "size": "spacing",
    "border-width": "spacing",
    "radius": "radius",
    "border": "none",  # composite width+style+color — no single live sample
    "shadow": "shadow",
    "opacity": "opacity",
    "motion": "motion",
    "zindex": "none",  # a bare number — no visual sample
}


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def var_name(path):
    return path.replace(".", "-")


def group_heading(group):
    return group.replace("-", " ").title()


# ---------- dtcg.yml walk (mirrors tokens_to_css.py / validate_tokens.py,
# duplicated locally per this repo's standalone-script convention) ----------

def dark_of(node):
    ext = node.get("$extensions")
    if isinstance(ext, dict):
        org = ext.get("org.superui")
        if isinstance(org, dict) and "dark" in org:
            return org["dark"]
    return _MISSING


def walk(node, path, inherited_type, tokens):
    if not isinstance(node, dict):
        return
    node_type = node.get("$type", inherited_type)
    if "$value" in node:
        tokens[".".join(path)] = {
            "type": node_type,
            "value": node["$value"],
            "dark": dark_of(node),
            "description": node.get("$description"),
            "group": path[0],
        }
        return
    for key, child in node.items():
        if key.startswith("$"):
            continue
        walk(child, path + [key], node_type, tokens)


def resolve_deep(path, value, tokens, seen):
    """Follow alias strings ("{a.b.c}") to their concrete value, recursively,
    at any nesting depth inside a composite. Raises via fail() on a dangling
    or circular alias."""
    if isinstance(value, str):
        m = ALIAS_RE.match(value.strip())
        if m:
            target = m.group(1)
            if target in seen:
                fail(f"{path}: circular alias via {target}")
            if target not in tokens:
                fail(f"{path}: alias '{{{target}}}' does not resolve")
            return resolve_deep(path, tokens[target]["value"], tokens, seen | {target})
        return value
    if isinstance(value, dict):
        return {k: resolve_deep(path, v, tokens, seen) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve_deep(path, v, tokens, seen) for v in value]
    return value


# ---------- resolved-value -> human readout ----------

def num(x):
    if isinstance(x, (int, float)) and float(x) == int(x):
        return str(int(x))
    return str(x)


def color_readout(v):
    if not isinstance(v, dict):
        return str(v)
    alpha = v.get("alpha", 1)
    comps = v.get("components")
    space = v.get("colorSpace", "srgb")
    if space == "srgb":
        if alpha == 1 and isinstance(v.get("hex"), str):
            return v["hex"]
        if isinstance(comps, list) and len(comps) == 3:
            r, g, b = (int(round(c * 255)) for c in comps)
            if alpha == 1:
                return f"#{r:02x}{g:02x}{b:02x}"
            return f"rgb({r} {g} {b} / {num(alpha)})"
    if isinstance(comps, list):
        c = " ".join(num(x) for x in comps)
        return f"color({space} {c})" if alpha == 1 else f"color({space} {c} / {num(alpha)})"
    return str(v)


def dim_readout(v):
    if isinstance(v, dict) and "value" in v and "unit" in v:
        return f"{num(v['value'])}{v['unit']}"
    return str(v)


def fontfamily_readout(v):
    fams = v if isinstance(v, list) else [v]
    return ", ".join(str(f) for f in fams)


def bezier_readout(v):
    if isinstance(v, str):
        return v  # keyword like ease-in-out
    if isinstance(v, list) and len(v) == 4:
        return f"cubic-bezier({', '.join(num(x) for x in v)})"
    return str(v)


def shadow_readout(v):
    layers = v if isinstance(v, list) else [v]
    parts = []
    for layer in layers:
        if not isinstance(layer, dict):
            parts.append(str(layer))
            continue
        bits = []
        if layer.get("inset"):
            bits.append("inset")
        for k in ("offsetX", "offsetY", "blur", "spread"):
            bits.append(dim_readout(layer.get(k, {"value": 0, "unit": "px"})))
        bits.append(color_readout(layer.get("color")))
        parts.append(" ".join(bits))
    return ", ".join(parts)


def border_readout(v):
    if not isinstance(v, dict):
        return str(v)
    style = v.get("style", "solid")
    return f"{dim_readout(v.get('width'))} {style} {color_readout(v.get('color'))}"


def transition_readout(v):
    if not isinstance(v, dict):
        return str(v)
    bits = [dim_readout(v.get("duration"))]
    tf = v.get("timingFunction")
    if tf is not None:
        bits.append(bezier_readout(tf))
    delay = v.get("delay")
    if delay is not None:
        bits.append(dim_readout(delay))
    return " ".join(bits)


def typography_readout(v):
    if not isinstance(v, dict):
        return str(v)
    parts = []
    for k, sv in v.items():
        if isinstance(sv, dict) and "value" in sv and "unit" in sv:
            parts.append(f"{k}: {dim_readout(sv)}")
        elif isinstance(sv, dict) and ("colorSpace" in sv or "hex" in sv):
            parts.append(f"{k}: {color_readout(sv)}")
        elif isinstance(sv, list):
            parts.append(f"{k}: {', '.join(str(x) for x in sv)}")
        else:
            parts.append(f"{k}: {sv}")
    return "; ".join(parts)


def value_readout(token_type, v):
    if token_type == "color":
        return color_readout(v)
    if token_type in ("dimension", "duration"):
        return dim_readout(v)
    if token_type in ("number", "fontWeight"):
        return num(v) if isinstance(v, (int, float)) else str(v)
    if token_type == "fontFamily":
        return fontfamily_readout(v)
    if token_type == "cubicBezier":
        return bezier_readout(v)
    if token_type == "shadow":
        return shadow_readout(v)
    if token_type == "border":
        return border_readout(v)
    if token_type == "transition":
        return transition_readout(v)
    if token_type == "typography":
        return typography_readout(v)
    return str(v)


def build_item(path, info, tokens):
    resolved = resolve_deep(path, info["value"], tokens, {path})
    readout = value_readout(info["type"], resolved)
    if info["dark"] is not _MISSING:
        dark_resolved = resolve_deep(f"{path} (dark)", info["dark"], tokens, {path})
        readout = f"{readout} (dark: {value_readout(info['type'], dark_resolved)})"
    item = {
        "name": path,
        "varName": var_name(path),
        "value": readout,
        "render": GROUP_RENDER.get(info["group"], "none"),
    }
    if info["description"]:
        item["usage"] = info["description"]
    return item


# ---------- DESIGN.md -> HTML (same minimal markdown->HTML helpers as
# build_index.py, duplicated locally per this repo's standalone-script
# convention) ----------

def md_inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return s


def md_block(lines):
    """Minimal markdown -> HTML: bullets (with indented continuation lines)
    and paragraphs. Skips comments."""
    out, para, in_ul = [], [], False

    def flush_para():
        nonlocal para
        if para:
            out.append("<p>" + md_inline(" ".join(para)) + "</p>")
            para = []

    for raw in lines:
        line = raw.rstrip()
        if line.lstrip().startswith("<!--") or line.endswith("-->"):
            continue
        if line.startswith("- "):
            flush_para()
            if not in_ul:
                out.append('<ul class="principles-list">')
                in_ul = True
            out.append("<li>" + md_inline(line[2:]) + "</li>")
        elif not line.strip():
            flush_para()
            if in_ul:
                out.append("</ul>")
                in_ul = False
        elif in_ul and line.startswith("  "):
            out[-1] = out[-1][:-len("</li>")] + " " + md_inline(line.strip()) + "</li>"
        else:
            if in_ul:
                out.append("</ul>")
                in_ul = False
            para.append(line.strip())
    flush_para()
    if in_ul:
        out.append("</ul>")
    return "\n".join(out)


def sections_of(md_text):
    """Split DESIGN.md into {heading: [lines]} for '## ' headings."""
    secs, current = {}, None
    for line in md_text.splitlines():
        if line.startswith("## "):
            current = line[3:].strip()
            secs[current] = []
        elif current is not None:
            secs[current].append(line)
    return secs


# ---------- write + self-verify ----------

def write_sheet(out_path, key, sheet):
    payload = json.dumps(sheet, indent=2, ensure_ascii=False)
    content = ("window.SUPERUI_DATA = window.SUPERUI_DATA || {};\n"
               f'window.SUPERUI_DATA["{key}"] = {payload};\n')
    try:
        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)
    except OSError as e:
        fail(f"cannot write {out_path}: {e}")

    with open(out_path, encoding="utf-8") as f:
        written = f.read()
    prefix = f'window.SUPERUI_DATA["{key}"] = '
    if prefix not in written:
        fail(f"self-verify failed for {out_path}: registry key missing")
    literal = written.split(prefix, 1)[1].rstrip()
    if literal.endswith(";"):
        literal = literal[:-1]
    try:
        json.loads(literal)
    except json.JSONDecodeError as e:
        fail(f"self-verify failed for {out_path}: malformed payload ({e})")


def main():
    if len(sys.argv) != 2:
        fail("usage: build_foundation_data.py DESIGN_SYSTEM_DIR")
    root = sys.argv[1]
    dtcg_path = os.path.join(root, "dtcg.yml")
    try:
        with open(dtcg_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except OSError as e:
        fail(f"cannot read {dtcg_path}: {e}")
    if not isinstance(data, dict):
        fail("top level must be a mapping")

    tokens = {}
    walk(data, [], None, tokens)

    design_sections = {}
    design_md = os.path.join(root, "DESIGN.md")
    if os.path.isfile(design_md):
        with open(design_md, encoding="utf-8") as f:
            design_sections = sections_of(f.read())

    out_dir = os.path.join(root, "foundations")
    os.makedirs(out_dir, exist_ok=True)

    emitted = []
    for foundation, groups in FOUNDATIONS.items():
        items_by_group = {}
        for path, info in tokens.items():
            if info["group"] in groups:
                items_by_group.setdefault(info["group"], []).append(
                    build_item(path, info, tokens))

        out_path = os.path.join(out_dir, f"{foundation}.data.js")
        if not items_by_group:
            if os.path.isfile(out_path):
                os.remove(out_path)
            continue

        sections = []
        heading_lines = design_sections.get(TITLES[foundation])
        if heading_lines is not None:
            prose_html = md_block(heading_lines)
            if prose_html:
                sections.append({"type": "prose", "html": prose_html})
        for group in groups:  # stable, mapping order
            if group in items_by_group:
                sections.append({
                    "type": "token-grid",
                    "heading": group_heading(group),
                    "items": items_by_group[group],
                })

        sheet = {
            "title": TITLES[foundation],
            "subtitle": SUBTITLES[foundation],
            "sections": sections,
        }
        write_sheet(out_path, f"foundation:{foundation}", sheet)
        emitted.append(foundation)

    if emitted:
        print(f"{len(emitted)} foundations emitted: {', '.join(emitted)} -> {out_dir}")
    else:
        print(f"0 foundations emitted (no matching dtcg.yml groups) -> {out_dir}")


if __name__ == "__main__":
    main()
