# viber/scripts - plugin-wide bundled scripts

Each script's header `Contract:` is its interface; this node carries only what spans scripts.

## Contracts between scripts

- `config.sh` is the one parser of `viber.yml`, and its output lines are parsed in turn:
  `switch-text.sh` greps `^<key>: ` (a dotted key like `build.memory`) out of the block,
  `run-branch.sh` reads `config.sh --branching`, `hooks/scripts/plan-gate.sh` runs
  `../../scripts/config.sh` for `planning.plain-plan-review`, and `issue-templates.sh` and
  `pr-facts.sh` read `github.issue-title` / `github.pr-title` from it. A change to a line's shape
  or a key's spelling reaches every reader.
- Sibling calls resolve from the calling script's own directory (`dirname "${BASH_SOURCE[0]}"`)
  through an explicit interpreter (`bash config.sh`, `sh issue-facts.sh`), so they need no exec
  bit and no pre-approval, but moving a script out of `scripts/` breaks them and
  `plan-gate.sh`'s relative path.
- `run-branch.sh` is a library, never executed: `plan-path.sh` alone sources it, it is tracked
  `100644` and has no `set` line, so every function runs under `plan-path.sh`'s
  `set -euo pipefail` (a failure-prone read ends in `|| true`). Its setup functions return
  through `br_*` globals, not stdout. It has no test file of its own:
  `tests/viber/plan-path.test.ts` exercises it through `--land`, `--branch`, `--start` and
  `--checkout`.
- `status.md` has one writer (`commit-task.sh`) and three readers that parse its keys
  independently: `plan-index.sh` (every key), `plan-path.sh` (`done:`/`skipped:`, for `open:`
  lines and settled runs) and `archive-run.sh` (`done:`/`skipped:`, its unfinished-run gate). Each
  takes the task set from the plan's `<!-- TASK -->` blocks. A key or format change touches all
  four.
- The run-directory exclusion of `plan-index.sh`'s `orphan:` line and `commit-task.sh`'s
  unclaimed-paths warning both derive the run dir from the repo-relative plan path
  `plan-path.sh` prints (`commit-task.sh`'s `run_dir()`): callers pass that path unchanged.
- `commit-task.sh` never hands a plan `Files:` list to one git call: a command line past 32767
  chars fails on Windows ("Argument list too long", exit 5), so every git call over a path list
  goes through `git_paths` (chunks of at most 24000 path chars; its status is the first failing
  chunk's, so `diff --quiet` still reads over the whole list) and staging through `stage_paths`
  (a few git processes per chunk, never per path; a failed batch falls back to `stage_path` over
  the whole list). Trail files and `rulings.md` still stage with `stage_path`. `commit.sh`'s paths
  mode keeps single git calls: its paths are its own argv, already bounded.

## Shells

- `issue-facts.sh`, `post-comment.sh`, `issue-templates.sh`, `issue-create.sh`, `pr-facts.sh` and
  `pr-create.sh` are POSIX `#!/bin/sh`: no arrays, no `[[`, no `local`, no `< <(...)` process
  substitution (`issue-templates.sh` loops over a `mktemp` file instead), no awk `function`, and
  `run-branch.sh` invokes `issue-facts.sh` through `sh`. A POSIX script locates `config.sh` through
  `dirname -- "$0"` (no `BASH_SOURCE`) and runs it through `bash`, so `issue-templates.sh` falls
  back to the default title pattern when bash or the file is missing.
  Every other script is bash and must also run on macOS's bash 3.2.
