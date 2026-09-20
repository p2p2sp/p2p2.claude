#!/usr/bin/env bash
#
# commit-task.sh - commits one finished plan task and records it in the plan.
#
# Usage:
#   commit-task.sh <plan-file> <task-id> <commit-subject>
#   commit-task.sh <plan-file> -         <commit-subject>
#
# Stages ONLY the files from that task's "Files:" list, so parallel tasks cannot
# pull each other's work into a commit and anything written outside the file map
# stays uncommitted and visible.
#
# A task-id of "-" commits a fix that is not in the task list (a post-test repair):
# it stages the whole tree, commits, and leaves the plan's progress counter alone.
#
# It appends the task id to the <!-- done: ... --> marker and recomputes the
# "## Tasks (x/N)" header, so the plan carries its own progress and a build resumes
# after a context reset without a separate state file. The marker has to ride IN
# the commit, so it is written first and rolled back from a backup if staging or
# committing fails: a plan claiming a task is done that was never committed would
# be skipped forever on resume. Either the commit exists and the marker is set, or
# neither is.
#
# stdout: "committed: <sha>" and "progress: x/N"
# stderr: a warning listing anything left outside the commit
#
# exit != 0:
#   2 - bad arguments / missing plan
#   3 - no task with that id in the plan
#   4 - the task produced no change to the working tree
#   5 - staging or committing failed; the plan is restored, nothing is recorded
#       (the task's files stay staged, so the call can be retried as is)
#
set -euo pipefail

plan="${1:-}"
task_id="${2:-}"
subject="${3:-}"

if [[ -z "$plan" || -z "$task_id" || -z "$subject" ]]; then
  echo "error: usage: commit-task.sh <plan-file> <task-id> <commit-subject>" >&2
  exit 2
fi

if [[ ! -f "$plan" ]]; then
  echo "error: plan file not found: $plan" >&2
  exit 2
fi

# --- fix outside the task list ---
if [[ "$task_id" == "-" ]]; then
  git add -A
  if git diff --cached --quiet; then
    echo "error: nothing to commit" >&2
    exit 4
  fi
  git commit -m "$subject" -m "Refs: $plan" >&2
  echo "committed: $(git rev-parse --short HEAD)"
  echo "progress: unchanged"
  exit 0
fi

# --- the task's files, from its "Files:" map ---
files="$(awk -v want="$task_id" '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
/<!--[[:space:]]*TASK[[:space:]]*-->/   { intask = 1; cur = ""; next }
/<!--[[:space:]]*\/TASK[[:space:]]*-->/ { intask = 0; next }
intask && /^###[[:space:]]/ {
  h = trim(substr($0, 4)); p = index(h, " - ")
  cur = (p ? trim(substr(h, 1, p - 1)) : trim(h))
  next
}
intask && cur == want && /^-[[:space:]]*Files:/ {
  s = $0; sub(/^[^:]*:/, "", s); gsub(/,/, "\n", s)
  print trim(s)
}
' "$plan" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e '/^$/d')"

if [[ -z "$files" ]]; then
  echo "error: no task '$task_id' with a Files list in $plan" >&2
  exit 3
fi

# --- stage the task's files only ---
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  git add -A -- "$f" 2>/dev/null || echo "warning: could not stage $f" >&2
done <<< "$files"

if git diff --cached --quiet; then
  echo "error: task $task_id produced no changes to commit" >&2
  exit 4
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

dirty="$(git status --short)"
if [[ -n "$dirty" ]]; then
  echo "warning: left outside the commit (not in task $task_id file map):" >&2
  printf '%s\n' "$dirty" >&2
fi
