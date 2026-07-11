#!/usr/bin/env python3
"""WCAG 2.2 contrast checker. No dependencies.

Usage:
  python check_contrast.py FG BG [TYPE] [FG BG [TYPE] ...]
  python check_contrast.py --json pairs.json

TYPE per pair (optional, default "normal"):
  normal - body/regular text        AA 4.5:1, AAA 7:1
  large  - >=24px or >=18.5px bold  AA 3:1,   AAA 4.5:1
  ui     - borders, icons, focus,   AA 3:1    (SC 1.4.11; no AAA tier)
           state indicators

JSON items: [{"fg": "#111", "bg": "#fff", "type": "ui", "label": "input border"}, ...]
Colors: #rgb, #rrggbb, rgb(r,g,b).
Exit 1 if any pair fails the AA threshold FOR ITS OWN TYPE (a 3.2:1 border passes; 3.2:1 body text fails).
"""
import json
import re
import sys

# type -> (AA threshold, AAA threshold or None)
THRESHOLDS = {"normal": (4.5, 7.0), "large": (3.0, 4.5), "ui": (3.0, None)}


def parse_color(s: str) -> tuple:
    s = s.strip().lower()
    m = re.fullmatch(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", s)
    if m:
        return tuple(int(v) for v in m.groups())
    s = s.lstrip("#")
    if re.fullmatch(r"[0-9a-f]{3}", s):
        return tuple(int(c * 2, 16) for c in s)
    if re.fullmatch(r"[0-9a-f]{6}", s):
        return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))
    raise ValueError(f"Unrecognized color: {s!r} (use #rgb, #rrggbb or rgb(r,g,b))")


def rel_luminance(rgb: tuple) -> float:
    def channel(c: int) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(fg: tuple, bg: tuple) -> float:
    l1, l2 = sorted((rel_luminance(fg), rel_luminance(bg)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def parse_cli_pairs(argv: list) -> list:
    pairs = []
    i = 0
    while i < len(argv):
        if i + 1 >= len(argv):
            raise ValueError(f"Dangling color {argv[i]!r} without a background.")
        fg, bg = argv[i], argv[i + 1]
        i += 2
        ptype = "normal"
        if i < len(argv) and argv[i].lower() in THRESHOLDS:
            ptype = argv[i].lower()
            i += 1
        pairs.append((fg, bg, ptype, ""))
    return pairs


def main(argv: list) -> int:
    if not argv:
        print(__doc__)
        return 2
    pairs = []
    if argv[0] == "--json":
        if len(argv) != 2:
            print(__doc__)
            return 2
        with open(argv[1], encoding="utf-8") as fh:
            for item in json.load(fh):
                ptype = str(item.get("type", "normal")).lower()
                if ptype not in THRESHOLDS:
                    raise ValueError(f"Unknown type {ptype!r} (use normal|large|ui)")
                pairs.append((item["fg"], item["bg"], ptype, item.get("label", "")))
    else:
        try:
            pairs = parse_cli_pairs(argv)
        except ValueError as e:
            print(e)
            print(__doc__)
            return 2

    any_fail = False
    for fg_s, bg_s, ptype, label in pairs:
        ratio = contrast_ratio(parse_color(fg_s), parse_color(bg_s))
        aa, aaa = THRESHOLDS[ptype]
        aa_ok = ratio >= aa
        if not aa_ok:
            any_fail = True
        tag = f" [{label}]" if label else ""
        aaa_part = f"  AAA(need {aaa}): {'PASS' if ratio >= aaa else 'FAIL'}" if aaa else ""
        print(
            f"{fg_s} on {bg_s}{tag} ({ptype}): {ratio:.2f}:1  "
            f"AA(need {aa}): {'PASS' if aa_ok else 'FAIL'}{aaa_part}"
        )
    return 1 if any_fail else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
