---
paths:
  - "superdev/scripts/*.sh"
  - "viber/scripts/*.sh"
---

# Sourced shell libraries

- Name a sourced library `lib_<topic>.sh` - snake_case with a `lib_` prefix - while every executable script stays kebab-case: `lib_touched.sh`, `lib_find_excludes.sh` against `read-config.sh`, `commit-task.sh`, `stats-report.sh`.
- Source it relative to its own file, never relative to the caller's cwd: `source "$(dirname "${BASH_SOURCE[0]}")/../../../scripts/lib_find_excludes.sh"` (`superdev/skills/superdev-memory/scripts/detect_state.sh:11`) - a skill-level script reaches the plugin-level library exactly the same way a plugin-level one reaches its sibling.
- A `lib_` file sets no shell options at all. Both do this deliberately, so that a caller running `set -euo pipefail` (`commit-task.sh`) and one running `set -u` alone are both safe; `lib_touched.sh`'s closing `note` states it as part of its contract.
- Document every exported function in the library header, one entry per function, naming its stdout and what it does when its input is missing: `lib_touched.sh:11-38` covers `trim`, `normalise_path` and `touched_paths`, including "a notes file that does not exist prints nothing and returns 0".
- Extract a library when a parsing rule needs one home and a test of its own, or when a second script would otherwise start from a private copy of it: `lib_touched.sh` owns the `touched:` cut rule, the path normalisation and the trim that `commit-task.sh` stages by, and `tests/superdev/lib_touched.test.ts` also asserts that script carries no copy of the three pieces.
- This naming applies to `superdev/scripts/` only. `supergh/skills/commit/` does not follow it: `commit-context.sh` and `commit.sh` both source `commit-args.sh`, which carries no `lib_` prefix and is itself 100755.
- `viber/scripts/` has no sourced library at all: its six scripts share no code, each resolving the repository root and parsing the plan on its own. The duplication is bounded and deliberate - the first extraction that becomes worth it takes the `lib_<topic>.sh` shape above, with a test file of its own.
