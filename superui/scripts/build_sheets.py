#!/usr/bin/env python3
"""Script every preview shell from its *.data.js sibling (no LLM step).

IN : argv[1] — design-system dir. Scans foundations/*.data.js,
     components/*.data.js, patterns/*.data.js (any subset may be absent or
     empty). Needs docs.css, tokens.css and components.js at the dir root
     (copied there by an earlier pipeline step) — every shell links them.
OUT: writes <dir>/<kind-dir>/<slug>.html for each <kind-dir>/<slug>.data.js
     found — a thin shell only: <head> with a <title> taken from the data
     file's own "title" field (regex-extracted; falls back to the slug when
     absent/unparsable) plus <link>s to ../docs.css and ../tokens.css; a
     <body[ data-dark-toggle]> carrying a blocking
     <script src="../components.js"></script> at the top, one
     <ds-sheet key="<kind>:<slug>"></ds-sheet>, and
     <script src="<slug>.data.js"></script>. A pattern shell additionally
     carries one <script src="../components/<f>"> per file present in
     components/*.data.js, so any <ds-demo> the pattern's data references
     always resolves. data-dark-toggle appears on every <body> iff
     tokens.css's .dark block declares at least one custom property (same
     rule as build_index.py's has_dark_overrides, duplicated locally per
     this repo's standalone-script convention).
     Wholesale regeneration: every run rewrites every shell and deletes any
     <kind-dir>/*.html whose matching *.data.js no longer exists.
     index.html is never touched (owned by build_index.py).
     stdout — one summary line "<n> shells -> <dir>".
     Self-verifies: every href/src a shell emits (../docs.css, ../tokens.css,
     ../components.js, its own data file, and — for patterns — every
     ../components/<f> reference) is checked to resolve to an existing file.
Exit codes: 0 = written and verified (incl. the zero-data-files case);
     1 = bad args, missing design-system dir, or a shell referencing a
     missing file.
Flags: none.

Regenerated wholesale — never hand-edit an emitted *.html shell; re-run this
script after any *.data.js change (or after build_foundation_data.py /
html-visualizer produce new ones) and reload in a browser. No HTML authoring
happens anywhere else.
"""
import json
import os
import re
import sys

KIND_OF = {
    "foundations": "foundation",
    "components": "component",
    "patterns": "pattern",
}

TITLE_RE = re.compile(r'"title"\s*:\s*"((?:[^"\\]|\\.)*)"')


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def has_dark_overrides(root):
    """True when tokens.css's .dark block declares at least one custom
    property. Same rule as build_index.py's has_dark_overrides, duplicated
    locally per this repo's standalone-script convention."""
    try:
        with open(os.path.join(root, "tokens.css"), encoding="utf-8") as f:
            css = f.read()
    except OSError:
        return False
    m = re.search(r"\.dark\s*\{(.*?)\}", css, re.S)
    return bool(m) and "--" in re.sub(r"/\*.*?\*/", "", m.group(1), flags=re.S)


def extract_title(data_path, slug):
    try:
        with open(data_path, encoding="utf-8") as f:
            text = f.read()
    except OSError:
        return slug
    m = TITLE_RE.search(text)
    if not m:
        return slug
    try:
        return json.loads('"' + m.group(1) + '"')
    except json.JSONDecodeError:
        return m.group(1)


def render_shell(title, key, slug, dark_attr, extra_scripts):
    body_attr = " data-dark-toggle" if dark_attr else ""
    extras = "".join(f'\n<script src="{s}"></script>' for s in extra_scripts)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="../docs.css">
<link rel="stylesheet" href="../tokens.css">
</head>
<body{body_attr}>
<script src="../components.js"></script>
<ds-sheet key="{key}"></ds-sheet>
<script src="{slug}.data.js"></script>{extras}
</body>
</html>
"""


def main():
    if len(sys.argv) != 2:
        fail("usage: build_sheets.py DESIGN_SYSTEM_DIR")
    root = sys.argv[1]
    if not os.path.isdir(root):
        fail(f"no such directory: {root}")

    dark_attr = has_dark_overrides(root)

    components_dir = os.path.join(root, "components")
    component_data_files = (
        sorted(f for f in os.listdir(components_dir) if f.endswith(".data.js"))
        if os.path.isdir(components_dir) else []
    )

    total = 0
    refs = []  # (shell_dir, referenced-relative-path) to self-verify at the end

    for subdir, kind in KIND_OF.items():
        d = os.path.join(root, subdir)
        if not os.path.isdir(d):
            continue

        data_files = sorted(f for f in os.listdir(d) if f.endswith(".data.js"))
        expected_htmls = set()

        for f in data_files:
            slug = f[: -len(".data.js")]
            expected_htmls.add(slug + ".html")
            data_path = os.path.join(d, f)
            title = extract_title(data_path, slug)
            key = f"{kind}:{slug}"

            extra_scripts = []
            if kind == "pattern":
                extra_scripts = [f"../components/{cf}" for cf in component_data_files]

            page = render_shell(title, key, slug, dark_attr, extra_scripts)
            out_path = os.path.join(d, slug + ".html")
            try:
                with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
                    fh.write(page)
            except OSError as e:
                fail(f"cannot write {out_path}: {e}")

            refs.append((d, "../docs.css"))
            refs.append((d, "../tokens.css"))
            refs.append((d, "../components.js"))
            refs.append((d, f))
            for s in extra_scripts:
                refs.append((d, s))
            total += 1

        # wholesale regeneration: drop stale shells with no matching data file
        for existing in os.listdir(d):
            if existing.endswith(".html") and existing not in expected_htmls:
                os.remove(os.path.join(d, existing))

    missing = [
        os.path.normpath(os.path.join(d, ref))
        for d, ref in refs
        if not os.path.isfile(os.path.normpath(os.path.join(d, ref)))
    ]
    if missing:
        for m in missing:
            print(f"error: dangling shell reference {m}", file=sys.stderr)
        sys.exit(1)

    print(f"{total} shells -> {root}")


if __name__ == "__main__":
    main()
