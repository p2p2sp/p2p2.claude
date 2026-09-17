---
paths:
  - "superdev/scripts/*.sh"
---

# Sourced shell libraries

- Name a sourced library `lib_<topic>.sh` - snake_case with a `lib_` prefix - while every executable script stays kebab-case: `lib_touched.sh`, `lib_label.sh`, `lib_find_excludes.sh` against `read-config.sh`, `commit-task.sh`, `stats-report.sh`.
- Source it relative to its own file, never relative to the caller's cwd: `source "$(dirname "${BASH_SOURCE[0]}")/lib_label.sh"` (`label.sh:35`). A skill-level script reaches the plugin-level library the same way: `source "$(dirname "${BASH_SOURCE[0]}")/../../../scripts/lib_find_excludes.sh"` (`superdev/skills/superdev-memory/scripts/detect_state.sh:11`).
- A `lib_` file sets no shell options at all. All three do this deliberately, so that a caller running `set -euo pipefail` (`commit-task.sh`) and one running `set -u` alone (`vibe-guard.sh`) are both safe; `lib_touched.sh:46-49` states it as part of its contract.
- Document every exported function in the library header, one entry per function, naming its stdout and what it does when its input is missing: `lib_touched.sh:14-41` covers `trim`, `normalise_path` and `touched_paths`, including "a notes file that does not exist prints nothing and returns 0".
- Extract a library when two scripts would otherwise carry the same parsing rule: `lib_touched.sh` exists because `commit-task.sh` (which STAGES the declared paths) and `vibe-guard.sh` (which MEASURES them) had drifted apart with no test binding them together.
- This naming applies to `superdev/scripts/` only. `supergh/skills/commit/` does not follow it: `commit-context.sh` and `commit.sh` both source `commit-args.sh`, which carries no `lib_` prefix and is itself 100755.
