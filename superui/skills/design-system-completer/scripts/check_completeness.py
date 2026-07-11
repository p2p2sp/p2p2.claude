#!/usr/bin/env python3
"""Extract completeness facts from an extracted design system — data only,
no judgment about what SHOULD exist.

IN : argv[1] — the design-system output dir (reads <dir>/dtcg.yml, and every
     *.md under <dir>/components/ and <dir>/patterns/, plus <dir>/completions.md
     if present).
     argv[2] — output path for the facts file (written as UTF-8).
OUT: writes argv[2] — four '## ' sections, each holding single '- ' fact
     lines:
       ## Tier facts          per top-level group: token count, raw vs alias
                              split; then which of primitive/semantic/component
                              tiers are present vs absent across all groups
                              (component = a top-level group named `component`
                              or `components` — the conventional DTCG
                              component-local-token namespace)
       ## Dark facts          total color tokens, how many carry
                              $extensions.org.superui.dark; when that count is
                              > 0, the color tokens still lacking it; when 0,
                              a single "no dark theme detected" line
       ## Spec state facts    per components/*.md and patterns/*.md: whether
                              '## States' exists, and if so the row names
                              parsed from the first cell of its '|' table rows
       ## Provenance facts    tokens flagged $extensions.org.superui.synthesized,
                              specs carrying a '**Provenance:**' line or a
                              '> SYNTHESIZED:' marker, and whether
                              completions.md exists (its '- ' entries verbatim)
     stdout — nothing on success. Self-verifies: re-reads the written file and
     asserts all four headings are present.
Exit codes: 0 = written and verified (gaps are DATA, not errors — an empty
     system still exits 0 with sections stating "none found" /
     "no dark theme detected"); 1 = bad args, missing dep, missing/unreadable
     dtcg.yml, malformed YAML, or self-verification failure. No output file is
     left behind on any failure before the write step.
Flags: none.
"""
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: python -m pip install pyyaml --break-system-packages")

ALIAS_RE = re.compile(r"^\{([^}]+)\}$")
SEP_ROW_RE = re.compile(r"^\s*\|[\s:|-]+\|\s*$")

SECTIONS = ["## Tier facts", "## Dark facts", "## Spec state facts", "## Provenance facts"]


def _org_superui(node):
    """Return $extensions.org.superui dict, or None when absent."""
    ext = node.get("$extensions")
    if isinstance(ext, dict):
        org = ext.get("org.superui")
        if isinstance(org, dict):
            return org
    return None


def has_dark(node):
    org = _org_superui(node)
    return org is not None and "dark" in org


def has_synthesized(node):
    org = _org_superui(node)
    return org is not None and org.get("synthesized") is True


def load_tokens(data):
    """Walk a parsed dtcg.yml mapping into {dotted path: {"node": ..., "type": ...}},
    resolving $type inheritance from enclosing groups (own $type, else the
    nearest ancestor's)."""
    tokens = {}

    def walk(node, path, inherited_type):
        if not isinstance(node, dict):
            return
        node_type = node.get("$type", inherited_type)
        if "$value" in node:
            tokens[".".join(path)] = {"node": node, "type": node_type}
            return
        for key, child in node.items():
            if isinstance(key, str) and key.startswith("$"):
                continue
            walk(child, path + [str(key)], node_type)

    walk(data, [], None)
    return tokens


def tier_facts(tokens):
    groups = {}
    for path, info in tokens.items():
        top = path.split(".", 1)[0]
        g = groups.setdefault(top, {"total": 0, "raw": 0, "alias": 0})
        g["total"] += 1
        value = info["node"].get("$value")
        if isinstance(value, str) and ALIAS_RE.match(value.strip()):
            g["alias"] += 1
        else:
            g["raw"] += 1

    if not groups:
        return ["- none found"]

    lines = []
    for name in sorted(groups):
        g = groups[name]
        lines.append(f"- group `{name}`: {g['total']} tokens ({g['raw']} raw, {g['alias']} alias)")

    primitive = any(g["raw"] > 0 for g in groups.values())
    semantic = any(g["alias"] > 0 for g in groups.values())
    component = any(name in ("component", "components") for name in groups)
    tiers = [("primitive", primitive), ("semantic", semantic), ("component", component)]
    present = [name for name, ok in tiers if ok]
    absent = [name for name, ok in tiers if not ok]
    if present:
        lines.append(f"- tiers present: {', '.join(present)}")
    if absent:
        lines.append(f"- tiers absent: {', '.join(absent)}")
    return lines


def dark_facts(tokens):
    color_paths = sorted(p for p, info in tokens.items() if info["type"] == "color")
    if not color_paths:
        return ["- total color tokens: 0", "- no dark theme detected"]

    dark_paths = {p for p in color_paths if has_dark(tokens[p]["node"])}
    lines = [
        f"- total color tokens: {len(color_paths)}",
        f"- color tokens with dark: {len(dark_paths)}",
    ]
    if dark_paths:
        missing = [p for p in color_paths if p not in dark_paths]
        if missing:
            for p in missing:
                lines.append(f"- missing dark: `{p}`")
        else:
            lines.append("- no color tokens missing dark")
    else:
        lines.append("- no dark theme detected")
    return lines


def _states_table_rows(text):
    """Return the '## States' table's data-row cells (header row excluded),
    or None when no '## States' heading exists, or [] when the heading exists
    but no table rows follow it."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.strip() == "## States":
            table_lines = []
            for later in lines[i + 1:]:
                if later.startswith("## "):
                    break
                stripped = later.strip()
                if stripped.startswith("|"):
                    table_lines.append(later)
            rows = [r for r in table_lines if not SEP_ROW_RE.match(r)]
            return rows[1:] if len(rows) > 1 else []
    return None


def spec_state_facts(root):
    lines = []
    found_any = False
    for sub in ("components", "patterns"):
        d = os.path.join(root, sub)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not name.endswith(".md"):
                continue
            found_any = True
            rel = f"{sub}/{name}"
            with open(os.path.join(d, name), encoding="utf-8") as f:
                text = f.read()
            rows = _states_table_rows(text)
            if rows is None:
                lines.append(f"- {rel}: no ## States section")
                continue
            if not rows:
                lines.append(f"- {rel}: ## States present, no state rows found")
                continue
            states = []
            for row in rows:
                cells = row.strip().strip("|").split("|")
                states.append(cells[0].strip() if cells else "")
            lines.append(f"- {rel}: states = {', '.join(states)}")
    if not found_any:
        lines.append("- none found")
    return lines


def provenance_facts(root, tokens):
    lines = []
    synthesized = sorted(p for p, info in tokens.items() if has_synthesized(info["node"]))
    lines.append(f"- synthesized tokens: {len(synthesized)}")
    for p in synthesized:
        lines.append(f"- synthesized token: `{p}`")

    marked_specs = []
    for sub in ("components", "patterns"):
        d = os.path.join(root, sub)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not name.endswith(".md"):
                continue
            with open(os.path.join(d, name), encoding="utf-8") as f:
                text = f.read()
            if "**Provenance:**" in text or "> SYNTHESIZED:" in text:
                marked_specs.append(f"{sub}/{name}")
    if marked_specs:
        for s in marked_specs:
            lines.append(f"- provenance-marked spec: {s}")
    else:
        lines.append("- no provenance-marked specs found")

    completions = os.path.join(root, "completions.md")
    if os.path.isfile(completions):
        lines.append("- completions.md: present")
        with open(completions, encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("- "):
                    lines.append(line.strip())
    else:
        lines.append("- completions.md: absent")
    return lines


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: check_completeness.py DESIGN_SYSTEM_DIR OUT.md")
    root, out_path = sys.argv[1], sys.argv[2]

    dtcg_path = os.path.join(root, "dtcg.yml")
    try:
        with open(dtcg_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except OSError as e:
        sys.exit(f"error: cannot read {dtcg_path}: {e}")
    except yaml.YAMLError as e:
        sys.exit(f"error: cannot parse {dtcg_path}: {e}")
    if not isinstance(data, dict):
        sys.exit(f"error: {dtcg_path} top level must be a mapping")

    tokens = load_tokens(data)

    lines = []
    lines.append("## Tier facts")
    lines.extend(tier_facts(tokens))
    lines.append("")
    lines.append("## Dark facts")
    lines.extend(dark_facts(tokens))
    lines.append("")
    lines.append("## Spec state facts")
    lines.extend(spec_state_facts(root))
    lines.append("")
    lines.append("## Provenance facts")
    lines.extend(provenance_facts(root, tokens))
    lines.append("")

    try:
        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lines))
    except OSError as e:
        sys.exit(f"error: cannot write {out_path}: {e}")

    try:
        with open(out_path, encoding="utf-8") as f:
            written = f.read()
    except OSError as e:
        sys.exit(f"error: cannot re-read {out_path}: {e}")
    for heading in SECTIONS:
        if f"\n{heading}\n" not in f"\n{written}\n":
            sys.exit(f"error: self-verification failed — missing heading '{heading}'")


if __name__ == "__main__":
    main()
