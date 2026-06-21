---
paths:
  - "skills/**/scripts/*.py"
---
# Skill Helper Scripts — Conventions

- When intersecting two glob sets, match symmetrically (`fnmatch(c, g) or fnmatch(g, c)`): either side (a `source:` glob or a `## Touches` entry) may itself be a glob, so neither can be assumed to be a concrete literal path.
