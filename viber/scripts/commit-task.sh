#!/usr/bin/env bash
#
# commit-task.sh - commits one finished plan task and records it in the run's
# status file.
#
# Usage:
#   commit-task.sh <plan-file> <task-id> [--unreviewed] [--with <file> [<file>...]]
#                                        [--defer <task-id>:<path> [...]]
#                                        [--landed <sha>]
#   commit-task.sh <plan-file> <task-id> <fix-number> <file> [<file>...]
#   commit-task.sh --skip <plan-file> <task-id>
#   commit-task.sh --decide <plan-file> <task-id> <text>
#   commit-task.sh --repair <plan-file> <round> <file> [<file>...]
#   commit-task.sh --chore <plan-file> <file> [<file>...]
#   commit-task.sh --qa <plan-file> <file> [<file>...]
#   commit-task.sh --e2e <file> [<file>...]
#   commit-task.sh --review <plan-file> <file> [<file>...]
#
# The two positional forms take the commit subject from the task's own heading
# line ("### T1 - <title>") in the plan, so the plan's title is literally what
# lands in the history and no caller ever composes or paraphrases it.
#
# Two arguments commit the task itself, subject "T1 - <title>", staging ONLY the
# paths on that task's "Files:" line - parallel tasks cannot pull each other's
# work into a commit.
#
# --with adds paths the task's own work forced outside its own map, so the commit
# that lands a task is the whole task and builds on its own. A path the plan gave
# no owner is taken as is. A path ANOTHER task's "Files:" claims is refused with a
# warning while that task is not done: it may have a coder writing the file right
# now, and its own commit stages it whole. Once every other claimant is done,
# nothing would ever stage the file again, so it is taken, with a warning naming
# the committed task whose file changed under a later one. A skipped claimant
# still refuses: its half-finished files stay uncommitted and visible.
#
# --defer records code this task left without its own test because the criterion
# that proves it belongs to a LATER task, one "<task-id>:<path>" entry per path.
# It stages nothing - the path is already in the task's own map - and only names
# who owes the proof, so the deferral survives a context reset and reaches that
# task's coder and its reviewer. An entry naming no task in the plan is refused
# with a warning, the shape --with already uses: untested code with no owner is
# not deferred, it is unfinished, and recording it against an id nobody will
# dispatch would hide exactly that.
#
# --landed records a task whose work ANOTHER commit already carried - a coder
# that committed on its own, a manual commit, a commit that swept the files in,
# a --no-ff merge that brought a branch's commits in. The task's files then
# show no change, a plain call exits 4, and nothing else could ever mark the
# task done. It stages nothing: status.md (and the task's trail) ride in a
# commit of their own, subject derived
# ("chore(viber): record T3 done, landed in <short-sha>"), footer naming the
# full sha. The sha must be in HEAD's history (else exit 2) and touch at least
# one of the task's files ON ITS FIRST PARENT'S DIFF, so a merge commit that
# brought them in still counts and one that touches none of them still exits
# 4, and the task's files must be clean in the tree (else exit 4). It combines
# with --unreviewed and --defer, never with --with.
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
# memory and rule files. It takes no task id, because no task owns those files,
# and its subject is DERIVED from the paths (a CLAUDE.md -> memory, a
# .claude/rules/ file -> rules, both -> both), so the caller never composes a
# commit subject here either. It takes the plan to record what it closed.
#
# --qa commits the QA documents a build's close produced, and --e2e the
# Playwright specs a later e2e pass generated plus the handoff file it updated.
# Neither takes a task id for the same reason --chore does not, and both carry a
# FIXED derived subject ("docs(viber): qa scenarios", "test(viber): e2e specs") -
# no form of this script ever takes a subject from its caller. --e2e takes no
# plan either: the e2e pass runs after the build, so nothing resumes on it.
#
# --review commits the fixes a build's final review found, once every task is
# already committed and the fix is rechecked or accepted by the user - a fix
# that touches no task's own map, the same shape --repair is for. It runs once,
# after every fix round. It takes the plan to record the close and to link
# Refs, like --chore and --qa, and carries a FIXED subject
# ("fix(viber): final review") - no caller composes it here either. Besides the
# caller's own files it carries the run's own trail: every
# "work/final-review-*.md" report (slice reviews and rechecks) and every
# "work/final-fix-coder-*.md" notes file of the fix rounds - so "status.md"
# gains "final-review" on its "closed:" line in the same commit and a resumed
# build skips the review next time. It leaves the plan's progress counter alone.
# The trail patterns glob under nullglob: zero matches add nothing.
#
# Every form that takes the plan closes its message on a "Refs: <plan> ..." line
# naming the run. A plan whose frontmatter carries "issue: <GitHub issue URL>"
# (a run tied to an issue) adds "Refs: #<N>" beneath it in the same paragraph,
# so every commit of the run links the issue; --e2e takes no plan and adds none.
#
# No form ever stages a path the caller did not name, and every form commits
# through its own pathspec, so a path staged before or beside the run stays in
# the index instead of riding along. A named path is taken in whatever state it
# arrives: already staged, already removed with "git rm", or tracked under a
# directory an ignore rule covers (see stage_path). An UNTRACKED path an ignore
# rule covers is never force-added: it is warned about and left out. A ".temp/" entry is refused outright, so
# machine state and anything written outside the file map stay uncommitted and
# visible.
#
# Those pathspecs are LITERAL, which GIT_LITERAL_PATHSPECS below enforces for
# every git call here. Git otherwise reads "*", "?" and "[...]" in a pathspec as
# wildmatch, and a Next.js App Router path carries brackets as part of its own
# name ("src/app/[id]/page.tsx"): the exact file still matches, but a sibling
# the character class happens to cover would be staged with it. "Stages the list
# literally" is the contract, so the literal mode is what makes it true.
#
# The run's state lives in status.md beside the plan, and this script is its only
# writer: the plan and the specification are frozen the moment they land, so a
# task's progress is never recorded by editing the document that defines it.
#
#   progress: 3/8        recomputed from the done list and the plan's TASK blocks
#   done: T1 T2 T4       committed, never dispatched again
#   skipped: T3          --skip, the user dropped that task
#   unreviewed: T7       --unreviewed, the user waived the review gate
#   deferred: T7:src/a.ts   --defer, T7 owes that path the test that proves it
#   closed: memory qa    --chore / --qa, that part of the close is done
#   decision: T3: <text> --decide, how the owner settled a stalled task; one
#                        line per decision, appended after the keys above
#
# --decide records the owner's decision for one task that is neither done nor
# skipped. <text> is one non-empty line, stored verbatim (a ":" in it included);
# the same task id and text recorded twice leaves one line.
#
# An absent key is "none". The file is created here when the run has none yet
# (plan-index.sh --split normally writes it with the decomposition), so a task
# commit never fails for the lack of it.
#
# The entry has to ride IN the commit, so it is written first and rolled back
# from a backup if staging or committing fails: a status claiming a task is done
# that was never committed would be skipped forever on resume. Either the commit
# exists and the entry is set, or neither is. Only --skip and --decide write
# without committing: neither has a commit of its own to ride in, so the entry
# waits in status.md for whichever commit comes next, and a failed commit rolls
# status.md back with those entries intact.
#
# Every form also stages the run's own trail - the notes and reports under
# <run-dir>/work/ - with the commit it belongs to, so the trail travels with the
# code it describes and reaches another machine. The paths are DERIVED from the
# task id or the round, never taken from the caller, so a parallel task's notes
# cannot ride along.
#
# stdout by form:
#   task (--unreviewed / --with / --defer): "committed: <sha>", "progress: x/N"
#   --landed:                    "committed: <sha>", "subject: <line>", "progress: x/N"
#   <fix-number>:                "committed: <sha>", "progress: unchanged"
#   --repair:                    "committed: <sha>", "subject: <line>", "progress: unchanged"
#   --chore, --qa, --e2e:        "committed: <sha>", "subject: <line>"
#   --review:                    "committed: <sha>", "subject: <line>"
#   --skip:                      "skipped: <id>", "progress: unchanged" (no commit)
#   --decide:                    "decided: <id>", "progress: unchanged" (no commit)
# stderr: a warning listing changed paths no task in the plan claims, the run's
#         own directory excluded - it holds the plan, the decomposition, the
#         status file and the trail, which no "Files:" line names and every form
#         commits itself; one "refused <path> - claimed by task <id>" or
#         "took <path> - claimed by committed task <ids>" per owned --with path
#
# exit != 0:
#   2 - bad arguments / missing plan; for --decide also an empty or multi-line
#       <text>, or a task on the done or skipped list (status.md untouched)
#   3 - no task with that id in the plan
#   4 - the named files produced no change to the working tree (a task
#       commit's message names --landed); for --landed, the sha touches none
#       of the task's files or those files still carry uncommitted changes
#   5 - staging or committing failed; status.md is restored, nothing is recorded
#       (the named files stay staged, so the call can be retried as is)
#
set -euo pipefail
shopt -s nullglob

# every pathspec in this script is one exact path the caller named - never a
# pattern. See the header: an App Router path is made of bracketed segments.
export GIT_LITERAL_PATHSPECS=1

usage() {
  echo "error: usage: commit-task.sh <plan-file> <task-id> [--unreviewed] [--with <file> [<file>...]] [--defer <task-id>:<path> [...]] [--landed <sha>] | <plan-file> <task-id> <fix-number> <file> [<file>...] | --skip <plan-file> <task-id> | --decide <plan-file> <task-id> <text> | --repair <plan-file> <round> <file> [<file>...] | --chore <plan-file> <file> [<file>...] | --qa <plan-file> <file> [<file>...] | --e2e <file> [<file>...] | --review <plan-file> <file> [<file>...]" >&2
  exit 2
}

# The run directory of a plan, empty for a plan with no directory part. Both
# separators are split on: on Windows the plan path can arrive backslashed
# ("C:\...\plan.md"), and splitting on "/" alone would report NO directory part
# for it - putting status.md in the working directory and blinding trail_paths,
# instead of failing on a plan the repository does not hold.
run_dir() {
  local p="${1//\\//}"
  [[ "$p" == */* ]] || return 0
  printf '%s\n' "${p%/*}"
}

# The run's trail files matching the given basename globs, one per line. The
# globs are formed from a task id or a round, so what comes back is always the
# trail of the commit being made - never another task's work in progress.
trail_paths() {
  local dir="$1" g f
  shift
  [[ -n "$dir" && -d "$dir/work" ]] || return 0
  for g in "$@"; do
    for f in "$dir/work/"$g; do
      [[ -f "$f" ]] && printf '%s\n' "$f"
    done
  done
}

# Stages one named path whatever state it arrives in, and succeeds when git
# knows it afterwards - in the index or in HEAD - so it can stand in the
# commit's pathspec. A single "git add -A" is not that: it fails outright on a
# path the coder already removed with "git rm" (gone from index and tree), and
# exits 1 on a TRACKED file under a directory an ignore rule covers although it
# staged the file - either way the path used to drop out of the pathspec and
# stay staged, uncommitted. Tracked paths go through "add -u", which ignore
# rules never touch; untracked ones only when no ignore rule covers them, so a
# Files entry never force-adds what the repository ignores.
stage_path() {
  local f="$1" u
  local -a new=()
  if [[ -n "$(git ls-files -- "$f")" ]]; then
    git add -u -- "$f" 2>/dev/null || return 1
  fi
  if [[ -e "$f" ]]; then
    while IFS= read -r -d '' u; do new+=("$u"); done < <(git ls-files -z -o --exclude-standard -- "$f")
    if [[ ${#new[@]} -gt 0 ]]; then
      git add -- "${new[@]}" 2>/dev/null || return 1
    fi
  fi
  [[ -n "$(git ls-files -- "$f")" ]] && return 0
  [[ -n "$(git ls-tree -r --name-only HEAD -- "$f" 2>/dev/null)" ]]
}

# The run's state file, beside the plan.
status_of() {
  local dir
  dir="$(run_dir "$1")"
  printf '%s\n' "${dir:+$dir/}status.md"
}

# How many tasks the plan defines - the denominator of "progress", read from the
# plan and never stored twice.
task_total() {
  local n
  n="$(grep -cE '^[[:space:]]*<!--[[:space:]]*TASK[[:space:]]*-->[[:space:]]*$' -- "$1" 2>/dev/null || true)"
  printf '%s\n' "${n:-0}"
}

# The issue the run is tied to, as "#<N>", or nothing. It is read from the plan's
# frontmatter "issue:" key, which planner writes only for a run tied to an issue
# and always as a full GitHub issue URL; a value with no "/issues/<N>" in it, a
# key outside the frontmatter, or a frontmatter never closed yields nothing, so
# such a plan commits exactly as one with no issue does.
issue_ref() {
  local line val first=1 num=""
  local fence='^[[:space:]]*---[[:space:]]*$'
  local key='^[[:space:]]*issue:[[:space:]]*(.*)$'
  local url='/issues/([0-9]+)([/?#].*)?[[:space:]]*$'
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    if [[ $first -eq 1 ]]; then
      first=0
      [[ "$line" =~ $fence ]] || return 0
      continue
    fi
    if [[ "$line" =~ $fence ]]; then
      [[ -z "$num" ]] || printf '#%s\n' "$num"
      return 0
    fi
    if [[ "$line" =~ $key ]]; then
      num=""
      val="${BASH_REMATCH[1]}"
      if [[ "$val" =~ $url ]]; then num="${BASH_REMATCH[1]}"; fi
    fi
  done < "$1"
}

# The closing paragraph of every commit that takes a plan: the run's own "Refs:"
# line, then the issue's "Refs: #<N>" when the plan names one. Both sit in one
# paragraph, so git reads them as two trailers of the same commit.
footer() {
  local issue
  issue="$(issue_ref "$1")"
  printf '%s\n' "$2"
  [[ -z "$issue" ]] || printf 'Refs: %s\n' "$issue"
}

# Appends a value to one of status.md's keys, creating the file when the run has
# none yet and the key when the file does not carry it. Appending the same value
# twice is a no-op, and every call recomputes "progress: x/N" off the done list.
# stdout: "x/N" for done, nothing for the other keys.
mark_status() {
  local plan="$1" name="$2" want="$3" status tmp
  status="$(status_of "$plan")"
  tmp="$status.tmp.$$"
  [[ -f "$status" ]] || write_status "$status" "$(task_total "$plan")"
  awk -v name="$name" -v want="$want" -v ntask="$(task_total "$plan")" '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
function value(s) { sub(/^[A-Za-z]+:/, "", s); s = trim(s); return (s == "none" || s == "-" ? "" : s) }
{ lines[NR] = $0 }
$0 ~ ("^" name ":") && row == 0 { row = NR }
/^progress:/ && prow == 0 { prow = NR }
/^done:/ && drow == 0 { drow = NR }
END {
  d = (row ? value(lines[row]) : "")
  already = 0
  m = split(d, cur, /[[:space:]]+/)
  for (k = 1; k <= m; k++) if (cur[k] == want) already = 1
  if (!already) d = trim(d " " want)

  entry = name ": " (d == "" ? "none" : d)
  if (row) lines[row] = entry

  # progress follows the done list whichever key was just written
  dl = (name == "done" ? d : (drow ? value(lines[drow]) : ""))
  ndone = 0
  m = split(dl, cur, /[[:space:]]+/)
  for (k = 1; k <= m; k++) if (cur[k] != "") ndone++
  if (prow) lines[prow] = sprintf("progress: %d/%d", ndone, ntask)

  for (i = 1; i <= NR; i++) print lines[i]
  if (!row)  print entry
  if (!prow) printf "progress: %d/%d\n", ndone, ntask

  if (name == "done") printf "%d/%d\n", ndone, ntask > "/dev/stderr"
}
' "$status" > "$tmp" 2> "$tmp.progress"
  mv -f "$tmp" "$status"
  cat "$tmp.progress"
  rm -f "$tmp.progress"
}

# A fresh state file: every key present, nothing done.
write_status() {
  {
    printf '# status\n\n'
    printf 'progress: 0/%s\n' "$2"
    printf 'done: none\n'
    printf 'skipped: none\n'
    printf 'unreviewed: none\n'
    printf 'deferred: none\n'
    printf 'closed: none\n'
  } > "$1"
}

# An entry is written BEFORE the commit it has to ride in, so every failure from
# that point on puts status.md back: a state claiming what the history does not
# show would mislead every later session.
backup=""
status_created=0
restore_note="nothing was recorded"
restore_status() {
  [[ -n "$backup" && -f "$backup" ]] || return 0
  if [[ $status_created -eq 1 ]]; then
    # this call is what created the file; rolling back means the run has none
    # again, exactly as before the call
    rm -f -- "$(status_of "$plan")" "$backup"
  else
    mv -f "$backup" "$(status_of "$plan")"
  fi
  echo "error: not committed - status rolled back, $restore_note" >&2
}

# Every path the plan's tasks claim, one per line - the whole map, not this
# task's slice.
plan_files() {
  awk '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
/^[[:space:]]*<!--[[:space:]]*TASK[[:space:]]*-->[[:space:]]*$/   { intask = 1; next }
/^[[:space:]]*<!--[[:space:]]*\/TASK[[:space:]]*-->[[:space:]]*$/ { intask = 0; next }
intask && /^-[[:space:]]*Files:/ {
  s = $0; sub(/^[^:]*:/, "", s)
  m = split(s, fl, /,/)
  for (k = 1; k <= m; k++) {
    p = trim(fl[k]); sub(/^\.\//, "", p)
    if (p != "") print p
  }
}
' "$1"
}

# The ids of the tasks whose "Files:" claims one path, one per line. What decides
# whether an extra path may ride in this commit: a path with another owner waits
# for that owner instead.
claimants() {
  awk -v want="$2" '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
/^[[:space:]]*<!--[[:space:]]*TASK[[:space:]]*-->[[:space:]]*$/   { intask = 1; cur = ""; next }
/^[[:space:]]*<!--[[:space:]]*\/TASK[[:space:]]*-->[[:space:]]*$/ { intask = 0; next }
intask && /^###[[:space:]]/ {
  h = trim(substr($0, 4)); p = index(h, " - ")
  cur = (p ? trim(substr(h, 1, p - 1)) : trim(h))
  next
}
intask && /^-[[:space:]]*Files:/ {
  s = $0; sub(/^[^:]*:/, "", s)
  m = split(s, fl, /,/)
  for (k = 1; k <= m; k++) {
    p = trim(fl[k]); sub(/^\.\//, "", p)
    if (p == want) print cur
  }
}
' "$1"
}

# The ids of every task the plan defines, one per line - what "--skip" and
# "--defer" compare their <id> against as a fixed string, never as a pattern.
# A "## Contracts" heading is shaped exactly like a task's ("### C3 - <name>")
# but sits outside every TASK block, so it is never mistaken for a task id.
task_ids_of() {
  awk '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
/^[[:space:]]*<!--[[:space:]]*TASK[[:space:]]*-->[[:space:]]*$/   { intask = 1; next }
/^[[:space:]]*<!--[[:space:]]*\/TASK[[:space:]]*-->[[:space:]]*$/ { intask = 0; next }
intask && /^###[[:space:]]/ {
  h = trim(substr($0, 4)); p = index(h, " - ")
  print (p ? trim(substr(h, 1, p - 1)) : trim(h))
}
' "$1"
}

# The ids on one of status.md's id-list lines, one per line - nothing when the
# run has no status file yet or the list is empty.
status_ids() {
  local status
  status="$(status_of "$1")"
  [[ -f "$status" ]] || return 0
  STATUS_KEY="$2:" awk '
index($0, ENVIRON["STATUS_KEY"]) == 1 {
  s = substr($0, length(ENVIRON["STATUS_KEY"]) + 1)
  n = split(s, d, /[[:space:]]+/)
  for (k = 1; k <= n; k++) if (d[k] != "" && d[k] != "none" && d[k] != "-") print d[k]
  exit
}
' "$status"
}

# The done ids: what tells a claimant still in flight from one whose commit has
# already landed.
done_ids() {
  status_ids "$1" done
}

skipped_ids() {
  status_ids "$1" skipped
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
  local claimed unclaimed="" rec p skip=0 dir
  claimed="$(plan_files "$1")"
  dir="$(run_dir "$1")"
  while IFS= read -r -d '' rec; do
    # a rename/copy record is followed by a second one carrying the old path
    if [[ $skip -eq 1 ]]; then skip=0; continue; fi
    if [[ "${rec:0:2}" == *[RC]* ]]; then skip=1; fi
    p="${rec:3}"
    # the run's own directory is not part of the file map and is committed by
    # the forms that write it, so it is never "unclaimed"
    [[ -n "$dir" && "$p" == "$dir/"* ]] && continue
    printf '%s\n' "$claimed" | grep -Fxq -- "$p" || unclaimed="$unclaimed$p"$'\n'
  done < <(git status --porcelain --untracked-files=all -z)
  [[ -n "$unclaimed" ]] || return 0
  echo "warning: changed, claimed by no task in the plan:" >&2
  printf '%s' "$unclaimed" >&2
}

# --- the two forms that record a decision instead of a commit ---
# The user dropped this task, which no later session can read off the tree: an
# untouched task and an abandoned one look exactly alike. The marker has no
# commit of its own to ride in and waits in the plan for the next one.
if [[ "${1:-}" == "--skip" ]]; then
  plan="${2:-}"
  task_id="${3:-}"
  [[ -n "$plan" && -n "$task_id" && $# -eq 3 ]] || usage
  if [[ ! -f "$plan" ]]; then
    echo "error: plan file not found: $plan" >&2
    exit 2
  fi
  if ! task_ids_of "$plan" | grep -Fxq -- "$task_id"; then
    echo "error: no task '$task_id' in $plan" >&2
    exit 3
  fi
  if done_ids "$plan" | grep -Fxq -- "$task_id"; then
    echo "error: task '$task_id' is already done - it cannot be skipped" >&2
    exit 2
  fi
  mark_status "$plan" skipped "$task_id" >/dev/null
  echo "skipped: $task_id"
  echo "progress: unchanged"
  exit 0
fi

# --- the owner's decision on one task, recorded without a commit ---
# How the user settled a stalled task: it reaches that task's coder and reviewer
# through the index, survives a resumed session and ends up in the archive. Like
# --skip it has no commit of its own and waits in status.md for the next one.
if [[ "${1:-}" == "--decide" ]]; then
  plan="${2:-}"
  task_id="${3:-}"
  [[ -n "$plan" && -n "$task_id" && $# -eq 4 ]] || usage
  text="$4"
  if [[ ! -f "$plan" ]]; then
    echo "error: plan file not found: $plan" >&2
    exit 2
  fi
  if [[ -z "${text//[[:space:]]/}" || "$text" == *$'\n'* || "$text" == *$'\r'* ]]; then
    echo "error: a decision text is one non-empty line" >&2
    exit 2
  fi
  if ! task_ids_of "$plan" | grep -Fxq -- "$task_id"; then
    echo "error: no task '$task_id' in $plan" >&2
    exit 3
  fi
  if done_ids "$plan" | grep -Fxq -- "$task_id"; then
    echo "error: task '$task_id' is already done - a decision would reach no one" >&2
    exit 2
  fi
  if skipped_ids "$plan" | grep -Fxq -- "$task_id"; then
    echo "error: task '$task_id' is skipped - a decision would reach no one" >&2
    exit 2
  fi
  status="$(status_of "$plan")"
  entry="decision: $task_id: $text"
  [[ -f "$status" ]] || write_status "$status" "$(task_total "$plan")"
  if ! grep -Fxq -- "$entry" "$status"; then
    # a file cut short of its last newline would glue the entry onto its last key
    [[ ! -s "$status" || -z "$(tail -c 1 -- "$status")" ]] || printf '\n' >> "$status"
    printf '%s\n' "$entry" >> "$status"
  fi
  echo "decided: $task_id"
  echo "progress: unchanged"
  exit 0
fi

# --- the forms no task owns: a post-test fix outside the plan's file map, and
# --- the knowledge, QA and test files a run produced beside its task map ---
if [[ "${1:-}" == "--repair" || "${1:-}" == "--chore" || "${1:-}" == "--qa" || "${1:-}" == "--e2e" || "${1:-}" == "--review" ]]; then
  form="$1"
  shift

  round=""
  plan=""
  if [[ "$form" != "--e2e" ]]; then
    plan="${1:-}"
    [[ -n "$plan" ]] || usage
    if [[ ! -f "$plan" ]]; then
      echo "error: plan file not found: $plan" >&2
      exit 2
    fi
    shift
    if [[ "$form" == "--repair" ]]; then
      round="${1:-}"
      [[ "$round" =~ ^[0-9]+$ ]] || usage
      shift
    fi
  fi
  [[ $# -gt 0 ]] || usage

  paths=()
  for f in "$@"; do
    f="${f#./}"
    [[ -z "$f" ]] && continue
    case "$f" in
      .temp|.temp/*)
        echo "warning: refused $f - .temp is machine state, never committed" >&2
        continue
        ;;
    esac
    if stage_path "$f"; then
      paths+=("$f")
    else
      echo "warning: could not stage $f" >&2
    fi
  done

  if [[ ${#paths[@]} -eq 0 ]] || git diff --cached --quiet -- "${paths[@]}"; then
    echo "error: the named files produced no changes to commit" >&2
    exit 4
  fi

  # a post-test round leaves its own trail: the run's test report and the notes
  # of the coder that repaired it; the final review leaves every reviewer's
  # and recheck's report plus the notes of every fix round's coder
  if [[ "$form" == "--repair" ]]; then
    while IFS= read -r t; do
      [[ -n "$t" ]] || continue
      stage_path "$t" && paths+=("$t")
    done < <(trail_paths "$(run_dir "$plan")" "tests-$round.md" "repair-$round-coder.md")
  elif [[ "$form" == "--review" ]]; then
    while IFS= read -r t; do
      [[ -n "$t" ]] || continue
      stage_path "$t" && paths+=("$t")
    done < <(trail_paths "$(run_dir "$plan")" "final-review-*.md" "final-fix-coder-*.md")
  fi

  # the subject follows the form and the paths, so nothing composes it, and the
  # close records in the plan which half of it is now done
  closed=""
  case "$form" in
    --repair)
      subject="fix(viber): post-test repair (round $round)"
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
      if   [[ $mem -eq 1 && $rul -eq 1 ]]; then subject="chore(viber): update project memory and rules"; closed="memory rules"
      elif [[ $mem -eq 1 ]];               then subject="chore(viber): update project memory";           closed="memory"
      elif [[ $rul -eq 1 ]];               then subject="chore(viber): update project rules";            closed="rules"
      else                                      subject="chore(viber): update project knowledge";        closed="memory rules"
      fi
      ;;
    --qa)
      subject="docs(viber): qa scenarios"
      closed="qa"
      ;;
    --e2e)
      subject="test(viber): e2e specs"
      ;;
    --review)
      subject="fix(viber): final review"
      closed="final-review"
      ;;
  esac

  if [[ -n "$closed" ]]; then
    status="$(status_of "$plan")"
    backup="$status.bak.$$"
    restore_note="the close is NOT recorded"
    trap restore_status EXIT
    if [[ ! -f "$status" ]]; then
      write_status "$status" "$(task_total "$plan")"
      status_created=1
    fi
    cp -p "$status" "$backup"
    for c in $closed; do
      mark_status "$plan" closed "$c" >/dev/null
    done
    git add -- "$status" || exit 5
    paths+=("$status")
  fi

  case "$form" in
    --repair)     git commit -m "$subject" -m "$(footer "$plan" "Refs: $plan post-test fix $round")" -- "${paths[@]}" >&2 || exit 5 ;;
    --chore|--qa) git commit -m "$subject" -m "$(footer "$plan" "Refs: $plan close")" -- "${paths[@]}" >&2 || exit 5 ;;
    --e2e)        git commit -m "$subject" -- "${paths[@]}" >&2 || exit 5 ;;
    --review)     git commit -m "$subject" -m "$(footer "$plan" "Refs: $plan final review")" -- "${paths[@]}" >&2 || exit 5 ;;
  esac

  if [[ -n "$backup" ]]; then
    rm -f "$backup"
    backup=""
  fi

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
# from the plan. --unreviewed is the user waiving the review gate on that commit,
# --with names the paths the task forced outside its own map, and --defer the
# paths it left for a later task to prove.
fix_n=""
unreviewed=0
extra=""
deferred=""
landed=""
case "${3:-}" in
  "") ;;
  --unreviewed|--with|--defer|--landed)
    set -- "${@:3}"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --unreviewed) unreviewed=1; shift ;;
        --landed)
          [[ $# -ge 2 && "$2" != --* ]] || usage
          landed="$2"
          shift 2
          ;;
        --with)
          shift
          [[ $# -gt 0 && "$1" != --* ]] || usage
          while [[ $# -gt 0 && "$1" != --* ]]; do
            extra="$extra${1#./}"$'\n'
            shift
          done
          ;;
        --defer)
          shift
          [[ $# -gt 0 && "$1" != --* ]] || usage
          while [[ $# -gt 0 && "$1" != --* ]]; do
            deferred="$deferred$1"$'\n'
            shift
          done
          ;;
        *) usage ;;
      esac
    done
    ;;
  *)
    fix_n="${3:-}"
    if [[ ! "$fix_n" =~ ^[0-9]+$ ]] || [[ $# -lt 4 ]]; then
      usage
    fi
    ;;
esac

if [[ ! -f "$plan" ]]; then
  echo "error: plan file not found: $plan" >&2
  exit 2
fi

# --- the task's heading and file map ---
parsed="$(awk -v want="$task_id" '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
/^[[:space:]]*<!--[[:space:]]*TASK[[:space:]]*-->[[:space:]]*$/   { intask = 1; cur = ""; next }
/^[[:space:]]*<!--[[:space:]]*\/TASK[[:space:]]*-->[[:space:]]*$/ { intask = 0; next }
intask && /^###[[:space:]]/ {
  h = trim(substr($0, 4)); p = index(h, " - ")
  cur = (p ? trim(substr(h, 1, p - 1)) : trim(h))
  if (cur == want) print "head\t" h
  next
}
intask && cur == want && /^-[[:space:]]*Files:/ {
  s = $0; sub(/^[^:]*:/, "", s)
  m = split(s, fl, /,/)
  for (k = 1; k <= m; k++) {
    p = trim(fl[k]); sub(/^\.\//, "", p)
    if (p != "") print "file\t" p
  }
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
  fix_files=()
  for f in "$@"; do fix_files+=("${f#./}"); done
  files="$(printf '%s\n' "${fix_files[@]}")"
  subject="$task_id($fix_n) - ${heading#* - }"
else
  if [[ -z "$files" ]]; then
    echo "error: no task '$task_id' with a Files list in $plan" >&2
    exit 3
  fi
  subject="$heading"
fi

# --- a task whose work another commit already carried ---
# Nothing is staged: the entry alone rides in a commit of its own, under a
# derived subject, and the commit it points at has to be in HEAD's history and
# touch at least one of the task's files - so the done entry never names work
# the history does not show. A task file still changed in the tree is refused:
# that change belongs in a normal task commit, not under a record-only subject.
if [[ -n "$landed" ]]; then
  if [[ -n "$extra" ]]; then
    echo "error: --landed stages nothing, so it takes no --with" >&2
    exit 2
  fi
  landed_sha="$(git rev-parse -q --verify "$landed^{commit}" 2>/dev/null || true)"
  if [[ -z "$landed_sha" ]] || ! git merge-base --is-ancestor "$landed_sha" HEAD 2>/dev/null; then
    echo "error: --landed $landed is not a commit in HEAD's history" >&2
    exit 2
  fi
  task_paths=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && task_paths+=("$f")
  done <<< "$files"
  # Compared against the FIRST parent, never a plain "diff-tree <sha>": that
  # form shows no diff at all for a merge commit (git only computes one
  # against a single parent, and a merge carries more than one), so every
  # --no-ff merge would silently read as touching nothing. A root commit has
  # no first parent, so it falls back to the --root form (diff against the
  # empty tree) instead.
  landed_parent="$(git rev-parse -q --verify "$landed_sha^" 2>/dev/null || true)"
  if [[ -n "$landed_parent" ]]; then
    landed_changed="$(git diff --name-only "$landed_parent" "$landed_sha" -- "${task_paths[@]}")"
  else
    landed_changed="$(git diff-tree --root --no-commit-id --name-only -r "$landed_sha" -- "${task_paths[@]}")"
  fi
  if [[ -z "$landed_changed" ]]; then
    echo "error: --landed $landed touches none of task $task_id's files" >&2
    exit 4
  fi
  if [[ -n "$(git status --porcelain --untracked-files=all -- "${task_paths[@]}")" ]]; then
    echo "error: task $task_id still has uncommitted changes to its files - commit them without --landed" >&2
    exit 4
  fi
  subject="chore(viber): record $task_id done, landed in $(git rev-parse --short "$landed_sha")"
fi

# --- what the task forced outside its own map ---
# Taken when no OTHER task claims the path, or every one that does is done: a
# shared file is committed by whichever task declares it, never pulled out from
# under a coder still writing it - but once its owner is committed, this commit
# is the last one that will ever stage it.
done_list="$(done_ids "$plan")"
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  open=""
  closed=""
  while IFS= read -r o; do
    [[ -n "$o" ]] || continue
    if printf '%s\n' "$done_list" | grep -Fxq -- "$o"; then
      closed="$closed $o"
    else
      open="${open:-$o}"
    fi
  done < <(claimants "$plan" "$f" | grep -vFx -- "$task_id" || true)
  if [[ -n "$open" ]]; then
    echo "warning: refused $f - claimed by task $open" >&2
    continue
  fi
  if [[ -n "$closed" ]]; then
    echo "warning: took $f - claimed by committed task${closed}" >&2
  fi
  printf '%s\n' "$files" | grep -Fxq -- "$f" || files="$files$f"$'\n'
done <<< "$extra"

# --- stage the named files only ---
# The same list is the commit's pathspec below: a file staged by someone else
# before the run, or left staged by an earlier exit 5, must not ride along.
paths=()
if [[ -z "$landed" ]]; then
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    case "$f" in
      .temp|.temp/*)
        echo "warning: refused $f - .temp is machine state, never committed" >&2
        continue
        ;;
    esac
    if stage_path "$f"; then
      paths+=("$f")
    else
      echo "warning: could not stage $f" >&2
    fi
  done <<< "$files"

  if [[ ${#paths[@]} -eq 0 ]] || git diff --cached --quiet -- "${paths[@]}"; then
    if [[ -n "$fix_n" ]]; then
      echo "error: the fix for task $task_id produced no changes to commit" >&2
    else
      echo "error: task $task_id produced no changes to commit - if its work already landed in another commit, record it with --landed <sha>" >&2
    fi
    exit 4
  fi
fi

# --- the run's own trail, derived from the task or the round it belongs to ---
# A plain commit carries the task's notes and every review report it spent; a fix
# carries its round's test report and the notes of the coder that repaired it.
if [[ -n "$fix_n" ]]; then
  trail=("tests-$fix_n.md" "repair-$fix_n-coder.md")
else
  trail=("$task_id-coder.md" "review-$task_id-[0-9]*.md")
fi
while IFS= read -r t; do
  [[ -n "$t" ]] || continue
  stage_path "$t" && paths+=("$t")
done < <(trail_paths "$(run_dir "$plan")" "${trail[@]}")

# --- a repair of an already committed task: no marker, no counter ---
if [[ -n "$fix_n" ]]; then
  git commit -m "$subject" -m "$(footer "$plan" "Refs: $plan task $task_id fix $fix_n")" -- "${paths[@]}" >&2 || exit 5
  echo "committed: $(git rev-parse --short HEAD)"
  echo "progress: unchanged"
  warn_unclaimed "$plan"
  exit 0
fi

# --- the run's progress: the done entry and the recomputed counter ---
# Written before the commit so it lands in it, and undone by the trap on any
# failure from here on, so "done" never outlives a commit that did not happen.
status="$(status_of "$plan")"
backup="$status.bak.$$"
restore_note="task $task_id is NOT marked done"
trap restore_status EXIT
if [[ ! -f "$status" ]]; then
  write_status "$status" "$(task_total "$plan")"
  status_created=1
fi
cp -p "$status" "$backup"

progress="$(mark_status "$plan" done "$task_id")"
if [[ $unreviewed -eq 1 ]]; then
  mark_status "$plan" unreviewed "$task_id" >/dev/null
fi

# What this task left for a later one to prove. The path is in this task's own
# map and is committed with it; the entry only names who owes the test, so it
# rides in the same commit and is rolled back with it. An id no task carries is
# refused the way --with refuses an owned path: an entry waiting on a dispatch
# that never comes would hide untested code instead of naming it.
while IFS= read -r d; do
  [[ -n "$d" ]] || continue
  if [[ "$d" != *:* || -z "${d%%:*}" || -z "${d#*:}" ]]; then
    echo "warning: refused $d - a --defer entry is <task-id>:<path>" >&2
    continue
  fi
  defer_id="${d%%:*}"
  defer_path="${d#*:}"
  d="$defer_id:${defer_path#./}"
  if ! task_ids_of "$plan" | grep -Fxq -- "$defer_id"; then
    echo "warning: refused $d - no task $defer_id in the plan" >&2
    continue
  fi
  mark_status "$plan" deferred "$d" >/dev/null
done <<< "$deferred"

git add -- "$status" || exit 5

refs="Refs: $plan task $task_id"
[[ -z "$landed" ]] || refs="$refs landed $landed_sha"
# ${paths[@]+...}: a --landed commit may carry no path but status.md, and bash
# 3.2 (macOS) treats an empty array as unbound under set -u
git commit -m "$subject" -m "$(footer "$plan" "$refs")" -- ${paths[@]+"${paths[@]}"} "$status" >&2 || exit 5

rm -f "$backup"
backup=""

echo "committed: $(git rev-parse --short HEAD)"
[[ -z "$landed" ]] || echo "subject: $subject"
echo "progress: $progress"

warn_unclaimed "$plan"
