#!/usr/bin/env python3
"""Build self-contained, zero-build HTML mockups from a design system.

Two modes:
  init   scaffold folders + shared assets (mockup.js, mockup.css), cache nothing
  build  wrap authored content fragments in the shared shell (CDN + injected
         design-system theme + assets) and generate index.html from a manifest

The design-system theme (theme.css or globals.css) is read fresh on every build
and injected into each page, so it has one source of truth even though every
output page is self-contained and opens from file://.

Stdlib only. Run with --help on either subcommand.
"""
import argparse
import json
import os
import re
import sys

CDN_TAG = '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>'
VENDOR_TAG = '<script src="{prefix}assets/tailwindcss-browser.js"></script>'

# Remove any @import "tailwindcss"; the theme file ships with, so the shell's
# single import is authoritative and not duplicated.
_IMPORT_RE = re.compile(r'^\s*@import\s+["\']tailwindcss["\'][^;]*;\s*$', re.MULTILINE)

PAGE_TEMPLATE = """<!doctype html>
<html lang="en"{HTML_ATTR}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
{TAILWIND}
<style type="text/tailwindcss">
@import "tailwindcss";
{THEME}
</style>
<link rel="stylesheet" href="{PREFIX}assets/mockup.css">
</head>
<body class="mk-body">
<header class="mk-bar">
  <a class="mk-bar__home" href="{PREFIX}index.html">\u2190 Index</a>
  <span class="mk-bar__title">{TITLE}</span>
  <button class="mk-bar__toggle" type="button" data-theme-toggle aria-label="Toggle dark mode">\u25d0 Theme</button>
</header>
<main class="{MAIN_CLASS}">
{CONTENT}
</main>
<script src="{PREFIX}assets/mockup.js"></script>
</body>
</html>
"""

MAIN_CLASS = {
    "bare": "mk-main mk-main--bare",
    "centered": "mk-main mk-main--centered",
    "showcase": "mk-main mk-main--showcase",
}

MOCKUP_JS = """/* mockup.js \u2014 shared interactivity for design-system mockups.
   Two behaviors, both driven by data-attributes so pages need no inline JS. */
(function () {
  var KEY = "mockup-theme";

  // --- Dark / light mode -------------------------------------------------
  function apply(theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  try { apply(localStorage.getItem(KEY)); } catch (e) {}

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-theme-toggle]");
    if (!t) return;
    var dark = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch (e) {}
  });

  // --- Forced interactive states ----------------------------------------
  // <button data-state-toggle="bg-surface-hover" data-target="#sample">Hover</button>
  // Toggles the given class on every element matching data-target.
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-state-toggle]");
    if (!t) return;
    var cls = t.getAttribute("data-state-toggle");
    var sel = t.getAttribute("data-target");
    if (!cls || !sel) return;
    var on = false;
    document.querySelectorAll(sel).forEach(function (el) {
      on = el.classList.toggle(cls);
    });
    t.setAttribute("aria-pressed", on ? "true" : "false");
    t.classList.toggle("mk-toggle--on", on);
  });
})();
"""

# Neutral chrome only. Never uses design-system utilities, so a broken DS value
# is exposed rather than masked. Responds to .dark so chrome stays readable.
MOCKUP_CSS = """:root{
  --mk-bg:#f7f7f8; --mk-fg:#1f2328; --mk-muted:#6b7280; --mk-line:#e5e7eb;
  --mk-card:#ffffff; --mk-warn-bg:#fff7ed; --mk-warn-fg:#9a3412; --mk-warn-line:#fdba74;
  --mk-accent:#2563eb;
}
.dark{
  --mk-bg:#0b0d10; --mk-fg:#e6e8eb; --mk-muted:#9aa3ad; --mk-line:#252b32;
  --mk-card:#13161a; --mk-warn-bg:#2a1a0e; --mk-warn-fg:#fdba74; --mk-warn-line:#7c4a1e;
  --mk-accent:#60a5fa;
}
.mk-body{margin:0;background:var(--mk-bg);color:var(--mk-fg);
  font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
.mk-bar{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:1rem;
  padding:.5rem 1rem;background:var(--mk-card);border-bottom:1px solid var(--mk-line);
  font-size:.85rem;}
.mk-bar__home{color:var(--mk-accent);text-decoration:none;}
.mk-bar__title{font-weight:600;}
.mk-bar__toggle{margin-left:auto;cursor:pointer;border:1px solid var(--mk-line);
  background:transparent;color:var(--mk-fg);border-radius:6px;padding:.25rem .6rem;font-size:.8rem;}
.mk-main{display:block;}
.mk-main--bare{padding:0;}
.mk-main--centered{min-height:calc(100vh - 50px);display:flex;align-items:center;
  justify-content:center;padding:2rem;}
.mk-main--showcase{max-width:1024px;margin:0 auto;padding:2rem 1.5rem;}

/* showcase chrome */
.mk-spec__name{font-size:1.5rem;font-weight:700;margin:0 0 .25rem;}
.mk-spec__meta{color:var(--mk-muted);font-size:.85rem;margin:0 0 .25rem;}
.mk-spec__def{color:var(--mk-fg);margin:0 0 1.5rem;}
.mk-section{margin:2rem 0;}
.mk-section__title{font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;
  color:var(--mk-muted);margin:0 0 .75rem;border-bottom:1px solid var(--mk-line);padding-bottom:.35rem;}
.mk-grid{display:flex;flex-wrap:wrap;gap:1.25rem;}
.mk-cell{display:flex;flex-direction:column;gap:.4rem;}
.mk-cell__label{font-size:.72rem;color:var(--mk-muted);}
.mk-cell__stage{padding:1rem;border:1px dashed var(--mk-line);border-radius:8px;
  background:var(--mk-card);display:flex;align-items:center;justify-content:center;min-width:120px;}
.mk-tokens{display:flex;flex-wrap:wrap;gap:.4rem;}
.mk-token{font:.72rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
  background:var(--mk-card);border:1px solid var(--mk-line);border-radius:6px;padding:.15rem .45rem;color:var(--mk-muted);}
.mk-toggles{display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0;}
.mk-toggle{cursor:pointer;border:1px solid var(--mk-line);background:var(--mk-card);
  color:var(--mk-fg);border-radius:6px;padding:.3rem .7rem;font-size:.8rem;}
.mk-toggle--on{border-color:var(--mk-accent);color:var(--mk-accent);}
.mk-gap{border:1px solid var(--mk-warn-line);background:var(--mk-warn-bg);color:var(--mk-warn-fg);
  border-radius:8px;padding:.75rem 1rem;font-size:.85rem;margin:.5rem 0;}

/* index */
.mk-index{max-width:960px;margin:0 auto;padding:2.5rem 1.5rem;}
.mk-index__h1{font-size:1.75rem;font-weight:700;margin:0 0 .25rem;}
.mk-index__sub{color:var(--mk-muted);margin:0 0 2rem;}
.mk-index__group{font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;
  color:var(--mk-muted);margin:1.75rem 0 .6rem;}
.mk-index__list{list-style:none;margin:0;padding:0;display:grid;
  grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.6rem;}
.mk-index__link{display:block;padding:.7rem .9rem;background:var(--mk-card);
  border:1px solid var(--mk-line);border-radius:8px;color:var(--mk-fg);text-decoration:none;}
.mk-index__link:hover{border-color:var(--mk-accent);color:var(--mk-accent);}
"""

INDEX_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
<link rel="stylesheet" href="assets/mockup.css">
</head>
<body class="mk-body">
<header class="mk-bar">
  <span class="mk-bar__title">{TITLE}</span>
  <button class="mk-bar__toggle" type="button" data-theme-toggle aria-label="Toggle dark mode">\u25d0 Theme</button>
</header>
<main class="mk-index">
<h1 class="mk-index__h1">{TITLE}</h1>
<p class="mk-index__sub">{SUB}</p>
{GROUPS}
</main>
<script src="assets/mockup.js"></script>
</body>
</html>
"""


def read_theme(ds_dir):
    """Return the design-system theme CSS with its own tailwindcss @import stripped."""
    for name in ("theme.css", "globals.css"):
        p = os.path.join(ds_dir, name)
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as f:
                css = f.read()
            return _IMPORT_RE.sub("", css).strip(), name
    sys.exit(f"ERROR: no theme.css or globals.css found in {ds_dir!r}. "
             "Run ui-extract first, or pass the correct --design-system.")


def asset_prefix(rel_path):
    """Relative prefix from an output page back to the site root."""
    depth = rel_path.replace("\\", "/").count("/")
    return "../" * depth


def cmd_init(args):
    out = args.out
    for d in ("layouts", "pages", "components", "assets",
              "content/layouts", "content/pages", "content/components"):
        os.makedirs(os.path.join(out, d), exist_ok=True)
    with open(os.path.join(out, "assets", "mockup.js"), "w", encoding="utf-8") as f:
        f.write(MOCKUP_JS)
    with open(os.path.join(out, "assets", "mockup.css"), "w", encoding="utf-8") as f:
        f.write(MOCKUP_CSS)
    # validate the theme is present now, so failures surface early
    _, name = read_theme(args.design_system)
    vendored = False
    if args.vendor_tailwind:
        vendored = _try_vendor(out)
    print(f"init: scaffolded {out}")
    print(f"  theme source: {name}")
    print(f"  tailwind: {'vendored (assets/tailwindcss-browser.js)' if vendored else 'CDN'}")
    print("  authored fragments go under content/{layouts,pages,components}/")


def _try_vendor(out):
    """Best-effort: pull @tailwindcss/browser from the npm registry. Non-fatal."""
    import subprocess
    import glob
    import tarfile
    import tempfile
    try:
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["npm", "pack", "@tailwindcss/browser"], cwd=tmp,
                           check=True, capture_output=True, timeout=120)
            tgz = glob.glob(os.path.join(tmp, "*.tgz"))[0]
            with tarfile.open(tgz) as tf:
                member = next(m for m in tf.getmembers()
                              if m.name.endswith("dist/index.global.js"))
                src = tf.extractfile(member).read()
            with open(os.path.join(out, "assets", "tailwindcss-browser.js"), "wb") as f:
                f.write(src)
        return True
    except Exception as e:
        print(f"  WARN: vendoring failed ({e}); keeping CDN tag.", file=sys.stderr)
        return False


def render_groups(pages):
    order, groups = [], {}
    for p in pages:
        g = p.get("group", "Pages")
        if g not in groups:
            groups[g] = []
            order.append(g)
        groups[g].append(p)
    out = []
    for g in order:
        items = "\n".join(
            f'    <li><a class="mk-index__link" href="{p["path"]}">{p["title"]}</a></li>'
            for p in groups[g]
        )
        out.append(f'<h2 class="mk-index__group">{g}</h2>\n'
                   f'  <ul class="mk-index__list">\n{items}\n  </ul>')
    return "\n".join(out)


def cmd_build(args):
    out = args.out
    with open(args.manifest, encoding="utf-8") as f:
        manifest = json.load(f)
    theme, theme_name = read_theme(args.design_system)
    vendored = os.path.isfile(os.path.join(out, "assets", "tailwindcss-browser.js"))

    pages = manifest.get("pages", [])
    written = 0
    for p in pages:
        rel = p["path"]
        frag_path = os.path.join(out, p["fragment"])
        if not os.path.isfile(frag_path):
            sys.exit(f"ERROR: fragment not found: {frag_path}")
        with open(frag_path, encoding="utf-8") as f:
            content = f.read()
        prefix = asset_prefix(rel)
        layout = p.get("layout", "showcase")
        tw = (VENDOR_TAG.format(prefix=prefix) if vendored else CDN_TAG)
        html = (PAGE_TEMPLATE
                .replace("{HTML_ATTR}", "")
                .replace("{TITLE}", p["title"])
                .replace("{TAILWIND}", tw)
                .replace("{THEME}", theme)
                .replace("{PREFIX}", prefix)
                .replace("{MAIN_CLASS}", MAIN_CLASS.get(layout, MAIN_CLASS["showcase"]))
                .replace("{CONTENT}", content))
        dest = os.path.join(out, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(html)
        written += 1

    title = manifest.get("title", "Design System \u2014 Mockups")
    sub = (f"{written} pages \u00b7 theme: {theme_name} \u00b7 "
           "Tailwind v4 browser build. Open any page; use \u25d0 Theme to toggle dark mode.")
    index = (INDEX_TEMPLATE
             .replace("{TITLE}", title)
             .replace("{SUB}", sub)
             .replace("{GROUPS}", render_groups(pages)))
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
        f.write(index)
    print(f"build: wrote {written} pages + index.html to {out}")
    print(f"  theme injected from {theme_name}; tailwind via {'vendored file' if vendored else 'CDN'}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="mode", required=True)

    i = sub.add_parser("init", help="scaffold folders + shared assets")
    i.add_argument("--design-system", required=True, help="design-system directory")
    i.add_argument("--out", required=True, help="output mockups directory")
    i.add_argument("--vendor-tailwind", action="store_true",
                   help="vendor @tailwindcss/browser locally for offline use (needs npm registry)")
    i.set_defaults(func=cmd_init)

    b = sub.add_parser("build", help="wrap fragments + generate index from a manifest")
    b.add_argument("--design-system", required=True, help="design-system directory")
    b.add_argument("--out", required=True, help="output mockups directory")
    b.add_argument("--manifest", required=True, help="manifest.json describing the pages")
    b.set_defaults(func=cmd_build)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
