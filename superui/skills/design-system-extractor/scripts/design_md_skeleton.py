#!/usr/bin/env python3
"""Generate the DESIGN.md skeleton from a validated dtcg.yml.

IN : argv[1] — path to dtcg.yml (read as UTF-8; run validate_tokens.py first).
     argv[2] — output path for DESIGN.md (written as UTF-8; parent must exist).
OUT: writes argv[2] — a skeleton whose HEADINGS ARE A CONTRACT (the doc writer
     fills placeholders but never renames/renumbers/removes headings):
       # Design System
       ## How it's organized      (fixed three-layer text)
       ## Principles              (FILL)
       ## Token naming            (auto: tiers + per-group counts and samples)
       ## Foundations             (auto: per-group token listing + FILL)
       ## Theming                 (auto: dark-carrying token list + FILL)
       ## Consistency rules       (FILL)
       ## Accessibility           (FILL)
       ## Using this design system (for agents)   (prefilled rules + FILL)
       ## Status                  (FILL)
     Placeholders are HTML comments: <!-- FILL: ... -->.
     stdout — one summary line: "<n> tokens, <g> groups, <d> dark ->" + path.
     Self-verifies: re-reads the output and asserts every contract heading is
     present; a failed assertion exits 1 with a message on stderr.
Exit codes: 0 = written and verified; 1 = bad args, missing dep, unreadable
     input, or self-verification failure.
Flags: none.

Regenerated wholesale — never hand-edit the generated file's auto sections;
re-run this script after dtcg.yml changes and let the doc writer re-fill.
"""
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: python -m pip install pyyaml --break-system-packages")

_MISSING = object()

HEADINGS = [
    "# Design System",
    "## How it's organized",
    "## Principles",
    "## Token naming",
    "## Foundations",
    "## Theming",
    "## Consistency rules",
    "## Accessibility",
    "## Using this design system (for agents)",
    "## Status",
]


def dark_of(node):
    ext = node.get("$extensions")
    if isinstance(ext, dict):
        org = ext.get("org.superui")
        if isinstance(org, dict) and "dark" in org:
            return org["dark"]
    return _MISSING


def walk(node, path, tokens):
    if not isinstance(node, dict):
        return
    if "$value" in node:
        tokens[".".join(path)] = dark_of(node) is not _MISSING
        return
    for key, child in node.items():
        if key.startswith("$"):
            continue
        walk(child, path + [key], tokens)


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: design_md_skeleton.py TOKENS.yaml OUTPUT.md")
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except OSError as e:
        sys.exit(f"error: cannot read {sys.argv[1]}: {e}")
    if not isinstance(data, dict):
        sys.exit("error: top level must be a mapping")

    tokens = {}  # dotted path -> has_dark
    walk(data, [], tokens)

    groups = {}  # top-level group -> [paths]
    for path in tokens:
        groups.setdefault(path.split(".")[0], []).append(path)
    dark = sorted(p for p, has in tokens.items() if has)

    L = []
    L.append("# Design System")
    L.append("")
    L.append("<!-- FILL: one-paragraph intro — what this system is, extracted from")
    L.append("which source, and that every value below is a real measured token. -->")
    L.append("")
    L.append("## How it's organized")
    L.append("")
    L.append("Three layers, from raw material to finished screens:")
    L.append("")
    L.append("- **Foundations** — color, type, spacing & radius, effects. The raw")
    L.append("  material — all bound to tokens (`dtcg.yml`).")
    L.append("- **Components** — reusable building blocks assembled only from")
    L.append("  foundation tokens. Specs in `components/`.")
    L.append("- **Patterns** — how components come together into real screens.")
    L.append("  Specs in `patterns/`.")
    L.append("")
    L.append("## Principles")
    L.append("")
    L.append("<!-- FILL: the OBSERVED principles this source demonstrates, as short")
    L.append("bullets. Evidence-backed only; no aspirational principles. -->")
    L.append("")
    L.append("## Token naming")
    L.append("")
    L.append("Two tiers, named so they're predictable to read and to query:")
    L.append("")
    L.append("- **Primitives** — raw values, named by family + step; never consumed")
    L.append("  directly by UI.")
    L.append("- **Semantic** — roles that point at a primitive, named by use; build")
    L.append("  with these. (Component-scoped tokens exist only where a value must")
    L.append("  not leak globally.)")
    L.append("")
    L.append("Groups in `dtcg.yml`:")
    L.append("")
    for g in sorted(groups):
        paths = sorted(groups[g])
        sample = ", ".join(f"`{p}`" for p in paths[:3])
        unit = "token" if len(paths) == 1 else "tokens"
        L.append(f"- `{g}` — {len(paths)} {unit} (e.g. {sample})")
    L.append("")
    L.append("<!-- FILL: any naming conventions specific to this system. -->")
    L.append("")
    L.append("## Foundations")
    L.append("")
    L.append("<!-- FILL: per foundation (color, typography, spacing & radius,")
    L.append("effects/motion), a short narrative of what was measured: scales,")
    L.append("ramps, the measured surface/elevation order. Token NAMES only. -->")
    L.append("")
    L.append("## Theming")
    L.append("")
    if dark:
        L.append(f"{len(dark)} tokens carry a dark value in")
        L.append("`$extensions.org.superui.dark` (the only dark source; `tokens.css`")
        L.append("derives its `.dark` block from it):")
        L.append("")
        for p in dark:
            L.append(f"- `{p}`")
    else:
        L.append("No token carries `$extensions.org.superui.dark` — the source showed")
        L.append("no dark screens, so dark mode is unpopulated (never fabricated).")
    L.append("")
    L.append("<!-- FILL: how theming works here; which surfaces flip; anything the")
    L.append("dark screens did or did not show. -->")
    L.append("")
    L.append("## Consistency rules")
    L.append("")
    L.append("<!-- FILL: the measured surface/elevation order; the radius role set;")
    L.append("the ACCENT DISCIPLINE list (every allowed accent location, from the")
    L.append("accent-usage inventory); state treatments as form + measured color. -->")
    L.append("")
    L.append("## Accessibility")
    L.append("")
    L.append("<!-- FILL: measured contrast findings (report failures as observations),")
    L.append("focus treatment, target sizes, color-alone risks. -->")
    L.append("")
    L.append("## Using this design system (for agents)")
    L.append("")
    L.append("Rules for ANY agent or developer building UI in this project:")
    L.append("")
    L.append("- Tokens are the source of truth: reference `tokens.css` custom")
    L.append("  properties (`var(--...)`) or `dtcg.yml` names — NEVER hardcode a hex")
    L.append("  or a pixel value that exists as a token.")
    L.append("- Semantic over primitive: reach for role tokens first; primitives")
    L.append("  exist so the semantics have something to point to.")
    L.append("- Before building any UI: read this file, then the relevant spec in")
    L.append("  `components/` / `patterns/`; follow its states, anatomy, and Do's &")
    L.append("  Don'ts.")
    L.append("- Respect the consistency rules above — especially accent discipline")
    L.append("  and the surface/elevation order.")
    L.append("- A value you need that has no token is a gap: add the token first")
    L.append("  (validate with the extraction tooling), never inline the raw value.")
    L.append("")
    L.append("<!-- FILL: system-specific rules for agents (e.g. the one-line accent")
    L.append("rule, the spacing rhythm rule). Keep the bullets above intact. -->")
    L.append("")
    L.append("## Status")
    L.append("")
    L.append("<!-- FILL: what has been extracted (foundations, component/pattern")
    L.append("counts), open NEEDS INPUT items, and suggested next steps. -->")
    L.append("")

    out = "\n".join(L)
    try:
        with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
            f.write(out)
    except OSError as e:
        sys.exit(f"error: cannot write {sys.argv[2]}: {e}")

    # self-verify: every contract heading present in the written file
    with open(sys.argv[2], encoding="utf-8") as f:
        written = f.read()
    for h in HEADINGS:
        if f"\n{h}\n" not in f"\n{written}\n" and not written.startswith(h + "\n"):
            print(f"error: self-verification failed — missing heading '{h}'",
                  file=sys.stderr)
            sys.exit(1)

    print(f"{len(tokens)} tokens, {len(groups)} groups, {len(dark)} dark -> {sys.argv[2]}")


if __name__ == "__main__":
    main()
