#!/usr/bin/env bash
#
# commit-task.sh - commits one finished plan task and records it in the plan.
#
# Usage:
#   commit-task.sh <plan-file> <task-id>
#   commit-task.sh <plan-file> <task-id> <fix-number> <file> [<file>...]
#   commit-task.sh --chore <file> [<file>...]
#
# Both forms take the commit subject from the task's own heading line
# ("### T1 - <title>") in the plan, so the plan's title is literally what lands
# in the history and no caller ever composes or paraphrases it.
#
# Two arguments commit the task itself, subject "T1 - <title>", staging ONLY the
# paths on that task's "Files:" line - parallel tasks cannot pull each other's
# work into a commit.
#
# A fix number commits a repair of that task after it was already committed (a
# post-test fix), subject "T1(2) - <title>", staging only the files the caller
# names and leaving the plan's progress counter alone.
#
# --chore commits what the run produced OUTSIDE the plan's task map - the project
# memory and rule files written at the close of a build. It takes no plan and no
# task id, because no task owns those files, and its subject is DERIVED from the
# paths (a CLAUDE.md -> memory, a .claude/rules/ file -> rules, both -> both), so
# the caller never composes a commit subject here either.
#
# Neither form ever stages a path the caller did not name, and a ".temp/" entry
# is refused outright, so machine state and anything written outside the file
# map stay uncommitted and visible.
#
# A plain task commit appends the task id to the <!-- done: ... --> marker and recomputes the
# "## Tasks (x/N)" header, so the plan carries its own progress and a build resumes
# after a context reset without a separate state file. The marker has to ride IN
# the commit, so it is written first and rolled back from a backup if staging or
# committing fails: a plan claiming a task is done that was never committed would
# be skipped forever on resume. Either the commit exists and the marker is set, or
# neither is.
#
# stdout: "committed: <sha>" and "progress: x/N" - or, for --chore, the derived
#         "subject: <line>"
# stderr: a warning listing anything left outside the commit
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
  echo "error: usage: commit-task.sh <plan-file> <task-id> [<fix-number> <file> [<file>...]] | --chore <file> [<file>...]" >&2
  exit 2
}

# --- the run's own knowledge files: no task, no plan, no progress ---
if [[ "${1:-}" == "--chore" ]]; then
  shift
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
    paths+=("$f")
    git add -A -- "$f" 2>/dev/null || echo "warning: could not stage $f" >&2
  done

  if [[ ${#paths[@]} -eq 0 ]] || git diff --cached --quiet -- "${paths[@]}"; then
    echo "error: the named files produced no changes to commit" >&2
    exit 4
  fi

  # the subject follows the paths, so nothing composes it
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
  echo "committed: $(git rev-parse --short HEAD)"
  echo "subject: $subject"
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
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  case "$f" in
    .temp|.temp/*)
      echo "warning: refused $f - .temp is machine state, never committed" >&2
      continue
      ;;
  esac
  git add -A -- "$f" 2>/dev/null || echo "warning: could not stage $f" >&2
done <<< "$files"

if git diff --cached --quiet; then
  if [[ -n "$fix_n" ]]; then
    echo "error: the fix for task $task_id produced no changes to commit" >&2
  else
    echo "error: task $task_id produced no changes to commit" >&2
  fi
  exit 4
fi

warn_dirty() {
  local dirty
  dirty="$(git status --short)"
  [[ -n "$dirty" ]] || return 0
  echo "warning: left outside the commit (not in $1):" >&2
  printf '%s\n' "$dirty" >&2
}

# --- a repair of an already committed task: no marker, no counter ---
if [[ -n "$fix_n" ]]; then
  git commit -m "$subject" -m "Refs: $plan task $task_id fix $fix_n" >&2 || exit 5
  echo "committed: $(git rev-parse --short HEAD)"
  echo "progress: unchanged"
  warn_dirty "the fix's file list"
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

git commit -m "$subject" -m "Refs: $plan task $task_id" >&2 || exit 5

rm -f "$backup"
backup=""

echo "committed: $(git rev-parse --short HEAD)"
echo "progress: $progress"

warn_dirty "task $task_id file map"
