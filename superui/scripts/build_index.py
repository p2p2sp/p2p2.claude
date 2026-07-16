#!/usr/bin/env python3
"""Build index.html for an extracted design-system directory.

IN : argv[1] — the design-system output dir. Expected inside it:
     DESIGN.md (narrative source), docs.css, tokens.css, dtcg.yml,
     tokens.json, inventory.md, optionally foundations/*.html,
     components/*.html, patterns/*.html.
OUT: writes <dir>/index.html — the overview page (chrome classes from
     docs.css): intro pulled from DESIGN.md's first paragraph, the fixed
     three-layer explanation, Principles / Token naming / Status sections
     pulled from the matching DESIGN.md sections (minimal markdown -> HTML:
     paragraphs, "- " bullets, **bold**, `code`), and link lists to every
     sheet found on disk (components get an atomic/composite badge from
     inventory.md when available).
     stdout — one summary line: "<f> foundation, <c> component, <p> pattern
     sheets -> <path>".
     Self-verifies: every href it emits points at an existing file; a missing
     target exits 1 with a message on stderr.
Exit codes: 0 = written and verified; 1 = bad args, missing DESIGN.md/docs.css/
     tokens.css, or a dangling link.
Flags: none.

Regenerated wholesale on every run — never hand-edit index.html.
"""
import html
import os
import re
import sys


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
            # continuation of the previous bullet
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


def sheet_title(path):
    try:
        with open(path, encoding="utf-8") as f:
            head = f.read(4000)
        m = re.search(r"<h1>(.*?)</h1>", head, re.S)
        if m:
            return re.sub(r"<[^>]+>", "", m.group(1)).strip()
        m = re.search(r"<title>(.*?)</title>", head, re.S)
        if m:
            return m.group(1).strip()
    except OSError:
        pass
    return os.path.splitext(os.path.basename(path))[0]


def inventory_kinds(root):
    """slug -> 'atomic'|'composite' from inventory.md, best effort."""
    kinds = {}
    inv = os.path.join(root, "inventory.md")
    if not os.path.isfile(inv):
        return kinds
    with open(inv, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"\s*-\s*([a-z0-9-]+)\s*—.*?·\s*(atomic|composite)", line)
            if m:
                kinds[m.group(1)] = m.group(2)
    return kinds


def link_list(root, subdir, kinds=None):
    d = os.path.join(root, subdir)
    if not os.path.isdir(d):
        return [], ""
    files = sorted(f for f in os.listdir(d) if f.endswith(".html"))
    items = []
    for f in files:
        slug = os.path.splitext(f)[0]
        title = html.escape(sheet_title(os.path.join(d, f)), quote=False)
        badge = ""
        if kinds is not None and slug in kinds:
            badge = f'<span class="kind-badge">{kinds[slug]}</span>'
        items.append(f'<li><a href="{subdir}/{f}">{title}</a>{badge}</li>')
    return [os.path.join(subdir, f) for f in files], "\n".join(items)


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: build_index.py DESIGN_SYSTEM_DIR")
    root = sys.argv[1]
    design_md = os.path.join(root, "DESIGN.md")
    for req in (design_md, os.path.join(root, "docs.css"),
                os.path.join(root, "tokens.css")):
        if not os.path.isfile(req):
            sys.exit(f"error: missing required file {req}")

    with open(design_md, encoding="utf-8") as f:
        md = f.read()
    secs = sections_of(md)

    intro_lines = []
    for line in md.splitlines():
        if line.startswith("## "):
            break
        if line.startswith("# ") or line.startswith("<!--") or line.endswith("-->"):
            continue
        intro_lines.append(line)
    intro = md_block(intro_lines) or "<p>An extracted, token-bound design system.</p>"

    kinds = inventory_kinds(root)
    targets, parts = [], []

    parts.append('<div class="section index-hero">')
    parts.append(intro)
    parts.append("</div>")

    parts.append('<div class="section"><h2>How it\'s organized</h2>')
    parts.append('<p class="section-sub">Three layers, from raw material to finished screens.</p>')
    parts.append('<div class="card-grid">')
    parts.append('<div class="card"><h4>Foundations</h4><p>Color, type, spacing &amp; radius, '
                 'effects. The raw material — all bound to tokens.</p></div>')
    parts.append('<div class="card"><h4>Components</h4><p>Reusable building blocks assembled '
                 'only from foundation tokens.</p></div>')
    parts.append('<div class="card"><h4>Patterns</h4><p>How components come together into '
                 'real screens.</p></div>')
    parts.append("</div></div>")

    for heading in ("Principles", "Token naming"):
        if heading in secs:
            parts.append(f'<div class="section"><h2>{heading}</h2>')
            parts.append(md_block(secs[heading]))
            parts.append("</div>")

    for subdir, label in (("foundations", "Foundations"),
                          ("components", "Components"),
                          ("patterns", "Patterns")):
        found, items = link_list(root, subdir, kinds if subdir == "components" else None)
        targets += found
        if items:
            parts.append(f'<div class="section"><h2>{label}</h2>'
                         f'<ul class="toc-list">{items}</ul></div>')

    if "Status" in secs:
        parts.append('<div class="section"><h2>Status</h2>')
        parts.append(md_block(secs["Status"]))
        parts.append("</div>")

    parts.append('<div class="section"><h2>Files</h2><ul class="toc-list">'
                 '<li><a href="DESIGN.md">DESIGN.md</a></li>'
                 '<li><a href="dtcg.yml">dtcg.yml</a></li>'
                 '<li><a href="tokens.json">tokens.json</a></li>'
                 '<li><a href="tokens.css">tokens.css</a></li>'
                 '<li><a href="inventory.md">inventory.md</a></li></ul></div>')
    targets += ["DESIGN.md", "dtcg.yml", "tokens.json", "tokens.css", "inventory.md"]

    body = "\n".join(parts)
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design System</title>
<link rel="stylesheet" href="docs.css">
<link rel="stylesheet" href="tokens.css">
</head>
<body>
<header class="sheet-header">
  <h1>Design System</h1>
</header>
{body}
</body>
</html>
"""
    out = os.path.join(root, "index.html")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(page)

    # self-verify: every emitted link resolves
    missing = [t for t in targets if not os.path.isfile(os.path.join(root, t))]
    if missing:
        for t in missing:
            print(f"error: dangling link target {t}", file=sys.stderr)
        sys.exit(1)

    nf = sum(1 for t in targets if t.startswith("foundations"))
    nc = sum(1 for t in targets if t.startswith("components"))
    np_ = sum(1 for t in targets if t.startswith("patterns"))
    print(f"{nf} foundation, {nc} component, {np_} pattern sheets -> {out}")


if __name__ == "__main__":
    main()
