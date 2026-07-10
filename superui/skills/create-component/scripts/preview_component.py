#!/usr/bin/env python3
"""superui/create-component — scripts/preview_component.py

Wrap ONE component fragment + the agnostic tokens.css into a single
self-contained, pure-CSS HTML page that opens from file://.

Intentionally tiny. This is the L1 net-new-authoring preview: one component,
no manifest, no index, no per-target injection, no Tailwind CDN. It exists only
so a just-drafted spec can be rendered against the design system's own
tokens.css and iterated visually. Do not grow this into a multi-page,
per-target mockup builder.

The fragment is plain HTML that styles itself from the design-system tokens via
the CSS custom properties tokens.css declares (`var(--color-...)`, ...). The
page inlines tokens.css verbatim into a <style> block so the var(...)
references resolve with no build step and no network.

IN : --design-system DIR   directory holding tokens.css (e.g.
                           .superui/layout/design-system)
     --fragment FRAG.html  HTML fragment file: one component, every documented
                           variant/state, each labeled
     --out OUT.html        output HTML path (parent dirs created as needed)
     [--title T]           page title shown in <title> + chrome bar; HTML-escaped
                           before insertion (default: "Component preview")
OUT: OUT.html — one self-contained pure-CSS page: tokens.css inlined verbatim,
     the fragment embedded in <main>, plus a neutral cc-* chrome (title bar +
     dark/light toggle) that never uses design-system tokens.
     stdout: `preview: wrote <out>` + a one-line hint. All I/O is UTF-8.
Exit codes:
     0  success (OUT.html written)
     1  missing tokens.css in --design-system, or --fragment not found
        (message on stderr)
     2  argparse usage error (bad/missing flags)

Stdlib only. Run with --help.
"""
import argparse
import html
import os
import sys

# Pure-CSS page shell. No Tailwind, no CDN, no build step. The design system's
# tokens.css is inlined verbatim; the fragment references its custom properties
# directly. A tiny neutral chrome (labels + dark toggle) stays in its own
# namespace (cc-*) so it never masks a token defect in the previewed component.
PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
<style>
/* --- design-system tokens (inlined verbatim from tokens.css) ------------- */
{TOKENS}
/* --- neutral preview chrome (own namespace; never uses DS tokens) -------- */
.cc-body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  background:#f7f7f8;color:#1f2328;}
.dark .cc-body,.cc-body.dark{background:#0b0d10;color:#e6e8eb;}
.cc-bar{position:sticky;top:0;display:flex;align-items:center;gap:1rem;
  padding:.5rem 1rem;background:#fff;border-bottom:1px solid #e5e7eb;font-size:.85rem;}
.dark .cc-bar{background:#13161a;border-bottom-color:#252b32;}
.cc-bar__title{font-weight:600;}
.cc-bar__toggle{margin-left:auto;cursor:pointer;border:1px solid #d1d5db;background:transparent;
  color:inherit;border-radius:6px;padding:.25rem .6rem;font:inherit;font-size:.8rem;}
.cc-main{max-width:960px;margin:0 auto;padding:2rem 1.5rem;}
.cc-label{font:.72rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#6b7280;
  text-transform:uppercase;letter-spacing:.05em;margin:1.5rem 0 .4rem;}
.dark .cc-label{color:#9aa3ad;}
.cc-stage{padding:1.25rem;border:1px dashed #d1d5db;border-radius:8px;background:transparent;
  display:flex;flex-wrap:wrap;align-items:center;gap:1rem;}
.dark .cc-stage{border-color:#374151;}
</style>
</head>
<body class="cc-body">
<header class="cc-bar">
  <span class="cc-bar__title">{TITLE}</span>
  <button class="cc-bar__toggle" type="button" onclick="document.documentElement.classList.toggle('dark')">Toggle theme</button>
</header>
<main class="cc-main">
{CONTENT}
</main>
</body>
</html>
"""


def read_tokens(ds_dir):
    """Return the verbatim contents of tokens.css from the design-system dir."""
    p = os.path.join(ds_dir, "tokens.css")
    if not os.path.isfile(p):
        sys.exit(
            f"ERROR: no tokens.css found in {ds_dir!r}. Run extract-design-system first "
            "(or point --design-system at the directory that holds tokens.css)."
        )
    with open(p, encoding="utf-8") as f:
        return f.read().strip()


def main():
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument(
        "--design-system", required=True,
        help="design-system directory containing tokens.css (e.g. .superui/layout/design-system)",
    )
    ap.add_argument(
        "--fragment", required=True,
        help="HTML fragment file: one component, every documented variant/state, each labeled",
    )
    ap.add_argument(
        "--out", required=True,
        help="output HTML file to open from file:// (e.g. .superui/layout/design-system/.preview/button.html)",
    )
    ap.add_argument(
        "--title", default="Component preview",
        help="page title shown in the chrome bar (default: 'Component preview')",
    )
    args = ap.parse_args()

    if not os.path.isfile(args.fragment):
        sys.exit(f"ERROR: fragment not found: {args.fragment!r}")
    tokens = read_tokens(args.design_system)
    with open(args.fragment, encoding="utf-8") as f:
        content = f.read()

    page = (PAGE_TEMPLATE
            .replace("{TITLE}", html.escape(args.title))
            .replace("{TOKENS}", tokens)
            .replace("{CONTENT}", content))

    out_dir = os.path.dirname(os.path.abspath(args.out))
    os.makedirs(out_dir, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(page)

    print(f"preview: wrote {args.out}")
    print("  tokens.css inlined; pure CSS, no build step. Open the file in a browser.")


if __name__ == "__main__":
    main()
