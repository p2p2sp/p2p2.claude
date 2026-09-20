#!/usr/bin/env bash
#
# commit-task.sh - commits one finished plan task and records it in the plan.
#
# Usage:
#   commit-task.sh <plan-file> <task-id>
#   commit-task.sh <plan-file> <task-id> <fix-number> <file> [<file>...]
#   commit-task.sh --repair <plan-file> <round> <file> [<file>...]
#   commit-task.sh --chore <file> [<file>...]
#   commit-task.sh --qa <file> [<file>...]
#   commit-task.sh --e2e <file> [<file>...]
#
# The two positional forms take the commit subject from the task's own heading
# line ("### T1 - <title>") in the plan, so the plan's title is literally what
# lands in the history and no caller ever composes or paraphrases it.
#
# Two arguments commit the task itself, subject "T1 - <title>", staging ONLY the
# paths on that task's "Files:" line - parallel tasks cannot pull each other's
# work into a commit.
#
# A fix number commits a repair of that task after it was already committed (a
# post-test fix), subject "T1(2) - <title>", staging only the files the caller
# names and leaving the plan's progress counter alone.
#
# --repair commits a post-test fix that lands OUTSIDE the plan's file map - a
# regression in a file no task's "Files:" line names, so there is no task id to
# attribute it to. It takes the plan for its Refs footer only, leaves progress
# alone, and its subject is DERIVED ("fix(viber): post-test repair (round 2)"),
# so no caller borrows another task's heading to get the fix committed.
#
# --chore commits the knowledge files a build's close produced - the project
# memory and rule files. It takes no plan and no task id, because no task owns
# those files, and its subject is DERIVED from the paths (a CLAUDE.md -> memory,
# a .claude/rules/ file -> rules, both -> both), so the caller never composes a
# commit subject here either.
#
# --qa commits the QA documents a build's close produced, and --e2e the
# Playwright specs a later e2e pass generated plus the handoff file it updated.
# Both take no plan and no task id for the same reason --chore does not, and
# both carry a FIXED derived subject ("docs(viber): qa scenarios",
# "test(viber): e2e specs") - no form of this script ever takes a subject from
# its caller.
#
# No form ever stages a path the caller did not name, and every form commits
# through its own pathspec, so a path staged before or beside the run stays in
# the index instead of riding along. A ".temp/" entry is refused outright, so
# machine state and anything written outside the file map stay uncommitted and
# visible.
#
# A plain task commit appends the task id to the <!-- done: ... --> marker and recomputes the
# "## Tasks (x/N)" header, so the plan carries its own progress and a build resumes
# after a context reset without a separate state file. The marker has to ride IN
# the commit, so it is written first and rolled back from a backup if staging or
# committing fails: a plan claiming a task is done that was never committed would
# be skipped forever on resume. Either the commit exists and the marker is set, or
# neither is.
#
# stdout: "committed: <sha>" and "progress: x/N" ("unchanged" for a fix) - plus,
#         for every flag form, the derived "subject: <line>"
# stderr: a warning listing changed paths no task in the plan claims
#
# exit != 0:
#   2 - bad arguments / missing plan
#   3 - no task with that id in the plan
#   4 - the named files produced no change to the working tree
#   5 - staging or committing failed; the plan is restored, nothing is recorded
#       (the named files stay staged, so the call can be retried as is)
#
set -euo pipefail

usage() {
  echo "error: usage: commit-task.sh <plan-file> <task-id> [<fix-number> <file> [<file>...]] | --repair <plan-file> <round> <file> [<file>...] | --chore <file> [<file>...] | --qa <file> [<file>...] | --e2e <file> [<file>...]" >&2
  exit 2
}

# Every path the plan's tasks claim, one per line - the whole map, not this
# task's slice.
plan_files() {
  awk '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
/<!--[[:space:]]*TASK[[:space:]]*-->/   { intask = 1; next }
/<!--[[:space:]]*\/TASK[[:space:]]*-->/ { intask = 0; next }
intask && /^-[[:space:]]*Files:/ {
  s = $0; sub(/^[^:]*:/, "", s)
  m = split(s, fl, /,/)
  for (k = 1; k <= m; k++) if (trim(fl[k]) != "") print trim(fl[k])
}
' "$1"
}

# Scoped to what the plan does NOT claim: at the widest dispatch the tree always
# holds other tasks' work in progress, so an unscoped status would fire on every
# commit and mean nothing. What survives the subtraction is the one thing the
# caller acts on - a change no task accounted for.
#   --porcelain  paths from the repo root whatever the cwd ("--short" honours
#                status.relativePaths and would stop matching "Files:")
#   -u all       an untracked directory listed file by file, never collapsed to
#                "dir/", which no "Files:" entry could match
#   -z           no C-quoting, so a non-ASCII path still compares
warn_unclaimed() {
  local claimed unclaimed="" rec p skip=0
  claimed="$(plan_files "$1")"
  while IFS= read -r -d '' rec; do
    # a rename/copy record is followed by a second one carrying the old path
    if [[ $skip -eq 1 ]]; then skip=0; continue; fi
    if [[ "${rec:0:2}" == *[RC]* ]]; then skip=1; fi
    p="${rec:3}"
    printf '%s\n' "$claimed" | grep -Fxq -- "$p" || unclaimed="$unclaimed$p"$'\n'
  done < <(git status --porcelain --untracked-files=all -z)
  [[ -n "$unclaimed" ]] || return 0
  echo "warning: changed, claimed by no task in the plan:" >&2
  printf '%s' "$unclaimed" >&2
}

# --- the forms no task owns: a post-test fix outside the plan's file map, and
# --- the knowledge, QA and test files a run produced beside its task map ---
if [[ "${1:-}" == "--repair" || "${1:-}" == "--chore" || "${1:-}" == "--qa" || "${1:-}" == "--e2e" ]]; then
  form="$1"
  shift

  round=""
  if [[ "$form" == "--repair" ]]; then
    plan="${1:-}"
    round="${2:-}"
    [[ -n "$plan" && "$round" =~ ^[0-9]+$ ]] || usage
    if [[ ! -f "$plan" ]]; then
      echo "error: plan file not found: $plan" >&2
      exit 2
    fi
    shift 2
  fi
  [[ $# -gt 0 ]] || usage

  paths=()
  for f in "$@"; do
    [[ -z "$f" ]] && continue
    case "$f" in
      .temp|.temp/*)
        echo "warning: refused $f - .temp is machine state, never committed" >&2
        continue
        ;;
    esac
    if git add -A -- "$f" 2>/dev/null; then
      paths+=("$f")
    else
      echo "warning: could not stage $f" >&2
    fi
  done

  if [[ ${#paths[@]} -eq 0 ]] || git diff --cached --quiet -- "${paths[@]}"; then
    echo "error: the named files produced no changes to commit" >&2
    exit 4
  fi

  # the subject follows the form and the paths, so nothing composes it
  case "$form" in
    --repair)
      subject="fix(viber): post-test repair (round $round)"
      git commit -m "$subject" -m "Refs: $plan post-test fix $round" -- "${paths[@]}" >&2 || exit 5
      ;;
    --chore)
      mem=0
      rul=0
      for f in "${paths[@]}"; do
        case "$f" in
          CLAUDE.md|*/CLAUDE.md)         mem=1 ;;
          .claude/rules/*|*/.claude/rules/*) rul=1 ;;
        esac
      done
      if   [[ $mem -eq 1 && $rul -eq 1 ]]; then subject="chore(viber): update project memory and rules"
      elif [[ $mem -eq 1 ]];               then subject="chore(viber): update project memory"
      elif [[ $rul -eq 1 ]];               then subject="chore(viber): update project rules"
      else                                      subject="chore(viber): update project knowledge"
      fi

      git commit -m "$subject" -- "${paths[@]}" >&2 || exit 5
      ;;
    --qa)
      subject="docs(viber): qa scenarios"
      git commit -m "$subject" -- "${paths[@]}" >&2 || exit 5
      ;;
    --e2e)
      subject="test(viber): e2e specs"
      git commit -m "$subject" -- "${paths[@]}" >&2 || exit 5
      ;;
  esac

  echo "committed: $(git rev-parse --short HEAD)"
  echo "subject: $subject"
  if [[ "$form" == "--repair" ]]; then
    echo "progress: unchanged"
    warn_unclaimed "$plan"
  fi
  exit 0
fi

plan="${1:-}"
task_id="${2:-}"

if [[ -z "$plan" || -z "$task_id" ]]; then
  usage
fi

# A fix names its round and every file it touched; a plain task commit takes both
# from the plan.
fix_n=""
if [[ $# -gt 2 ]]; then
  fix_n="${3:-}"
  if [[ ! "$fix_n" =~ ^[0-9]+$ ]] || [[ $# -lt 4 ]]; then
    usage
  fi
fi

if [[ ! -f "$plan" ]]; then
  echo "error: plan file not found: $plan" >&2
  exit 2
fi

# --- the task's heading and file map ---
parsed="$(awk -v want="$task_id" '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
/<!--[[:space:]]*TASK[[:space:]]*-->/   { intask = 1; cur = ""; next }
/<!--[[:space:]]*\/TASK[[:space:]]*-->/ { intask = 0; next }
intask && /^###[[:space:]]/ {
  h = trim(substr($0, 4)); p = index(h, " - ")
  cur = (p ? trim(substr(h, 1, p - 1)) : trim(h))
  if (cur == want) print "head\t" h
  next
}
intask && cur == want && /^-[[:space:]]*Files:/ {
  s = $0; sub(/^[^:]*:/, "", s)
  m = split(s, fl, /,/)
  for (k = 1; k <= m; k++) if (trim(fl[k]) != "") print "file\t" trim(fl[k])
}
' "$plan")"

heading=""
files=""
while IFS=$'\t' read -r kind value; do
  case "$kind" in
    head) heading="$value" ;;
    file) files="$files$value"$'\n' ;;
  esac
done <<< "$parsed"

if [[ -z "$heading" ]]; then
  echo "error: no task '$task_id' in $plan" >&2
  exit 3
fi

if [[ -n "$fix_n" ]]; then
  # the repair's own files, and the task's title carrying the round: "T1(2) - ..."
  shift 3
  files="$(printf '%s\n' "$@")"
  subject="$task_id($fix_n) - ${heading#* - }"
else
  if [[ -z "$files" ]]; then
    echo "error: no task '$task_id' with a Files list in $plan" >&2
    exit 3
  fi
  subject="$heading"
fi

# --- stage the named files only ---
# The same list is the commit's pathspec below: a file staged by someone else
# before the run, or left staged by an earlier exit 5, must not ride along.
paths=()
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  case "$f" in
    .temp|.temp/*)
      echo "warning: refused $f - .temp is machine state, never committed" >&2
      continue
      ;;
  esac
  if git add -A -- "$f" 2>/dev/null; then
    paths+=("$f")
  else
    echo "warning: could not stage $f" >&2
  fi
done <<< "$files"

if [[ ${#paths[@]} -eq 0 ]] || git diff --cached --quiet -- "${paths[@]}"; then
  if [[ -n "$fix_n" ]]; then
    echo "error: the fix for task $task_id produced no changes to commit" >&2
  else
    echo "error: task $task_id produced no changes to commit" >&2
  fi
  exit 4
fi

# --- a repair of an already committed task: no marker, no counter ---
if [[ -n "$fix_n" ]]; then
  git commit -m "$subject" -m "Refs: $plan task $task_id fix $fix_n" -- "${paths[@]}" >&2 || exit 5
  echo "committed: $(git rev-parse --short HEAD)"
  echo "progress: unchanged"
  warn_unclaimed "$plan"
  exit 0
fi

# --- plan progress: done marker plus the header counter ---
# Written before the commit so it lands in it, and undone by the trap on any
# failure from here on, so "done" never outlives a commit that did not happen.
backup="$plan.bak.$$"
restore_plan() {
  [[ -n "$backup" && -f "$backup" ]] || return 0
  mv -f "$backup" "$plan"
  echo "error: not committed - plan rolled back, task $task_id is NOT marked done" >&2
}
trap restore_plan EXIT
cp -p "$plan" "$backup"

tmp="$plan.tmp.$$"
awk -v want="$task_id" '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
/<!--[[:space:]]*TASK[[:space:]]*-->/ { ntask++ }
{ lines[NR] = $0 }
/<!--[[:space:]]*done:/ && donerow == 0 { donerow = NR }
/^##[[:space:]]*Tasks/ && hdrrow == 0 { hdrrow = NR }
END {
  d = ""
  if (donerow) {
    s = lines[donerow]
    sub(/.*<!--[[:space:]]*done:/, "", s); sub(/-->.*/, "", s)
    d = trim(s)
    if (d == "-") d = ""
  }
  already = 0
  m = split(d, cur, /[[:space:]]+/)
  for (k = 1; k <= m; k++) if (cur[k] == want) already = 1
  if (!already) d = trim(d " " want)

  ndone = 0
  m = split(d, cur, /[[:space:]]+/)
  for (k = 1; k <= m; k++) if (cur[k] != "") ndone++

  if (donerow) lines[donerow] = "<!-- done: " d " -->"
  if (hdrrow)  lines[hdrrow]  = sprintf("## Tasks (%d/%d)", ndone, ntask)

  for (i = 1; i <= NR; i++) print lines[i]
  printf "%d/%d\n", ndone, ntask > "/dev/stderr"
}
' "$plan" > "$tmp" 2> "$tmp.progress"

mv -f "$tmp" "$plan"
progress="$(cat "$tmp.progress")"
rm -f "$tmp.progress"

git add -- "$plan" || exit 5

git commit -m "$subject" -m "Refs: $plan task $task_id" -- "${paths[@]}" "$plan" >&2 || exit 5

rm -f "$backup"
backup=""

echo "committed: $(git rev-parse --short HEAD)"
echo "progress: $progress"

warn_unclaimed "$plan"
