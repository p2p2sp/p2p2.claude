#!/usr/bin/env python3
"""Scan implementation files for hardcoded style values that design tokens should cover.

IN : argv[1] — path to a file with newline-separated file paths to scan (the
     caller resolves the user's globs into this list; blank lines ignored).
     argv[2] — path to the design system's dtcg.yml. Used ONLY to derive which
     value FAMILIES the token set covers; families with zero tokens are not
     scanned (nothing to drift against — a wholly missing family is a
     system-level completeness matter, not a per-line hit) and are listed on
     stderr as skipped.
OUT: stdout — one line per hit: "<file>:<line>\t<family>\t<raw-value>", where
     family is one of color | dimension | font | radius | shadow | duration.
     stderr — informational only: skipped families and skipped files
     (binary / minified / unreadable / vendored).
Exit codes: 0 = scan completed (with or without hits), 1 = bad args or an
     unreadable input list / dtcg.yml.
Flags: none.

Detection is intentionally DUMB and technology-neutral: line regexes for
hex/rgb()/hsl()/oklch(), <number>px|rem|em in style-ish contexts, and the
obvious style properties (font-size, font-family, border-radius, box-shadow,
transition/animation durations) in any syntax, string literals included.
FALSE POSITIVES ARE EXPECTED AND ACCEPTABLE — the consuming audit agent
(token-drift-auditor) filters them in file context; do not tighten these
patterns at the cost of recall.
Skipped without scanning: binary files (NUL byte in the first 4 KB), minified
files (any line longer than 2000 chars), and any path containing a
node_modules / dist / build / .git / .superui segment.
"""
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: python -m pip install pyyaml --break-system-packages")

SKIP_SEGMENTS = {"node_modules", "dist", "build", ".git", ".superui"}
MAX_LINE = 2000
FAMILIES = ("color", "dimension", "font", "radius", "shadow", "duration")

COLOR_RE = re.compile(
    r"#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\boklch\([^)]*\)"
)
NUM_UNIT_RE = re.compile(r"\b\d+(?:\.\d+)?(?:px|rem|em)\b")
DURATION_VAL_RE = re.compile(r"\b\d+(?:\.\d+)?m?s\b")
FONT_FAMILY_RE = re.compile(r"font-family\s*[:=]\s*([^;\"'\n{}]{1,80})", re.I)

CTX_RADIUS = re.compile(r"border-radius|corner-radius|\bradius\b|rounded", re.I)
CTX_SHADOW = re.compile(r"box-shadow|drop-shadow|\bshadow\b|elevation", re.I)
CTX_FONTSIZE = re.compile(r"font-size|\bfont\s*[:=]", re.I)
CTX_DURATION = re.compile(r"transition|animation|duration|delay", re.I)
CTX_STYLEISH = re.compile(
    r"padding|margin|\bgap\b|width|height|\btop\b|\bright\b|\bbottom\b|\bleft\b"
    r"|inset|spacing|\bsize\b|border|outline|line-height|letter-spacing|indent"
    r"|blur|offset|translate",
    re.I,
)


def covered_families(dtcg_path):
    """Families with at least one token in dtcg.yml. Raises on unreadable input."""
    with open(dtcg_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        raise ValueError("dtcg.yml top level must be a mapping")
    fams = set()

    def walk(node, path, inherited):
        if not isinstance(node, dict):
            return
        node_type = node.get("$type", inherited)
        if "$value" in node:
            joined = ".".join(path).lower()
            if node_type == "color":
                fams.add("color")
            elif node_type == "shadow":
                fams.add("shadow")
            elif node_type == "duration":
                fams.add("duration")
            elif node_type in ("fontFamily", "fontWeight", "typography"):
                fams.add("font")
            elif node_type == "dimension":
                fams.add("dimension")
                if "radius" in joined:
                    fams.add("radius")
                if "font" in joined:
                    fams.add("font")
            return
        for key, child in node.items():
            if isinstance(key, str) and key.startswith("$"):
                continue
            walk(child, path + [str(key)], node_type)

    walk(data, [], None)
    return fams


def classify_num_unit(line):
    """Family for a <number><px|rem|em> hit, or None when the line is not style-ish."""
    if CTX_RADIUS.search(line):
        return "radius"
    if CTX_SHADOW.search(line):
        return "shadow"
    if CTX_FONTSIZE.search(line):
        return "font"
    if CTX_STYLEISH.search(line):
        return "dimension"
    return None


def scan_file(path, covered, out, seen):
    parts = re.split(r"[\\/]+", path)
    if SKIP_SEGMENTS.intersection(parts):
        print(f"# skipped (vendored): {path}", file=sys.stderr)
        return
    try:
        with open(path, "rb") as f:
            if b"\0" in f.read(4096):
                print(f"# skipped (binary): {path}", file=sys.stderr)
                return
        with open(path, encoding="utf-8", errors="replace") as f:
            lines = f.read().splitlines()
    except OSError as e:
        print(f"# skipped (unreadable): {path}: {e}", file=sys.stderr)
        return
    if any(len(line) > MAX_LINE for line in lines):
        print(f"# skipped (minified): {path}", file=sys.stderr)
        return

    def emit(lineno, family, value):
        if family not in covered:
            return
        key = (path, lineno, family, value)
        if key in seen:
            return
        seen.add(key)
        out.append(f"{path}:{lineno}\t{family}\t{value}")

    for lineno, line in enumerate(lines, 1):
        for m in COLOR_RE.finditer(line):
            emit(lineno, "color", m.group(0))
        for m in NUM_UNIT_RE.finditer(line):
            family = classify_num_unit(line)
            if family:
                emit(lineno, family, m.group(0))
        if CTX_DURATION.search(line):
            for m in DURATION_VAL_RE.finditer(line):
                emit(lineno, "duration", m.group(0))
        for m in FONT_FAMILY_RE.finditer(line):
            value = m.group(1).strip().rstrip(",")
            if value and "var(" not in value and not value.startswith("{"):
                emit(lineno, "font", value)


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: scan_hardcoded_values.py FILE_LIST DTCG_YML")
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            paths = [line.strip() for line in f if line.strip()]
    except OSError as e:
        sys.exit(f"error: cannot read file list {sys.argv[1]}: {e}")
    try:
        covered = covered_families(sys.argv[2])
    except (OSError, ValueError, yaml.YAMLError) as e:
        sys.exit(f"error: cannot read dtcg.yml {sys.argv[2]}: {e}")

    for family in FAMILIES:
        if family not in covered:
            print(f"# family not covered by tokens, not scanned: {family}", file=sys.stderr)

    out, seen = [], set()
    for path in paths:
        scan_file(path, covered, out, seen)
    for line in out:
        print(line)


if __name__ == "__main__":
    main()
