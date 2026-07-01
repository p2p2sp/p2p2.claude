#!/usr/bin/env python3
"""Unit tests for build_site.py per-target injection branches.

Stdlib-only (unittest). Run from this directory:
    python -m unittest test_build_site
or discover:
    python -m unittest discover -s . -p 'test_*.py'

Each test builds a one-page site into a temp dir for a given target and asserts
on the generated HTML, so the injection branch is verified by its observable
output rather than by inspecting internals.
"""
import os
import tempfile
import unittest

import build_site


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


class BuildSiteCase(unittest.TestCase):
    """Base: scaffold a minimal design-system + output dir for one target."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = self._tmp.name
        self.ds = os.path.join(self.root, "design-system")
        self.out = os.path.join(self.root, "preview")
        os.makedirs(self.out, exist_ok=True)

    def tearDown(self):
        self._tmp.cleanup()

    def _make_target(self, target, artifact, css):
        """Create targets/<target>/<artifact> with the given CSS body."""
        _write(os.path.join(self.ds, "targets", target, artifact), css)

    def _build_one_page(self, target):
        """Author one fragment + manifest, run cmd_build, return the page HTML."""
        _write(os.path.join(self.out, "content", "components", "btn.html"),
               '<button class="btn">Go</button>')
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest,
               '{"title":"T","pages":[{"path":"components/btn.html",'
               '"fragment":"content/components/btn.html","title":"Button",'
               '"group":"Components","layout":"showcase"}]}')
        args = build_site.argparse.Namespace(
            design_system=self.ds, out=self.out, manifest=manifest,
            target=target, mode="build")
        build_site.cmd_build(args)
        with open(os.path.join(self.out, "components", "btn.html"),
                  encoding="utf-8") as f:
            return f.read()


class PureCssBranchTests(BuildSiteCase):
    def test_pure_css_emits_plain_css_no_cdn_no_tailwindcss_block(self):
        self._make_target("pure-css", "styles.css",
                          ":root{--color-surface:#fff;}\n.btn{color:red;}")
        html = self._build_one_page("pure-css")
        # plain CSS for styles.css is present
        self.assertIn(".btn{color:red;}", html)
        # NO Tailwind CDN script
        self.assertNotIn("@tailwindcss/browser", html)
        self.assertNotIn(build_site.CDN_TAG, html)
        # NO type="text/tailwindcss" block
        self.assertNotIn('type="text/tailwindcss"', html)


class TailwindBranchTests(BuildSiteCase):
    def test_tailwind_emits_cdn_script_and_tailwindcss_block(self):
        self._make_target("tailwind", "theme.css",
                          '@theme{--color-surface:#fff;}')
        html = self._build_one_page("tailwind")
        # existing Tailwind CDN script present
        self.assertIn(build_site.CDN_TAG, html)
        # type="text/tailwindcss" block present, theme injected
        self.assertIn('<style type="text/tailwindcss">', html)
        self.assertIn('@import "tailwindcss";', html)
        self.assertIn('@theme{--color-surface:#fff;}', html)

    def test_tailwind_head_is_byte_for_byte_prior_behavior(self):
        # Regression: the tailwind head block must match the prior hardcoded
        # template exactly (CDN_TAG, then the tailwindcss style block).
        theme = '@theme{--x:1;}'
        head = build_site.theme_head("tailwind", theme, build_site.CDN_TAG)
        expected = (build_site.CDN_TAG + '\n'
                    '<style type="text/tailwindcss">\n'
                    '@import "tailwindcss";\n'
                    + theme + '\n</style>')
        self.assertEqual(head, expected)

    def test_react_shadcn_emits_cdn_script_and_tailwindcss_block(self):
        self._make_target("react-shadcn", "globals.css",
                          ':root{--background:oklch(1 0 0);}')
        html = self._build_one_page("react-shadcn")
        self.assertIn(build_site.CDN_TAG, html)
        self.assertIn('<style type="text/tailwindcss">', html)
        self.assertIn(':root{--background:oklch(1 0 0);}', html)


class UnsupportedTargetTests(BuildSiteCase):
    def test_react_mui_refuses_with_storybook_guidance_and_no_page(self):
        # No theme artifact needed: refusal must happen before any page is written.
        with self.assertRaises(SystemExit) as cm:
            self._build_one_page("react-mui")
        self.assertIn("Storybook", str(cm.exception))
        self.assertFalse(
            os.path.isfile(os.path.join(self.out, "components", "btn.html")),
            "no page should be produced for an unsupported target")

    def test_flutter_refuses_with_dartpad_guidance_and_no_page(self):
        with self.assertRaises(SystemExit) as cm:
            self._build_one_page("flutter")
        self.assertIn("DartPad", str(cm.exception))
        self.assertFalse(
            os.path.isfile(os.path.join(self.out, "components", "btn.html")),
            "no page should be produced for an unsupported target")


class ReadThemeResolutionTests(BuildSiteCase):
    def test_read_theme_resolves_artifact_from_caller_dir_over_candidates(self):
        # Caller passes the targets/<chosen>/ directory and the candidate set;
        # read_theme picks the first candidate that exists there.
        tdir = os.path.join(self.ds, "targets", "pure-css")
        _write(os.path.join(tdir, "styles.css"), ".btn{color:blue;}")
        css, name = build_site.read_theme(
            tdir, ("theme.css", "globals.css", "styles.css"))
        self.assertEqual(name, "styles.css")
        self.assertIn(".btn{color:blue;}", css)

    def test_read_theme_strips_own_tailwindcss_import(self):
        tdir = os.path.join(self.ds, "targets", "tailwind")
        _write(os.path.join(tdir, "theme.css"),
               '@import "tailwindcss";\n@theme{--x:1;}')
        css, name = build_site.read_theme(tdir, ("theme.css",))
        self.assertEqual(name, "theme.css")
        self.assertNotIn('@import "tailwindcss";', css)
        self.assertIn("@theme{--x:1;}", css)


class MissingThemeTests(BuildSiteCase):
    def test_missing_target_dir_raises_clear_error(self):
        # targets/pure-css/ does not exist at all.
        with self.assertRaises(SystemExit) as cm:
            build_site.read_theme(
                os.path.join(self.ds, "targets", "pure-css"), ("styles.css",))
        msg = str(cm.exception)
        self.assertIn("ERROR", msg)
        self.assertIn("not found", msg)

    def test_missing_theme_artifact_raises_clear_error(self):
        # Directory exists but the candidate artifact is absent.
        tdir = os.path.join(self.ds, "targets", "pure-css")
        os.makedirs(tdir, exist_ok=True)
        with self.assertRaises(SystemExit) as cm:
            build_site.read_theme(tdir, ("styles.css",))
        msg = str(cm.exception)
        self.assertIn("ERROR", msg)
        self.assertIn("styles.css", msg)


class StandaloneCase(BuildSiteCase):
    """Build a multi-page manifest, run cmd_standalone, return the emitted file."""

    def _author_pages(self):
        """Two fragments + a two-page manifest under self.out; return its path."""
        _write(os.path.join(self.out, "content", "components", "btn.html"),
               '<button class="btn">Go</button>')
        _write(os.path.join(self.out, "content", "pages", "login.html"),
               '<form class="login">Login</form>')
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest,
               '{"title":"DS","pages":['
               '{"path":"components/btn.html","fragment":"content/components/btn.html",'
               '"title":"Button","group":"Components","layout":"showcase"},'
               '{"path":"pages/login.html","fragment":"content/pages/login.html",'
               '"title":"Login","group":"Pages","layout":"centered"}]}')
        return manifest

    def _standalone(self, target, **over):
        """Run cmd_standalone for `target`; return the emitted single-file HTML."""
        manifest = over.pop("manifest", None) or self._author_pages()
        dest = over.pop("dest", os.path.join(self.out, "standalone.html"))
        ns = dict(design_system=self.ds, out=self.out, manifest=manifest,
                  target=target, dest=dest, page=None, mode="standalone")
        ns.update(over)
        build_site.cmd_standalone(build_site.argparse.Namespace(**ns))
        with open(dest, encoding="utf-8") as f:
            return f.read()


class StandalonePureCssTests(StandaloneCase):
    def test_pure_css_standalone_has_zero_external_or_relative_refs(self):
        self._make_target("pure-css", "styles.css",
                          ":root{--c:#fff;}\n.btn{color:red;}")
        html = self._standalone("pure-css")
        # the theme + chrome CSS + JS are inlined
        self.assertIn(".btn{color:red;}", html)
        self.assertIn(build_site.MOCKUP_JS.strip()[:40], html)
        self.assertIn(".mk-body", html)  # MOCKUP_CSS inlined
        # NO external requests anywhere
        self.assertNotIn("http://", html)
        self.assertNotIn("https://", html)
        # NO protocol-relative refs in any src/href/url()
        self.assertNotIn('src="//', html)
        self.assertNotIn('href="//', html)
        self.assertNotIn("url(//", html)
        # NO unresolved relative refs back into the (now absent) asset tree
        self.assertNotIn('href="assets/', html)
        self.assertNotIn('src="assets/', html)
        self.assertNotIn("../", html)
        # NO leftover <script src> / <link rel=stylesheet href> for assets
        self.assertNotIn("assets/preview.css", html)
        self.assertNotIn("assets/preview.js", html)


class StandaloneTailwindVendoredTests(StandaloneCase):
    def test_tailwind_vendored_inlines_the_vendored_js_no_cdn(self):
        self._make_target("tailwind", "theme.css", '@theme{--x:1;}')
        # A vendored browser build is present in the out/assets tree.
        _write(os.path.join(self.out, "assets", "tailwindcss-browser.js"),
               "/*VENDORED_TW_BUILD*/console.log('tw');")
        html = self._standalone("tailwind")
        # the vendored JS is inlined verbatim
        self.assertIn("/*VENDORED_TW_BUILD*/", html)
        # NO CDN <script src>
        self.assertNotIn(build_site.CDN_TAG, html)
        self.assertNotIn("@tailwindcss/browser", html)
        self.assertNotIn("https://", html)
        self.assertNotIn('script src="assets/', html)
        # the tailwindcss style block still carries the theme
        self.assertIn('<style type="text/tailwindcss">', html)
        self.assertIn('@theme{--x:1;}', html)


class StandaloneTailwindCdnOnlyTests(StandaloneCase):
    def test_tailwind_cdn_only_refuses_non_zero_with_guidance(self):
        self._make_target("tailwind", "theme.css", '@theme{--x:1;}')
        # NO vendored assets/tailwindcss-browser.js exists.
        dest = os.path.join(self.out, "standalone.html")
        with self.assertRaises(SystemExit) as cm:
            self._standalone("tailwind", dest=dest)
        code = cm.exception.code
        # non-zero exit (SystemExit carries a message string => truthy => non-zero)
        self.assertTrue(code not in (0, None), f"expected non-zero exit, got {code!r}")
        msg = str(cm.exception)
        self.assertIn("ERROR", msg)
        # guidance points at --vendor-tailwind or pure-css
        self.assertIn("vendor-tailwind", msg)
        self.assertIn("pure-css", msg)
        # NO CSP-violating page was emitted
        self.assertFalse(os.path.isfile(dest),
                         "no standalone file should be written on refusal")


class StandaloneExternalRefTests(StandaloneCase):
    def test_theme_with_url_http_ref_refuses_rather_than_emit(self):
        # A theme that fetches a webfont over https violates the artifact CSP.
        self._make_target(
            "pure-css", "styles.css",
            "@font-face{font-family:X;src:url(https://fonts.example/x.woff2);}")
        dest = os.path.join(self.out, "standalone.html")
        with self.assertRaises(SystemExit) as cm:
            self._standalone("pure-css", dest=dest)
        self.assertTrue(cm.exception.code not in (0, None))
        msg = str(cm.exception)
        self.assertIn("ERROR", msg)
        self.assertIn("external", msg.lower())
        self.assertFalse(os.path.isfile(dest),
                         "no page should be emitted when an external ref is present")

    def test_protocol_relative_ref_in_fragment_refuses(self):
        # A fragment with a protocol-relative // resource also refuses.
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        _write(os.path.join(self.out, "content", "components", "ext.html"),
               '<img src="//cdn.example/logo.png">')
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest,
               '{"title":"DS","pages":[{"path":"components/ext.html",'
               '"fragment":"content/components/ext.html","title":"Ext",'
               '"group":"Components","layout":"showcase"}]}')
        dest = os.path.join(self.out, "standalone.html")
        with self.assertRaises(SystemExit) as cm:
            self._standalone("pure-css", manifest=manifest, dest=dest)
        self.assertTrue(cm.exception.code not in (0, None))
        self.assertIn("external", str(cm.exception).lower())
        self.assertFalse(os.path.isfile(dest))

    def test_data_uri_and_anchor_refs_are_allowed(self):
        # data: URIs and bare #anchors are NOT external — must not refuse.
        self._make_target(
            "pure-css", "styles.css",
            ".i{background:url(data:image/png;base64,iVBOR);}")
        _write(os.path.join(self.out, "content", "components", "ok.html"),
               '<a href="#top">top</a><button class="btn">Go</button>')
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest,
               '{"title":"DS","pages":[{"path":"components/ok.html",'
               '"fragment":"content/components/ok.html","title":"Ok",'
               '"group":"Components","layout":"showcase"}]}')
        html = self._standalone("pure-css", manifest=manifest)
        self.assertIn("data:image/png", html)
        self.assertIn('href="#top"', html)


class StandaloneCompositionTests(StandaloneCase):
    def test_combined_showcase_stacks_pages_under_one_main_with_anchors_and_toc(self):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        html = self._standalone("pure-css")  # default: combined showcase
        # exactly ONE <main> wraps the whole showcase
        self.assertEqual(html.count("<main"), 1, "combined mode uses a single <main>")
        # both manifest pages' content is present
        self.assertIn('<button class="btn">Go</button>', html)
        self.assertIn('<form class="login">Login</form>', html)
        # a TOC with in-page anchors links to both generated section ids
        self.assertIn('href="#button"', html)
        self.assertIn('href="#login"', html)
        self.assertIn('id="button"', html)
        self.assertIn('id="login"', html)

    def test_single_named_page_emits_only_that_page(self):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        html = self._standalone("pure-css", page="components/btn.html")
        # only the named page's content is present
        self.assertIn('<button class="btn">Go</button>', html)
        self.assertNotIn('<form class="login">Login</form>', html)
        # no TOC / multi-section showcase chrome for a single named page
        self.assertNotIn('href="#login"', html)
        self.assertEqual(html.count("<main"), 1)

    def test_single_named_page_by_title_also_resolves(self):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        html = self._standalone("pure-css", page="Login")
        self.assertIn('<form class="login">Login</form>', html)
        self.assertNotIn('<button class="btn">Go</button>', html)

    def test_unknown_named_page_refuses(self):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        with self.assertRaises(SystemExit) as cm:
            self._standalone("pure-css", page="does/not/exist.html")
        self.assertIn("not found", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
