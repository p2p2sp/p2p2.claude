#!/usr/bin/env python3
"""Lint generated documentation sheets for raw (non-token) style values.

IN : argv[1] — the design-system output dir; every *.html under it (recursive)
     is scanned. index.html is included; docs.css is NOT scanned (the fixed
     chrome legitimately carries raw values and var() fallbacks).
OUT: stdout — one "VIOLATION <file>: <snippet>" line per finding, then a
     summary line: "<n> files scanned, <v> violations".
     A violation is any of the following inside a style="..." attribute or a
     <style>...</style> block (HTML/CSS comments stripped first):
       - a hex color literal  (#abc, #aabbcc, #aabbccdd)
       - rgb( / rgba( / hsl( / hsla(
       - a px length other than 0px
     Sheets must express every such value as var(--token) from tokens.css.
Exit codes: 0 = clean (files may be zero — reported in the summary);
     1 = violations found or the dir is unreadable.
Flags: none.
"""
import os
import re
import sys

STYLE_BLOCK = re.compile(r"<style\b[^>]*>(.*?)</style>", re.S | re.I)
STYLE_ATTR = re.compile(r"""style\s*=\s*("([^"]*)"|'([^']*)')""", re.I)
HTML_COMMENT = re.compile(r"<!--.*?-->", re.S)
CSS_COMMENT = re.compile(r"/\*.*?\*/", re.S)

HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
FUNC = re.compile(r"\b(?:rgba?|hsla?)\s*\(")
PX = re.compile(r"(?<![\w.-])(\d*\.?\d+)px\b")


def violations_in(css_text):
    found = []
    text = CSS_COMMENT.sub("", css_text)
    for m in HEX.finditer(text):
        found.append(m.group(0))
    for m in FUNC.finditer(text):
        found.append(m.group(0) + "...)")
    for m in PX.finditer(text):
        if float(m.group(1)) != 0:
            found.append(m.group(0))
    return found


def snippet(s, needle):
    i = s.find(needle.split("...")[0])
    if i < 0:
        return needle
    return s[max(0, i - 30):i + len(needle) + 30].replace("\n", " ").strip()


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: lint_previews.py DESIGN_SYSTEM_DIR")
    root = sys.argv[1]
    if not os.path.isdir(root):
        sys.exit(f"error: not a directory: {root}")

    files = []
    for dirpath, _dirs, names in os.walk(root):
        for n in names:
            if n.endswith(".html"):
                files.append(os.path.join(dirpath, n))

    total = 0
    for path in sorted(files):
        try:
            with open(path, encoding="utf-8") as f:
                raw = f.read()
        except OSError as e:
            print(f"VIOLATION {path}: unreadable ({e})")
            total += 1
            continue
        doc = HTML_COMMENT.sub("", raw)
        chunks = [m.group(1) for m in STYLE_BLOCK.finditer(doc)]
        chunks += [m.group(2) or m.group(3) or "" for m in STYLE_ATTR.finditer(doc)]
        rel = os.path.relpath(path, root)
        for chunk in chunks:
            for v in violations_in(chunk):
                print(f"VIOLATION {rel}: {snippet(chunk, v)}")
                total += 1

    print(f"\n{len(files)} files scanned, {total} violations")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
