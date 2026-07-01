#!/usr/bin/env python3
"""Build self-contained, zero-build HTML mockups from a design system.

Two modes:
  init   scaffold folders + shared assets (preview.js, preview.css), cache nothing
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

# Per-target injection contract. Each web target resolves its theme artifact
# from `targets/<target>/` and selects a delivery branch:
#   "tailwind"  -> Tailwind v4 browser CDN + <style type="text/tailwindcss"> block
#   "plain"     -> ordinary <style> with the artifact's CSS verbatim, NO CDN
# `candidates` is the ordered filename set read_theme() tries in that target dir.
TARGETS = {
    "pure-css":     {"branch": "plain",    "candidates": ("styles.css",)},
    "tailwind":     {"branch": "tailwind", "candidates": ("theme.css",)},
    "react-shadcn": {"branch": "tailwind", "candidates": ("globals.css",)},
}

# Targets that exist in the pipeline but have no faithful zero-build static-HTML
# preview: refuse cleanly and point at the native tooling.
NON_WEB_TARGETS = {
    "react-mui": "Storybook (or a Vite/CRA sandbox) renders the real MUI "
                 "components against the generated theme.ts",
    "flutter":   "DartPad (or a local `flutter run`) renders the widgets "
                 "against the generated theme.dart",
}


def target_dir(ds_dir, target):
    """The targets/<target>/ directory under the design-system root."""
    return os.path.join(ds_dir, "targets", target)


def resolve_target(target):
    """Return the web-target config, or sys.exit with guidance for non-web /
    unknown targets. Web targets only — react-mui / flutter are out of scope."""
    if target in TARGETS:
        return TARGETS[target]
    if target in NON_WEB_TARGETS:
        sys.exit(
            f"ERROR: target {target!r} has no zero-build static-HTML preview. "
            f"Use its native tooling instead: {NON_WEB_TARGETS[target]}. "
            "For a static appearance check, adapt a web target "
            "(pure-css / tailwind) as an approximation.")
    sys.exit(f"ERROR: unknown target {target!r}. "
             f"Web targets: {', '.join(sorted(TARGETS))}.")

PAGE_TEMPLATE = """<!doctype html>
<html lang="en"{HTML_ATTR}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
{THEME_HEAD}
<link rel="stylesheet" href="{PREFIX}assets/preview.css">
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
<script src="{PREFIX}assets/preview.js"></script>
</body>
</html>
"""

MAIN_CLASS = {
    "bare": "mk-main mk-main--bare",
    "centered": "mk-main mk-main--centered",
    "showcase": "mk-main mk-main--showcase",
}

MOCKUP_JS = """/* preview.js \u2014 shared interactivity for design-system mockups.
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
<link rel="stylesheet" href="assets/preview.css">
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
<script src="assets/preview.js"></script>
</body>
</html>
"""


def read_theme(theme_dir, candidates):
    """Resolve the theme artifact from `theme_dir` over the caller-supplied
    `candidates` filename set; return (css, filename) with the artifact's own
    `@import "tailwindcss";` stripped (harmless for plain CSS, required for the
    Tailwind branches so the shell's single import is authoritative).

    The directory and candidate set are passed by the caller (which derives them
    from the active target via TARGETS) — no path or filename is hardcoded here.
    A missing directory or a missing artifact is a hard error, not a silent
    unstyled build."""
    if not os.path.isdir(theme_dir):
        sys.exit(f"ERROR: target directory not found: {theme_dir!r}. "
                 "Run adapt-target for this target first, or pass the correct "
                 "--design-system / --target.")
    for name in candidates:
        p = os.path.join(theme_dir, name)
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as f:
                css = f.read()
            return _IMPORT_RE.sub("", css).strip(), name
    wanted = " or ".join(candidates)
    sys.exit(f"ERROR: no theme artifact ({wanted}) found in {theme_dir!r}. "
             "Run adapt-target for this target first.")


def theme_head(branch, theme, tw_tag):
    """Build the per-branch <head> theme delivery.

    plain    -> ordinary <style> with the artifact's CSS verbatim; no CDN,
                no type="text/tailwindcss" block.
    tailwind -> the Tailwind v4 browser CDN/vendor <script> + a
                <style type="text/tailwindcss"> block (byte-for-byte the prior
                behavior) so @theme/@layer resolve in-page."""
    if branch == "plain":
        return f"<style>\n{theme}\n</style>"
    return (f'{tw_tag}\n<style type="text/tailwindcss">\n'
            f'@import "tailwindcss";\n{theme}\n</style>')


def asset_prefix(rel_path):
    """Relative prefix from an output page back to the site root."""
    depth = rel_path.replace("\\", "/").count("/")
    return "../" * depth


def cmd_init(args):
    out = args.out
    cfg = resolve_target(args.target)  # web target or sys.exit with guidance
    for d in ("layouts", "pages", "components", "assets",
              "content/layouts", "content/pages", "content/components"):
        os.makedirs(os.path.join(out, d), exist_ok=True)
    with open(os.path.join(out, "assets", "preview.js"), "w", encoding="utf-8") as f:
        f.write(MOCKUP_JS)
    with open(os.path.join(out, "assets", "preview.css"), "w", encoding="utf-8") as f:
        f.write(MOCKUP_CSS)
    # validate the target's theme artifact is present now, so failures surface early
    _, name = read_theme(target_dir(args.design_system, args.target),
                         cfg["candidates"])
    vendored = False
    if cfg["branch"] == "tailwind" and args.vendor_tailwind:
        vendored = _try_vendor(out)
    print(f"init: scaffolded {out}")
    print(f"  target: {args.target}")
    print(f"  theme source: targets/{args.target}/{name}")
    if cfg["branch"] == "plain":
        print("  tailwind: n/a (pure-css emits plain CSS, no CDN)")
    else:
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


def validate_pages(pages):
    """Fail early (before writing anything) if a manifest page is missing a
    required key, so a downstream KeyError never crashes mid-render and leaves a
    partially-written site."""
    required = ("path", "fragment", "title")
    for i, p in enumerate(pages):
        if not isinstance(p, dict):
            sys.exit(f"ERROR: manifest page #{i} is not an object: {p!r}")
        missing = [k for k in required if k not in p]
        if missing:
            ident = p.get("path") or p.get("title") or "?"
            sys.exit(f"ERROR: manifest page #{i} ({ident}) is missing required "
                     f"key(s): {', '.join(missing)}.")


def cmd_build(args):
    out = args.out
    cfg = resolve_target(args.target)  # web target or sys.exit with guidance
    branch = cfg["branch"]
    with open(args.manifest, encoding="utf-8") as f:
        manifest = json.load(f)
    theme, theme_name = read_theme(target_dir(args.design_system, args.target),
                                   cfg["candidates"])
    vendored = (branch == "tailwind"
                and os.path.isfile(os.path.join(out, "assets",
                                                 "tailwindcss-browser.js")))

    pages = manifest.get("pages", [])
    validate_pages(pages)
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
                .replace("{THEME_HEAD}", theme_head(branch, theme, tw))
                .replace("{PREFIX}", prefix)
                .replace("{MAIN_CLASS}", MAIN_CLASS.get(layout, MAIN_CLASS["showcase"]))
                .replace("{CONTENT}", content))
        dest = os.path.join(out, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(html)
        written += 1

    title = manifest.get("title", "Design System \u2014 Mockups")
    delivery = ("plain CSS, no build" if branch == "plain"
                else "Tailwind v4 browser build")
    sub = (f"{written} pages \u00b7 target: {args.target} \u00b7 theme: {theme_name} \u00b7 "
           f"{delivery}. Open any page; use \u25d0 Theme to toggle dark mode.")
    index = (INDEX_TEMPLATE
             .replace("{TITLE}", title)
             .replace("{SUB}", sub)
             .replace("{GROUPS}", render_groups(pages)))
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
        f.write(index)
    print(f"build: wrote {written} pages + index.html to {out}")
    if branch == "plain":
        print(f"  target {args.target}; theme injected from {theme_name} as plain CSS (no CDN)")
    else:
        print(f"  target {args.target}; theme injected from {theme_name}; "
              f"tailwind via {'vendored file' if vendored else 'CDN'}")


# --- standalone (single-file, network-free) -------------------------------
#
# Claude Code Artifacts publish exactly ONE self-contained file under a strict
# CSP: no external requests, no relative-link resolution, one page, <=16 MiB.
# `standalone` emits that conformant file by inlining MOCKUP_CSS + MOCKUP_JS and
# the theme directly into the page and dropping every relative assets/ link.

STANDALONE_TEMPLATE = """<!doctype html>
<html lang="en"{HTML_ATTR}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
{THEME_HEAD}
<style>
{MOCKUP_CSS}
</style>
</head>
<body class="mk-body">
<header class="mk-bar">
  <span class="mk-bar__title">{TITLE}</span>
  <button class="mk-bar__toggle" type="button" data-theme-toggle aria-label="Toggle dark mode">◐ Theme</button>
</header>
{BODY}
<script>
{MOCKUP_JS}
</script>
</body>
</html>
"""

# An external reference forbidden inside a published artifact: an http(s):// URL
# or a protocol-relative (//host) URL, in a `url(...)` or anywhere in the text.
# `data:` URIs and bare `#anchor` refs are NOT external and are left alone — the
# negative lookbehind for `:` keeps a `data:.../...//...` payload from matching.
_EXTERNAL_REF_RE = re.compile(
    r"https?://"            # http://… or https://…
    r"|(?<![a-z0-9:])//",   # protocol-relative //host (not preceded by scheme/word)
    re.IGNORECASE)


def find_external_refs(text):
    """Return the external/protocol-relative references in `text`.

    Catches `http(s)://` and protocol-relative `//host` (the references a
    published-artifact CSP forbids); `data:` URIs and `#anchor` refs are allowed.
    Empty list means the text is safe to inline into a standalone file."""
    return _EXTERNAL_REF_RE.findall(text)


def _refuse_external(label, text):
    """sys.exit with guidance if `text` carries any external reference."""
    bad = find_external_refs(text)
    if bad:
        sys.exit(
            f"ERROR: {label} carries external reference(s) {sorted(set(bad))} "
            "that a published artifact's CSP forbids. Remove or inline the "
            "external resource (url()/http(s)/// ) before emitting a standalone "
            "file.")


def _slugify(text):
    """A stable in-page anchor id from a page title."""
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "page"


def cmd_standalone(args):
    """Emit ONE self-contained, network-free HTML file (Claude Code Artifact).

    Inlines MOCKUP_CSS + MOCKUP_JS and the active target's theme; drops every
    relative assets/ link. Refuses (non-zero exit) rather than emit a page that
    would make an external request: a Tailwind branch with no vendored build, or
    a theme/fragment carrying an external url()/http(s)///  reference."""
    cfg = resolve_target(args.target)  # web target or sys.exit with guidance
    branch = cfg["branch"]
    with open(args.manifest, encoding="utf-8") as f:
        manifest = json.load(f)
    theme, theme_name = read_theme(target_dir(args.design_system, args.target),
                                   cfg["candidates"])

    # An external reference in the theme cannot be inlined without violating the
    # artifact CSP — refuse instead of shipping a page that fetches at runtime.
    _refuse_external(f"theme artifact {theme_name!r}", theme)

    if branch == "plain":
        theme_head_html = f"<style>\n{theme}\n</style>"
    else:
        # Tailwind branch: inline the vendored browser build so the page makes no
        # CDN request (the artifact CSP forbids it). With only the CDN tag and no
        # vendored build, refuse rather than emit a page that fetches at runtime.
        vendored = os.path.join(args.out, "assets", "tailwindcss-browser.js")
        if not os.path.isfile(vendored):
            sys.exit(
                f"ERROR: target {args.target!r} needs Tailwind, but no vendored "
                "build was found at assets/tailwindcss-browser.js. A published "
                "artifact cannot fetch the CDN. Run `init --vendor-tailwind` to "
                "vendor the browser build, or use the pure-css target for a "
                "fully-offline page.")
        with open(vendored, encoding="utf-8") as f:
            tw_js = f.read()
        theme_head_html = (
            f'<script>\n{tw_js}\n</script>\n'
            f'<style type="text/tailwindcss">\n@import "tailwindcss";\n'
            f'{theme}\n</style>')

    pages = manifest.get("pages", [])
    validate_pages(pages)
    title = manifest.get("title", "Design System — Mockups")
    only = getattr(args, "page", None)
    body = _standalone_body(args.out, pages, only)

    html = (STANDALONE_TEMPLATE
            .replace("{HTML_ATTR}", "")
            .replace("{TITLE}", title)
            .replace("{THEME_HEAD}", theme_head_html)
            .replace("{MOCKUP_CSS}", MOCKUP_CSS)
            .replace("{MOCKUP_JS}", MOCKUP_JS)
            .replace("{BODY}", body))

    dest = args.dest
    os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(html)
    scope = f"page {only!r}" if only else f"{len(pages)} pages (combined showcase)"
    print(f"standalone: wrote {dest} ({scope}; target {args.target}, "
          f"theme {theme_name}, fully inline, no external requests)")


def _read_fragment(out, page):
    """Read one manifest page's fragment, refusing on an external reference."""
    frag_path = os.path.join(out, page["fragment"])
    if not os.path.isfile(frag_path):
        sys.exit(f"ERROR: fragment not found: {frag_path}")
    with open(frag_path, encoding="utf-8") as f:
        content = f.read()
    _refuse_external(f"fragment {page['fragment']!r}", content)
    return content


def _standalone_body(out, pages, only):
    """Compose the <main> body: a single named page, or the combined showcase
    (every manifest page stacked under one <main> with in-page anchors + TOC)."""
    if only is not None:
        match = next((p for p in pages if p["path"] == only
                      or p.get("title") == only), None)
        if match is None:
            sys.exit(f"ERROR: page {only!r} not found in manifest. "
                     f"Known paths: {', '.join(p['path'] for p in pages)}.")
        content = _read_fragment(out, match)
        cls = MAIN_CLASS.get(match.get("layout", "showcase"),
                             MAIN_CLASS["showcase"])
        return f'<main class="{cls}">\n{content}\n</main>'

    # Combined showcase: a TOC plus every page stacked under one showcase <main>,
    # each behind a generated in-page anchor so the TOC links resolve in-page.
    sections, toc = [], []
    for p in pages:
        anchor = _slugify(p.get("title", p["path"]))
        toc.append(f'    <li><a href="#{anchor}">{p["title"]}</a></li>')
        content = _read_fragment(out, p)
        sections.append(
            f'<section id="{anchor}" class="mk-section">\n'
            f'<h2 class="mk-section__title">{p["title"]}</h2>\n'
            f'{content}\n</section>')
    toc_html = ('<nav class="mk-toc">\n  <ul>\n' + "\n".join(toc)
                + '\n  </ul>\n</nav>')
    return (f'<main class="{MAIN_CLASS["showcase"]}">\n{toc_html}\n'
            + "\n".join(sections) + "\n</main>")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="mode", required=True)

    web = ", ".join(sorted(TARGETS))
    i = sub.add_parser("init", help="scaffold folders + shared assets")
    i.add_argument("--design-system", required=True, help="design-system directory")
    i.add_argument("--target", required=True,
                   help=f"active web target (one of: {web})")
    i.add_argument("--out", required=True, help="output mockups directory")
    i.add_argument("--vendor-tailwind", action="store_true",
                   help="vendor @tailwindcss/browser locally for offline use (needs npm registry)")
    i.set_defaults(func=cmd_init)

    b = sub.add_parser("build", help="wrap fragments + generate index from a manifest")
    b.add_argument("--design-system", required=True, help="design-system directory")
    b.add_argument("--target", required=True,
                   help=f"active web target (one of: {web})")
    b.add_argument("--out", required=True, help="output mockups directory")
    b.add_argument("--manifest", required=True, help="manifest.json describing the pages")
    b.set_defaults(func=cmd_build)

    s = sub.add_parser("standalone",
                       help="emit ONE self-contained, network-free HTML file "
                            "(Claude Code Artifact) by inlining CSS/JS + theme")
    s.add_argument("--design-system", required=True, help="design-system directory")
    s.add_argument("--target", required=True,
                   help=f"active web target (one of: {web})")
    s.add_argument("--out", required=True,
                   help="mockups directory (holds content/ + any vendored assets/)")
    s.add_argument("--manifest", required=True, help="manifest.json describing the pages")
    s.add_argument("--dest", required=True, help="output single-file HTML path")
    s.add_argument("--page", default=None,
                   help="emit only this page (its manifest path or title); "
                        "default is the combined showcase of all pages")
    s.set_defaults(func=cmd_standalone)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
