#!/usr/bin/env python3
"""Unit tests for audit-docs.py — the doc↔diff fact computer.

Stdlib-only (unittest). Run from this directory:
    python -m unittest test_audit_docs
or discover:
    python -m unittest discover -s . -p 'test_*.py'

Each test scaffolds a fake `.superdev/documentation/` tree + a
`.temp/.workflows/<slug>/tasks/` set into a temp dir, runs the fact computer
against that root, and asserts on the emitted facts text — so every decision
branch is verified by its observable output rather than by inspecting internals.
The script computes FACTS only (it never emits PASS/FAIL); the tests assert the
facts table / markers, never a verdict.
"""
import importlib.util
import os
import tempfile
import unittest

# audit-docs.py is not an importable module name (hyphen); load it by path.
_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "audit_docs", os.path.join(_HERE, "audit-docs.py"))
audit_docs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(audit_docs)


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


class AuditDocsCase(unittest.TestCase):
    """Base: scaffold an empty root, plus helpers to author docs + task files."""

    SLUG = "demo-slug"

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def _doc(self, rel, feature, source=None, body=""):
        """Author a feature doc under `.superdev/documentation/<rel>` with
        `feature:` + optional `source:` frontmatter. `source` may be a single
        glob string or a list of globs."""
        fm = [f"feature: {feature}"]
        if isinstance(source, (list, tuple)):
            fm.append("source:")
            for g in source:
                fm.append(f"  - {g}")
        elif source is not None:
            fm.append(f"source: {source}")
        text = "---\n" + "\n".join(fm) + "\n---\n" + body
        _write(os.path.join(self.root, ".superdev", "documentation", rel), text)

    def _index(self, body="# Documentation index\n"):
        _write(os.path.join(self.root, ".superdev", "documentation",
                            "index.md"), body)

    def _task(self, n, touches):
        """Author `.temp/.workflows/<slug>/tasks/<n>.md` whose ## Touches lists
        each (glob, role) entry in `touches`."""
        lines = [f"# task {n}", "", "## Touches", ""]
        for glob, role in touches:
            lines.append(f"- `{glob}` — {role}")
        lines += ["", "## Tests", "- none"]
        _write(os.path.join(self.root, ".temp", ".workflows", self.SLUG,
                            "tasks", f"{n}.md"), "\n".join(lines) + "\n")

    def _run(self):
        """Run the fact computer against the scaffolded root; return stdout text."""
        return audit_docs.run(self.SLUG, root=self.root)


class BootstrapBranchTests(AuditDocsCase):
    def test_missing_index_prints_bootstrap_none_and_no_table(self):
        # branch (a): no .superdev/documentation/index.md exists at all.
        self._task(1, [("skills/foo/**", "production")])
        out = self._run()
        self.assertIn("bootstrap: none", out)
        # no facts table is emitted when there is no documentation layer
        self.assertNotIn("source∩diff?", out)


class SourceTouchedDocTouchedTests(AuditDocsCase):
    def test_source_intersects_and_doc_in_set_reports_yes_yes(self):
        # branch (b): a doc whose source: glob hits a changed path AND whose own
        # doc file is also in the changed set → row yes / yes.
        self._index()
        self._doc("dev/foo.md", "Foo", source="skills/foo/**")
        # task touches both the production source AND the doc file itself
        self._task(1, [
            ("skills/foo/bar.py", "production"),
            (".superdev/documentation/dev/foo.md", "docs"),
        ])
        out = self._run()
        # the feature appears as a facts row reporting both intersections
        self.assertIn("dev/foo.md", out)
        self.assertRegex(out, r"source∩diff\?\s*yes")
        self.assertRegex(out, r"doc-in-diff\?\s*yes")


class SourceTouchedDocUntouchedTests(AuditDocsCase):
    def test_source_intersects_but_doc_not_in_set_reports_yes_no(self):
        # branch (c), the CRITICAL fact: source glob hits a changed path but the
        # doc file itself was NOT touched → row yes / no.
        self._index()
        self._doc("dev/foo.md", "Foo", source="skills/foo/**")
        # task touches the production source but NOT the doc file
        self._task(1, [("skills/foo/bar.py", "production")])
        out = self._run()
        self.assertIn("dev/foo.md", out)
        self.assertRegex(out, r"source∩diff\?\s*yes")
        self.assertRegex(out, r"doc-in-diff\?\s*no")


class NoIntersectionTests(AuditDocsCase):
    def test_source_does_not_intersect_reports_no(self):
        # branch (d): the doc's source glob names a subtree the diff never
        # touched → row source∩diff? no.
        self._index()
        self._doc("dev/bar.md", "Bar", source="skills/bar/**")
        # task touches an unrelated subtree
        self._task(1, [("skills/foo/bar.py", "production")])
        out = self._run()
        self.assertIn("dev/bar.md", out)
        # the row for this feature must report no intersection
        row = next(ln for ln in out.splitlines() if "dev/bar.md" in ln)
        self.assertIn("source∩diff? no", row)


class NoSourceGlobGapTests(AuditDocsCase):
    def test_doc_without_source_is_a_gap_not_a_critical_row(self):
        # branch (e): a doc carrying no source: glob is surfaced in gaps:, never
        # as a source∩diff?/doc-in-diff? row (it cannot be guarded → never
        # CRITICAL).
        self._index()
        self._doc("dev/loose.md", "Loose", source=None)
        self._task(1, [("skills/foo/bar.py", "production")])
        out = self._run()
        gaps_line = next(ln for ln in out.splitlines() if ln.startswith("gaps:"))
        self.assertIn("dev/loose.md", gaps_line)
        # the loose doc must NOT appear as a facts row (only on the gaps: line)
        non_gap = [ln for ln in out.splitlines()
                   if "dev/loose.md" in ln and not ln.startswith("gaps:")]
        self.assertEqual(non_gap, [],
                         "a source-less doc must not produce a facts row")


class MultipleSourceGlobsTests(AuditDocsCase):
    def test_one_of_several_source_globs_matching_counts_as_intersection(self):
        # branch (f): a doc carries TWO source: globs (YAML list form); only the
        # second one matches a changed path → the row still reports yes.
        self._index()
        self._doc("dev/multi.md", "Multi",
                  source=["skills/unrelated/**", "skills/foo/**"])
        self._task(1, [("skills/foo/bar.py", "production")])
        out = self._run()
        row = next(ln for ln in out.splitlines() if "dev/multi.md" in ln)
        self.assertIn("source∩diff? yes", row)


class FnmatchGlobSemanticsTests(AuditDocsCase):
    def test_star_star_glob_matches_deep_path_via_fnmatch(self):
        # branch (g): a `**` glob in source: is matched with fnmatch semantics —
        # the greedy `*` spans `/`, so `skills/dev-*/**` matches a deeply nested
        # changed path.
        self._index()
        self._doc("dev/deep.md", "Deep", source="skills/dev-*/**")
        self._task(1, [("skills/dev-coder/references/mode-tdd.md", "production")])
        out = self._run()
        row = next(ln for ln in out.splitlines() if "dev/deep.md" in ln)
        self.assertIn("source∩diff? yes", row)

    def test_non_matching_star_star_glob_reports_no_via_fnmatch(self):
        # fnmatch semantics also correctly EXCLUDE a `**` glob whose prefix does
        # not match the changed path's prefix.
        self._index()
        self._doc("dev/deep.md", "Deep", source="skills/ui-*/**")
        self._task(1, [("skills/dev-coder/references/mode-tdd.md", "production")])
        out = self._run()
        row = next(ln for ln in out.splitlines() if "dev/deep.md" in ln)
        self.assertIn("source∩diff? no", row)


if __name__ == "__main__":
    unittest.main()
