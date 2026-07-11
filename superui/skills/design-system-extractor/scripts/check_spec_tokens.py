#!/usr/bin/env python3
"""Check that every token referenced in the specs resolves in dtcg.yml.

IN : argv[1] — the design-system output dir. Reads <dir>/dtcg.yml and every
     *.md under <dir>/components/ and <dir>/patterns/.
OUT: stdout — one "DANGLING <file>: {token.path}" line per unresolved
     reference, then a summary line: "<s> specs, <r> references, <d> dangling".
     A token reference is a backticked dotted path (`color.accent.default`):
     all-lowercase/digit/hyphen segments joined by dots. Backticked strings
     whose last segment is a file extension (yml, yaml, css, md, py, html, js,
     json, sh, png) or that contain a slash are ignored (they are filenames,
     not tokens). A reference resolves if it names a token OR a group in
     dtcg.yml (group refs like `color.accent.*` are checked group-only after
     stripping the trailing `.*`).
Exit codes: 0 = all references resolve (or no specs exist — reported in the
     summary); 1 = dangling references, or missing/unreadable dtcg.yml.
Flags: none.
"""
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: python -m pip install pyyaml --break-system-packages")

REF = re.compile(r"`([a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+(?:\.\*)?)`")
FILE_EXT = {"yml", "yaml", "css", "md", "py", "html", "js", "json", "sh", "png"}


def collect_paths(node, path, tokens, groups):
    if not isinstance(node, dict):
        return
    if "$value" in node:
        tokens.add(".".join(path))
        return
    if path:
        groups.add(".".join(path))
    for key, child in node.items():
        if isinstance(key, str) and key.startswith("$"):
            continue
        collect_paths(child, path + [str(key)], tokens, groups)


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: check_spec_tokens.py DESIGN_SYSTEM_DIR")
    root = sys.argv[1]
    dtcg = os.path.join(root, "dtcg.yml")
    try:
        with open(dtcg, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except OSError as e:
        sys.exit(f"error: cannot read {dtcg}: {e}")
    if not isinstance(data, dict):
        sys.exit("error: dtcg.yml top level must be a mapping")

    tokens, groups = set(), set()
    collect_paths(data, [], tokens, groups)

    specs, refs, dangling = 0, 0, 0
    for sub in ("components", "patterns"):
        d = os.path.join(root, sub)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not name.endswith(".md"):
                continue
            specs += 1
            path = os.path.join(d, name)
            with open(path, encoding="utf-8") as f:
                text = f.read()
            rel = os.path.relpath(path, root)
            for m in REF.finditer(text):
                cand = m.group(1)
                if "/" in cand or cand.rsplit(".", 1)[-1] in FILE_EXT:
                    continue
                refs += 1
                if cand.endswith(".*"):
                    ok = cand[:-2] in groups
                else:
                    ok = cand in tokens or cand in groups
                if not ok:
                    print(f"DANGLING {rel}: {{{cand}}}")
                    dangling += 1

    print(f"\n{specs} specs, {refs} references, {dangling} dangling")
    sys.exit(1 if dangling else 0)


if __name__ == "__main__":
    main()
