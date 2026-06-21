#!/usr/bin/env python3
"""Compute the doc↔diff intersection FACTS the mem-guardian fork keys on.

Stdlib only (fnmatch, glob, os, re, sys). Input: a single `<slug>` argument.

This script computes FACTS, never the PASS/FAIL verdict — the mem-guardian fork
keeps its decision-table policy (Step 4/5 of its SKILL.md). It reads:

  .superdev/documentation/index.md        the feature registry (presence gate)
  .superdev/documentation/**/*.md         each feature doc's feature: + source:
  .temp/.workflows/<slug>/tasks/*.md      every task's ## Touches globs

and emits a deterministic facts table to stdout, one row per documented feature:

  feature | source-glob | source∩diff? | doc-in-diff?

plus a `gaps:` list (docs carrying no source: glob). The changed-file set is the
UNION of every `## Touches` glob across the slug's task files — NOT a git range,
so no `git` is invoked. When `.superdev/documentation/index.md` is missing, the
documentation layer is not bootstrapped: the script prints a single

  bootstrap: none

marker and emits no table (the fork PASSes-with-note).
"""
import fnmatch
import glob
import os
import re
import sys

DOC_REL = os.path.join(".superdev", "documentation")

# `feature: <name>` on its own frontmatter line.
_FEATURE_RE = re.compile(r"^feature:\s*(.+?)\s*$", re.MULTILINE)
# `source: <glob>` inline scalar (captures empty for the list form).
_SOURCE_INLINE_RE = re.compile(r"^source:\s*(.*?)\s*$", re.MULTILINE)
# `- <glob>` list items that follow a bare `source:` line.
_LIST_ITEM_RE = re.compile(r"^\s*-\s*(.+?)\s*$")
# A `## Touches` bullet: `- `glob` — role` (backticks + em-dash optional).
_TOUCHES_ITEM_RE = re.compile(r"^\s*-\s*`?([^`\s]+)`?")


def _frontmatter(text):
    """Return the YAML-ish frontmatter block (between the first two `---`), or
    the whole text when no fenced frontmatter is present."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    return m.group(1) if m else text


def parse_doc(text):
    """Extract (feature, source_globs) from a feature doc's frontmatter.

    `feature` is the `feature:` value or None. `source_globs` is the list of
    every `source:` glob — supports both the inline scalar (`source: a/**`) and
    the YAML list form (`source:` then `- a/**` / `- b/**`). Returns an empty
    list when the doc carries no source: glob (a gap)."""
    fm = _frontmatter(text)
    fm_lines = fm.splitlines()
    fmatch = _FEATURE_RE.search(fm)
    feature = fmatch.group(1) if fmatch else None
    globs = []
    for i, line in enumerate(fm_lines):
        sm = _SOURCE_INLINE_RE.match(line)
        if not sm:
            continue
        inline = sm.group(1).strip()
        if inline:
            globs.append(inline)
        else:
            # list form: consume the following `-` items
            for follow in fm_lines[i + 1:]:
                im = _LIST_ITEM_RE.match(follow)
                if im is None:
                    break
                globs.append(im.group(1).strip().strip("'\""))
        break
    return feature, [g.strip().strip("'\"") for g in globs if g]


def changed_set(tasks_dir):
    """Union of every `## Touches` glob across `<tasks_dir>/*.md`.

    Only the bullets under a `## Touches` heading are read (up to the next
    `##` heading); the changed-file set is those globs/paths, normalized to
    forward slashes. No git is invoked."""
    changed = set()
    for task_file in sorted(glob.glob(os.path.join(tasks_dir, "*.md"))):
        with open(task_file, encoding="utf-8") as f:
            lines = f.read().splitlines()
        in_touches = False
        for line in lines:
            if line.startswith("##"):
                in_touches = line.strip().lower().startswith("## touches")
                continue
            if not in_touches:
                continue
            im = _TOUCHES_ITEM_RE.match(line)
            if im:
                changed.add(im.group(1).strip().replace("\\", "/"))
    return changed


def _intersects(glob_pat, changed):
    """True when `glob_pat` intersects the changed-file set. A glob intersects
    when it fnmatch-matches any changed entry, OR a changed entry (itself a
    glob) fnmatch-matches the glob's literal prefix — so two globs that name the
    same subtree intersect symmetrically."""
    g = glob_pat.replace("\\", "/")
    for c in changed:
        if fnmatch.fnmatch(c, g) or fnmatch.fnmatch(g, c):
            return True
    return False


def _doc_in_set(doc_repo_path, changed):
    """True when the doc file itself is in the changed-file set (a changed entry
    equals or fnmatch-matches the doc's repo-relative path)."""
    d = doc_repo_path.replace("\\", "/")
    for c in changed:
        if c == d or fnmatch.fnmatch(d, c) or fnmatch.fnmatch(c, d):
            return True
    return False


def compute_facts(root, slug):
    """Compute the structured facts for `slug` under `root`.

    Returns (rows, gaps): `rows` is a list of dicts with keys
    feature / doc / source / source_hit / doc_hit for every doc carrying a
    `source:` glob; `gaps` is a list of `<doc>` paths for docs with no
    `source:` glob. The PASS/FAIL verdict is NOT computed here."""
    doc_root = os.path.join(root, DOC_REL)
    tasks_dir = os.path.join(root, ".temp", ".workflows", slug, "tasks")
    changed = changed_set(tasks_dir)

    rows, gaps = [], []
    pattern = os.path.join(doc_root, "**", "*.md")
    for path in sorted(glob.glob(pattern, recursive=True)):
        rel = os.path.relpath(path, doc_root).replace("\\", "/")
        if rel == "index.md":
            continue
        with open(path, encoding="utf-8") as f:
            feature, globs = parse_doc(f.read())
        if not globs:
            gaps.append(rel)
            continue
        repo_path = os.path.join(DOC_REL, rel).replace("\\", "/")
        source_hit = any(_intersects(g, changed) for g in globs)
        doc_hit = _doc_in_set(repo_path, changed)
        rows.append({
            "feature": feature or rel,
            "doc": rel,
            "source": " ".join(globs),
            "source_hit": source_hit,
            "doc_hit": doc_hit,
        })
    return rows, gaps


def render(rows, gaps):
    """Render the deterministic facts text from compute_facts() output."""
    out = ["feature | source-glob | source∩diff? | doc-in-diff?"]
    for r in rows:
        out.append(
            f"{r['feature']} ({r['doc']}) | {r['source']} | "
            f"source∩diff? {'yes' if r['source_hit'] else 'no'} | "
            f"doc-in-diff? {'yes' if r['doc_hit'] else 'no'}")
    out.append("gaps: " + (", ".join(gaps) if gaps else "none"))
    return "\n".join(out)


def run(slug, root="."):
    """Compute the facts text for `slug` against the tree rooted at `root`.

    Returns the multi-line facts string (the same text main() prints). When the
    documentation index is absent, the returned text is the single-line
    `bootstrap: none` marker and carries no facts table.
    """
    doc_root = os.path.join(root, DOC_REL)
    index = os.path.join(doc_root, "index.md")
    if not os.path.isfile(index):
        return "bootstrap: none"
    rows, gaps = compute_facts(root, slug)
    return render(rows, gaps)


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1:
        sys.exit("usage: audit-docs.py <slug>")
    sys.stdout.write(run(argv[0]) + "\n")


if __name__ == "__main__":
    main()
