#!/usr/bin/env bash
#
# cleanup-run.sh - removes a finished build's working files (workdir + spec +
# intent) and commits the removal.
#
# It exists so the last step of a build is one deterministic call instead of a
# hand-written `git rm` the orchestrator would have to compose from the run's
# paths - a composition that silently deleted the wrong tree whenever the run
# was a phase rather than a flat run.
#
# Inside a git repository the script moves to the repository root before it
# resolves anything, exactly as decompose.sh and commit-task.sh do, so a
# session started in a subdirectory cleans up the same run as one started at
# the root. The `workdir:` value decompose.sh prints is repository-relative and
# is passed verbatim, which is what makes that move a precondition rather than
# a convenience. Outside a repository the cwd stays put and paths resolve
# against it, as before.
#
# Contract:
#   argv   : $1 workdir (REQUIRED) - the run's working directory exactly as
#            decompose.sh printed it on its "workdir: ..." line, i.e. relative
#            to the repository root and under docs/.workflows/. The safety gate
#            below rejects EVERY path outside docs/.workflows/, an absolute one
#            included: that is not a typo to fix up, it is the signal that the
#            caller is outside this script's contract.
#            $2 commit-prefix (optional, default "simplebuild") - the prefix of
#            the cleanup commit's message, e.g. "superbuild".
#   cwd    : any directory inside the host repository - the script moves to the
#            repository root itself. Outside a repository the cwd is the base
#            every path resolves against and is left untouched.
#   env    : none.
#   stdout : ALWAYS exactly one line, and never anything else - all git noise
#            goes to stderr:
#              CLEANUP: <workdir> (removed)
#              CLEANUP: <workdir> (removed - nothing to commit)
#              CLEANUP: <workdir> (removed - no git repository)
#              CLEANUP: <workdir> (skipped - not a superdev run dir)
#              CLEANUP: <workdir> (skipped - build not complete: task <last> of <highest>)
#            plus the four `- last phase, run root removed` variants below.
#            <workdir> is the NORMALIZED value (no trailing "/", no leading
#            "./"), normalized before the gate and before any print.
#   exit   : 0 in every case the script reaches its own logic, skips included -
#            a skip is a value, never an error. 1 only on a missing workdir
#            parameter or a workdir that does not exist, both with a usage line
#            on stderr and nothing removed.
#
# What it does:
#   - normalizes workdir (strips a leading "./" and a trailing "/") BEFORE the
#     safety gate and before any write to stdout
#   - safety gate: the normalized path must start with "docs/.workflows/" and
#     hold a status.md; otherwise "CLEANUP: <workdir> (skipped - not a superdev
#     run dir)", exit 0, directory untouched
#   - completeness check: `last` from the "task: NN" line in status.md
#     (unparsable -> "00"), `highest` = the highest NN among tasks/task-NN.md
#     (no such file -> "00"); when last != highest or highest == "00" nothing
#     is removed: "CLEANUP: <workdir> (skipped - build not complete: task
#     <last> of <highest>)", exit 0
#   - reads the first "Spec:" line and the first "Intent:" line from
#     plan-header.md (trimmed, trailing HTML comment dropped); a file counts
#     only when the value is non-empty AND the file exists
#   - outside a git repository (git rev-parse --git-dir fails): rm -rf workdir,
#     rm -f the resolved files, "CLEANUP: <workdir> (removed - no git
#     repository)", exit 0
#   - inside a git repository: for workdir + spec + intent -> `git rm -r -f -q
#     --ignore-unmatch -- <target>` (drops the target from the index and the
#     working tree, even when it carries local modifications - it goes anyway,
#     the content is recoverable from HEAD) followed by `rm -rf <target>`
#     (clears untracked leftovers); nothing staged -> "CLEANUP: <workdir>
#     (removed - nothing to commit)"; otherwise `git commit -q -m
#     "chore(<prefix>): clean up run <slug>"` (slug = the workdir's basename
#     without a leading "YYYY-MM-DD-") and "CLEANUP: <workdir> (removed)"
#   - a run phase (a workdir whose parent directory is named "phases"): only
#     that phase's directory is removed and the commit slug is "<run directory
#     name without the leading YYYY-MM-DD->-<phase directory name>" (e.g.
#     "phases-skill-01-layout"); when no subdirectory is left under "phases/"
#     after the removal (loose files do not count), the same commit also
#     removes the run root (the directory holding intent.md and phases.md)
#     together with "phases/", and the CLEANUP line takes the variant "CLEANUP:
#     <workdir> (removed - last phase, run root removed)" - respectively
#     "(removed - last phase, run root removed - nothing to commit)" and
#     "(removed - last phase, run root removed - no git repository)" in the two
#     other branches. A flat run (any parent other than "phases") keeps the
#     slug and the messages described above.
#
set -euo pipefail

raw_workdir="${1:-}"
prefix="${2:-simplebuild}"

if [[ -z "$raw_workdir" ]]; then
  echo "error: missing required parameter 'workdir'" >&2
  echo "usage: cleanup-run.sh <workdir> [commit-prefix]" >&2
  exit 1
fi

# The workdir argument is repository-relative, so resolve it against the
# repository root, never against the caller's cwd - decompose.sh and
# commit-task.sh make the same move. Outside a repository the cwd stays put.
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$repo_root" && -d "$repo_root" ]]; then
  CDPATH= cd -- "$repo_root"
fi

# normalization: strip a trailing "/" and a leading "./"
dir="${raw_workdir%/}"
[[ "$dir" == ./* ]] && dir="${dir#./}"

if [[ ! -d "$dir" ]]; then
  echo "error: workdir not found: $dir" >&2
  echo "usage: cleanup-run.sh <workdir> [commit-prefix]" >&2
  exit 1
fi

# --- safety gate: only a real superdev working directory ---
if [[ "$dir" != docs/.workflows/* || ! -f "$dir/status.md" ]]; then
  echo "CLEANUP: $dir (skipped - not a superdev run dir)"
  exit 0
fi

# --- completeness check ---
last="00"
parsed="$(sed -n 's/^task:[[:space:]]*\([0-9]\{1,\}\).*$/\1/p' "$dir/status.md" | head -n1)"
[[ -n "$parsed" ]] && last="$parsed"

highest="00"
for f in "$dir"/tasks/task-*.md; do
  [[ -e "$f" ]] || continue
  n="$(basename "$f" | sed -n 's/^task-\([0-9]\{1,\}\)\.md$/\1/p')"
  [[ -z "$n" ]] && continue
  if (( 10#$n > 10#$highest )); then
    highest="$n"
  fi
done

if [[ "$highest" == "00" || "$((10#$last))" -ne "$((10#$highest))" ]]; then
  echo "CLEANUP: $dir (skipped - build not complete: task $last of $highest)"
  exit 0
fi

# --- extra files from plan-header.md (Spec: / Intent:) ---
plan_header="$dir/plan-header.md"
spec=""
intent=""
if [[ -f "$plan_header" ]]; then
  spec_line="$(grep -m1 '^Spec:' "$plan_header" || true)"
  spec="$(printf '%s' "${spec_line#Spec:}" | sed -e 's/[[:space:]]*<!--.*-->[[:space:]]*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  intent_line="$(grep -m1 '^Intent:' "$plan_header" || true)"
  intent="$(printf '%s' "${intent_line#Intent:}" | sed -e 's/[[:space:]]*<!--.*-->[[:space:]]*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
fi
[[ -n "$spec" && -f "$spec" ]] || spec=""
[[ -n "$intent" && -f "$intent" ]] || intent=""

# --- run-phase detection (the parent directory is named "phases") ---
parent="$(dirname -- "$dir")"
is_phase=0
root=""
if [[ "$(basename -- "$parent")" == "phases" ]]; then
  is_phase=1
  root="$(dirname -- "$parent")"
  slug="$(basename -- "$root" | sed -e 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')-$(basename -- "$dir")"
else
  slug="$(basename -- "$dir" | sed -e 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')"
fi

# returns 0 when the given "phases/" directory holds no subdirectory any
# more (loose files do not block removing the run root)
phases_empty() {
  local p
  for p in "$1"/*/; do
    [[ -d "$p" ]] && return 1
  done
  return 0
}

root_removed=0

# --- removal ---
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  rm -rf "$dir"
  [[ -n "$spec" ]] && rm -f "$spec"
  [[ -n "$intent" ]] && rm -f "$intent"
  if (( is_phase )) && phases_empty "$parent"; then
    rm -rf "$root"
    root_removed=1
  fi
  if (( root_removed )); then
    echo "CLEANUP: $dir (removed - last phase, run root removed - no git repository)"
  else
    echo "CLEANUP: $dir (removed - no git repository)"
  fi
  exit 0
fi

targets=("$dir")
[[ -n "$spec" ]] && targets+=("$spec")
[[ -n "$intent" ]] && targets+=("$intent")

for t in "${targets[@]}"; do
  git rm -r -f -q --ignore-unmatch -- "$t" >&2
  rm -rf "$t"
done

if (( is_phase )) && phases_empty "$parent"; then
  git rm -r -f -q --ignore-unmatch -- "$root" >&2
  rm -rf "$root"
  root_removed=1
fi

suffix=""
(( root_removed )) && suffix=" - last phase, run root removed"

if git diff --cached --quiet; then
  echo "CLEANUP: $dir (removed$suffix - nothing to commit)"
else
  git commit -q -m "chore($prefix): clean up run $slug" >&2
  echo "CLEANUP: $dir (removed$suffix)"
fi
