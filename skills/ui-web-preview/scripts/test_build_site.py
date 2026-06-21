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


if __name__ == "__main__":
    unittest.main()
