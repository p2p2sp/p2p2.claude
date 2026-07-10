#!/usr/bin/env python3
"""Contract tests for build_site.py.

Covers: per-target theme-injection branches (pure-css / tailwind / react-shadcn),
non-web-target refusal, theme-artifact resolution, manifest + fragment
prevalidation (all-or-nothing build), HTML-escaping of manifest title/group,
the anti-FOUC theme-boot snippet, the standalone single-file emit, and the
context-based external-reference detection (data: URI masking, fetching
contexts only).

Stdlib-only (unittest); also runs under pytest. Run from this directory:
    python -m unittest test_build_site
    python -m pytest test_build_site.py

Each end-to-end test builds a site into a temp dir for a given target and
asserts on the generated HTML, so behavior is verified by observable output
rather than by inspecting internals.
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


class ManifestValidationTests(BuildSiteCase):
    """A manifest page missing a required key must fail early with a clear
    message and write nothing (no partial site)."""

    def _run_build(self, manifest_json):
        _write(os.path.join(self.out, "content", "components", "btn.html"),
               '<button class="btn">Go</button>')
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest, manifest_json)
        args = build_site.argparse.Namespace(
            design_system=self.ds, out=self.out, manifest=manifest,
            target="pure-css", mode="build")
        build_site.cmd_build(args)

    def test_page_missing_title_exits_with_clear_message(self):
        with self.assertRaises(SystemExit) as cm:
            self._run_build(
                '{"title":"T","pages":[{"path":"components/btn.html",'
                '"fragment":"content/components/btn.html"}]}')
        msg = str(cm.exception)
        self.assertIn("missing required key", msg)
        self.assertIn("title", msg)

    def test_invalid_page_writes_nothing(self):
        # first page valid, second missing 'fragment' -> must abort before ANY
        # page is written (no partial site).
        with self.assertRaises(SystemExit):
            self._run_build(
                '{"title":"T","pages":['
                '{"path":"components/btn.html",'
                '"fragment":"content/components/btn.html","title":"Button"},'
                '{"path":"broken.html","title":"Broken"}]}')
        self.assertFalse(
            os.path.isfile(os.path.join(self.out, "components", "btn.html")))
        self.assertFalse(os.path.isfile(os.path.join(self.out, "index.html")))


class ExternalRefDetectionTests(unittest.TestCase):
    """find_external_refs is context-based: it flags http(s):// and //host only
    in fetching contexts, masks valid data: URIs first, and ignores plain text."""

    def test_data_uri_base64_payload_with_plus_slash_slash_is_allowed(self):
        # `ab+//cd` is a legal base64 run; the `//` after `+` must NOT match.
        css = ".i{background:url(data:image/png;base64,ab+//cd);}"
        self.assertEqual(build_site.find_external_refs(css), [])

    def test_data_uri_in_src_attribute_with_tricky_payload_is_allowed(self):
        html = '<img src="data:image/png;base64,ab+//cd==" alt="x">'
        self.assertEqual(build_site.find_external_refs(html), [])

    def test_img_src_https_is_rejected(self):
        refs = build_site.find_external_refs('<img src="https://cdn.example/x.png">')
        self.assertEqual(refs, ["https://cdn.example/x.png"])

    def test_plain_text_url_in_code_is_allowed(self):
        html = "<code>https://example.com</code> and prose http://x.test too"
        self.assertEqual(build_site.find_external_refs(html), [])

    def test_protocol_relative_src_is_rejected(self):
        self.assertTrue(
            build_site.find_external_refs('<img src="//cdn.example/logo.png">'))

    def test_css_url_https_is_rejected(self):
        self.assertTrue(build_site.find_external_refs(
            "@font-face{src:url(https://fonts.example/x.woff2);}"))

    def test_css_at_import_https_is_rejected(self):
        self.assertTrue(
            build_site.find_external_refs('@import "https://cdn.example/a.css";'))

    def test_js_fetch_and_dynamic_import_https_are_rejected(self):
        self.assertTrue(build_site.find_external_refs('fetch("https://api.example/x")'))
        self.assertTrue(build_site.find_external_refs("import('https://cdn.example/m.js')"))

    def test_srcset_with_external_candidate_is_rejected(self):
        html = '<img srcset="local.png 1x, https://cdn.example/x.png 2x">'
        self.assertEqual(build_site.find_external_refs(html),
                         ["https://cdn.example/x.png"])

    def test_srcset_with_only_local_and_data_candidates_is_allowed(self):
        html = '<img srcset="local.png 1x, data:image/png;base64,//aa 2x">'
        self.assertEqual(build_site.find_external_refs(html), [])

    def test_local_relative_refs_are_allowed(self):
        html = ('<a href="#top">t</a><img src="assets/x.png">'
                '<link href="assets/a.css">.b{background:url(../img/b.svg);}')
        self.assertEqual(build_site.find_external_refs(html), [])


class StandaloneDataUriEndToEndTests(StandaloneCase):
    def test_theme_and_fragment_with_tricky_data_uri_emit_successfully(self):
        # End-to-end: base64 payload `ab+//cd` in the theme AND a text URL in
        # <code> in a fragment must not refuse; a real external ref still does.
        self._make_target(
            "pure-css", "styles.css",
            ".i{background:url(data:image/png;base64,ab+//cd);}")
        _write(os.path.join(self.out, "content", "components", "ok.html"),
               '<code>https://example.com</code>'
               '<img src="data:image/png;base64,ab+//cd==">')
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest,
               '{"title":"DS","pages":[{"path":"components/ok.html",'
               '"fragment":"content/components/ok.html","title":"Ok",'
               '"group":"Components","layout":"showcase"}]}')
        html = self._standalone("pure-css", manifest=manifest)
        self.assertIn("data:image/png;base64,ab+//cd", html)
        self.assertIn("<code>https://example.com</code>", html)

    def test_fragment_with_img_src_https_still_refuses(self):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        _write(os.path.join(self.out, "content", "components", "bad.html"),
               '<img src="https://cdn.example/logo.png">')
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest,
               '{"title":"DS","pages":[{"path":"components/bad.html",'
               '"fragment":"content/components/bad.html","title":"Bad",'
               '"group":"Components","layout":"showcase"}]}')
        dest = os.path.join(self.out, "standalone.html")
        with self.assertRaises(SystemExit) as cm:
            self._standalone("pure-css", manifest=manifest, dest=dest)
        self.assertIn("external", str(cm.exception).lower())
        self.assertFalse(os.path.isfile(dest))


class FragmentPrevalidationTests(BuildSiteCase):
    """All fragment files are checked before ANY page is written — a missing
    fragment means a refusal with no partial site."""

    def test_missing_fragment_refuses_and_writes_nothing(self):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        # first fragment exists, second does not
        _write(os.path.join(self.out, "content", "components", "btn.html"),
               '<button class="btn">Go</button>')
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest,
               '{"title":"T","pages":['
               '{"path":"components/btn.html","fragment":"content/components/btn.html",'
               '"title":"Button","group":"Components"},'
               '{"path":"pages/gone.html","fragment":"content/pages/gone.html",'
               '"title":"Gone","group":"Pages"}]}')
        args = build_site.argparse.Namespace(
            design_system=self.ds, out=self.out, manifest=manifest,
            target="pure-css", mode="build")
        with self.assertRaises(SystemExit) as cm:
            build_site.cmd_build(args)
        msg = str(cm.exception)
        self.assertIn("fragment", msg.lower())
        self.assertIn("content/pages/gone.html", msg)
        # nothing was written: not even the valid first page, nor the index
        self.assertFalse(
            os.path.isfile(os.path.join(self.out, "components", "btn.html")))
        self.assertFalse(os.path.isfile(os.path.join(self.out, "index.html")))


class EscapingTests(BuildSiteCase):
    """Manifest title/group values are HTML-escaped wherever they land."""

    def _build_with_title(self, title, group):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        _write(os.path.join(self.out, "content", "components", "btn.html"),
               '<button class="btn">Go</button>')
        manifest = os.path.join(self.out, "manifest.json")
        _write(manifest, build_site.json.dumps({
            "title": "T <&> tle", "pages": [{
                "path": "components/btn.html",
                "fragment": "content/components/btn.html",
                "title": title, "group": group, "layout": "showcase"}]}))
        args = build_site.argparse.Namespace(
            design_system=self.ds, out=self.out, manifest=manifest,
            target="pure-css", mode="build")
        build_site.cmd_build(args)
        with open(os.path.join(self.out, "components", "btn.html"),
                  encoding="utf-8") as f:
            page = f.read()
        with open(os.path.join(self.out, "index.html"), encoding="utf-8") as f:
            index = f.read()
        return page, index

    def test_title_and_group_are_escaped_in_page_and_index(self):
        page, index = self._build_with_title(
            'B<script>"x"&</script>', 'G<em>&</em>')
        self.assertNotIn("B<script>", page)
        self.assertIn("B&lt;script&gt;", page)
        self.assertNotIn("B<script>", index)
        self.assertIn("B&lt;script&gt;", index)
        self.assertNotIn("G<em>", index)
        self.assertIn("G&lt;em&gt;", index)
        self.assertIn("T &lt;&amp;&gt; tle", index)


class ThemeBootTests(BuildSiteCase):
    """Every template's <head> carries the inline anti-FOUC theme-boot snippet."""

    def test_built_page_and_index_head_carry_theme_boot(self):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        html = self._build_one_page("pure-css")
        head = html.split("</head>")[0]
        self.assertIn(build_site.THEME_BOOT, head)
        with open(os.path.join(self.out, "index.html"), encoding="utf-8") as f:
            index_head = f.read().split("</head>")[0]
        self.assertIn(build_site.THEME_BOOT, index_head)

    def test_mk_toc_chrome_rule_exists(self):
        self.assertIn(".mk-toc", build_site.MOCKUP_CSS)


class StandaloneThemeBootTests(StandaloneCase):
    def test_standalone_head_carries_theme_boot(self):
        self._make_target("pure-css", "styles.css", ".btn{color:red;}")
        html = self._standalone("pure-css")
        self.assertIn(build_site.THEME_BOOT, html.split("</head>")[0])


if __name__ == "__main__":
    unittest.main()
