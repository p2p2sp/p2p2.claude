#!/usr/bin/env bash
#
# decompose.sh - parses an approved plan and splits it into the run's working
# files.
#
# Usage:
#   decompose.sh <plan-file> [commit-prefix]
#
# commit-prefix (optional, default "simplebuild") - the prefix of the
# decomposition commit's message, e.g. "superbuild".
#
# It handles both plan templates:
#   - simpleplan: the header is Title + the HEADER section (Goal/Context/
#                 Acceptance)
#   - superplan:  the header is Title + Spec (no HEADER section)
#
# The plan file is resolved to an absolute path and, inside a git repository,
# the script moves to the repository root before deriving anything - so a run
# started from a subdirectory builds the same working dir, prints the same
# index and commits the same paths as one started from the root. The plan's own
# "Spec:" and "Intent:" values are read AFTER that move, so a relative one of
# either resolves against the repository root, never against the caller's cwd
# (a spec named relative to the cwd is then "spec file not found", exit 4).
# Outside a repository the cwd stays put and paths resolve against it, as before.
#
# Reviewed-plan guard (before anything is created): the ExitPlanMode hook
# (hooks/scripts/review-plan.sh) records the sha256 of the plan it approved
# as one "<hex>" line in the sidecar "<plan-file>.sha256" beside the plan.
# This script recomputes the digest of the plan it is handed through
# scripts/lib_sha256.sh and compares:
#   - sidecar present, digests equal   -> silent, continue
#   - sidecar present, digests differ  -> stderr "error: plan differs from the
#     reviewed plan (<sidecar>) - re-run the plan reviewer and ExitPlanMode",
#     exit 7, nothing created on disk
#   - sidecar present, no digest tool  -> stderr "warning: cannot compute
#     sha256 - reviewed-plan check skipped", continue
#   - sidecar absent                   -> stderr "warning: no reviewed hash
#     beside the plan (<sidecar> absent) - decomposing an unverified plan",
#     continue (a plan that never went through the hook is still buildable)
#
# What it does:
#   - working directory: when the plan's "Intent:" line (or, without one, its
#     "Spec:" line) names a file that already lies under docs/.workflows/, the
#     directory ADOPTED as the working dir is that file's WHOLE directory -
#     intent.md and spec.md end up beside plan-header.md/plan.md/tasks/. This
#     holds at every nesting level: for a run phase, i.e.
#     docs/.workflows/<run>/phases/NN-<slug>/intent.md, the working directory
#     is docs/.workflows/<run>/phases/NN-<slug> and the run root stays
#     untouched (superspec writes spec.md beside the intent it was handed, so
#     a phase's spec lands in that same directory with no change at all).
#     Otherwise (neither path lies under docs/.workflows/, e.g. a run from
#     before this change) it falls back to the name derived from the plan's
#     title, docs/.workflows/<date>-<slug>/. An absolute path carrying a
#     docs/.workflows/ segment is normalised to its repository-relative form.
#     An adopted directory always existed before this run, so the guarantee
#     below (the trap never removes a directory the run does not own) covers
#     it for free: a failed decomposition never deletes someone else's
#     intent.md/spec.md.
#   - writes the plan's header to plan-header.md
#   - copies the whole plan beside that header as plan.md
#   - creates status.md holding the number of the last processed task (start:
#     00); an existing status.md is kept (a resume)
#   - writes the build's base SHA (HEAD before the decomposition commit) to
#     base.md; an existing base.md is kept (a resume); no commits -> none
#   - splits the tasks (the TASK sections) into tasks/task-NN.md; each of the four
#     block markers (the HEADER open/close and TASK open/close HTML comments)
#     opens or closes a block ONLY when it is the whole line, trailing
#     whitespace (a CR included) allowed. A marker quoted inside a longer line -
#     a plan whose prose or task body talks about the markers themselves, even
#     in backticks - is ordinary content: it opens nothing and is copied into
#     the task file verbatim
#   - every task block MUST open, on its FIRST non-empty line, with a
#     "## Task <N> - <title>" heading carrying a non-empty title - the one
#     source of both the stdout index's <heading> column (the whole heading,
#     "## " stripped) and the bare <title> the "Covers:" messages below name the
#     task by. <N> is NOT checked against the file's own index number, and a
#     "## " heading further down the block is ordinary body, never the
#     heading. A block without such an opening heading prints
#     "error: task-NN.md has no task heading" on stderr - one line per offending
#     block - and exits 6 before a single task index row is printed
#   - a task title carrying one of ` $ " \ is refused the same way: both
#     orchestrators spend the heading column as a double-quoted shell argument to
#     commit-task.sh, so a backtick or a "$(" in it would be executed in the
#     host repo root and a double quote would split the argument. The script
#     prints "error: task-NN.md title carries a shell metacharacter ..." on
#     stderr - one line per offending block - and exits 8 before a single task
#     index row is printed (plan-review-checklist class B24)
#   - every task gains a "### Covered criteria" section carrying, verbatim,
#     the text of the criteria its "Covers:" line names; the source is the
#     spec (the superbuild track) or the plan header's "## Acceptance
#     criteria" section (the simplebuild track); a criterion absent from the
#     source -> exit 5, and that message (like the warning about a missing
#     "Covers:") names the task by the title in its "## " heading, in the form
#     `<title>` (<file name>)
#   - the superbuild track (a plan carrying a "Spec:" line) additionally
#     validates that the spec file exists (absent -> exit 4) and appends the
#     spec's "## Out of scope" and "## Constraints / assumptions" sections to
#     plan-header.md
#   - creates an empty implementation/ directory for the reviewer's reports
#     (Final Review)
#   - prints the task index for the implementation loop on stdout:
#       workdir: <path to docs/.workflows/<date>-<slug>/>
#       root: <absolute path of the repository root the paths above are
#              relative to; outside a repository, the absolute cwd. Always in
#              the platform's native spelling (under Git-Bash "C:/...", never
#              "/c/..."), because the consumer joining it opens the result with
#              a file reader, not through a shell. The orchestrator joins it
#              with the relative paths of this index to build the absolute path
#              of every fork / agent label, so a build started from any cwd
#              hands its workers the same files. workdir: itself stays
#              repository-relative - cleanup-run.sh needs it that way>
#       status: <last task number | none>
#       base: <SHA | none>
#       plan-header: <path>
#       plan: <path>
#       spec: <path>             (only when the plan has a "Spec:" line)
#       intent: <path>   (only when the plan has an Intent: line naming an existing file)
#       <task-path><TAB><heading><TAB><model><TAB><review><TAB><concurrent>
#     the second column is the task's whole "## Task <N> - <title>" heading with
#     "## " stripped, pointer included, because both orchestrators spend it raw
#     as the commit subject ("Task 7 - Add the parser"). It is NOT the title the
#     review contract's "## Naming" names a task by: that is what follows
#     "Task <N> - " in it, and stripping the pointer is the consumer's step.
#     model / review come verbatim from the task's own "- Model:" /
#     "- Review:" marker lines (the plan template's per-task build-strength
#     markers, the second the strength that task's own reviewer runs at,
#     optional on both tracks); a task carrying no such marker prints "-" in
#     that column, and the orchestrator then passes nothing, so the
#     frontmatter default of the dispatched agent applies (the implementor
#     for model, the per-task reviewer for review). There is NO effort
#     column: the Agent tool takes no effort parameter, so a "- Effort:" line
#     a plan still carries is ordinary body text copied into the task file
#     and never indexed. The script never validates the values - the plan
#     reviewer owns that (checklist class B6)
#     concurrent reads exactly "yes" or "no" and is DERIVED, never read from
#     a marker: "yes" says this task may be started while the PRECEDING task
#     is still being reviewed, so the orchestrator never has to judge that
#     itself. It is "yes" only when every one of these holds, and "no"
#     otherwise:
#       - the task is not task 1 (task 1 has no preceding review to overlap);
#       - it carries both a "### Dependencies" and a "### Files" section, and
#         the preceding task carries a "### Files" section - a task the plan
#         does not describe completely never qualifies;
#       - its "### Dependencies" carries no "(Task <N>)" token naming the
#         immediately preceding task number;
#       - no path of its "### Files" lines equals a path of the preceding
#         task's. A path is the field after the " - " that follows the
#         "add | modify | delete" verb, cut before any " (" annotation, and
#         compared as the literal token it stands as - so a non-literal path
#         (a placeholder, a glob) only ever makes the column "no".
#   - commits the decomposition (git add -A -- <working dir> + commit) under
#     the message "chore(<commit-prefix>): decompose plan <slug>"; what lands
#     in the index is ONLY the working directory this run built, never any
#     other working-tree change; git noise goes to stderr, so stdout stays a
#     clean index. Outside a git repository the commit
#     is skipped (note on stderr, exit 0) - the working dir is already complete,
#     so a missing repo must never fail the decomposition
#
set -euo pipefail

plan="${1:-}"
prefix="${2:-simplebuild}"

if [[ -z "$plan" ]]; then
  echo "error: missing required parameter 'plan-file'" >&2
  echo "usage: decompose.sh <plan-file> [commit-prefix]" >&2
  exit 1
fi

if [[ ! -f "$plan" ]]; then
  echo "error: plan file not found: $plan" >&2
  exit 1
fi

# --- repository root as the working directory ---
# Every path derived below (the working dir, the index lines, the commit
# pathspec) is repository-root relative, so a run must not depend on the
# directory its caller was started in: resolve the plan to an absolute path
# first - it may well be relative to that caller's cwd - and only then move to
# the repository root. Outside a repository there is no root to move to, so the
# cwd stays put and every derived path resolves against it, exactly as before.
plan_dir="$(CDPATH= cd -- "$(dirname -- "$plan")" && pwd)"
plan="${plan_dir%/}/$(basename -- "$plan")"

# --- reviewed-plan guard ---
# The sidecar sits beside the plan, so this runs on the absolute plan path and
# BEFORE the repository-root cd and before anything is created: a refusal
# leaves no trace on disk. See the header for the four outcomes.
# shellcheck source=lib_sha256.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib_sha256.sh"
reviewed_sidecar="${plan}.sha256"
if [[ -f "$reviewed_sidecar" ]]; then
  reviewed_digest="$(head -n1 -- "$reviewed_sidecar" 2>/dev/null || true)"
  reviewed_digest="${reviewed_digest%%[[:space:]]*}"
  if actual_digest="$(sha256_of "$plan")"; then
    if [[ "$actual_digest" != "$reviewed_digest" ]]; then
      echo "error: plan differs from the reviewed plan ($reviewed_sidecar) - re-run the plan reviewer and ExitPlanMode" >&2
      exit 7
    fi
  else
    echo "warning: cannot compute sha256 - reviewed-plan check skipped" >&2
  fi
else
  echo "warning: no reviewed hash beside the plan ($reviewed_sidecar absent) - decomposing an unverified plan" >&2
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$repo_root" && -d "$repo_root" ]]; then
  CDPATH= cd -- "$repo_root"
else
  # The printed "root:" is joined with this index's relative paths by consumers
  # that open files DIRECTLY - an agent's file reader - not through this shell,
  # so it must carry the platform's native spelling. Git prints one itself
  # ("C:/..." under Git-Bash); plain `pwd` there prints the shell's own form
  # ("/c/..."), which no such reader can open. `pwd -W` gives the native form
  # where the shell offers it and fails everywhere else, where `pwd` is already
  # native.
  repo_root="$(pwd -W 2>/dev/null || pwd)"
fi

# --- slug from the plan's title ---
title_line="$(grep -m1 '^Title:' "$plan" || true)"
raw_title="${title_line#Title:}"
raw_title="$(printf '%s' "$raw_title" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')"

# LC_ALL=C przypina semantyke bajtowa: pod locale UTF-8 GNU sed gubi sie na
# 4-bajtowych znakach (emoji) i zostawia w slugu smieciowy bajt, ktory laduje
# w nazwie katalogu builda i w linii "workdir:" parsowanej przez orkiestrator.
slug="$(printf '%s' "$raw_title" \
  | LC_ALL=C tr '[:upper:]' '[:lower:]' \
  | LC_ALL=C sed -e 's/[^a-z0-9]\{1,\}/-/g' -e 's/^-*//' -e 's/-*$//')"
[[ -z "$slug" ]] && slug="plan"

# --- spec path (the "Spec:" line, superplan template) ---
# Preamble: Title always, Spec only in the superplan template; the HEADER
# section (where there is one) is appended by the awk below. A trailing HTML
# comment on the Spec line is dropped.
# The extraction runs BEFORE the working directory is created (see run_dir_of
# below: dir may adopt the spec's directory) - so a "spec does not exist"
# error leaves no directory behind on disk.
spec_line="$(grep -m1 '^Spec:' "$plan" || true)"
spec_line="$(printf '%s' "$spec_line" | sed -e 's/[[:space:]]*<!--.*-->[[:space:]]*$//')"

# The spec path (superplan template): from the "Spec: <path>" line, outer
# whitespace trimmed; a non-empty path MUST exist - extracting the spec's
# excerpt below is impossible without it, so the drift blows up here rather
# than in the middle of a build.
spec_path="$(printf '%s' "${spec_line#Spec:}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [[ -n "$spec_path" && ! -f "$spec_path" ]]; then
  echo "error: spec file not found: $spec_path (from plan's 'Spec:' line)" >&2
  exit 4
fi

# --- path of the saved intent synthesis (the optional "Intent:" preamble
# line, both tracks) --- unlike Spec:, a missing file is NOT a build error:
# the line reaches the header only when the file exists, and otherwise a
# warning goes to stderr and both the header line and the stdout index entry
# are skipped.
intent_line="$(grep -m1 '^Intent:' "$plan" || true)"
intent_line="$(printf '%s' "$intent_line" | sed -e 's/[[:space:]]*<!--.*-->[[:space:]]*$//')"

intent_path="$(printf '%s' "${intent_line#Intent:}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [[ -n "$intent_path" && ! -f "$intent_path" ]]; then
  echo "warning: intent file not found: $intent_path (from plan's 'Intent:' line) - omitted" >&2
  intent_path=""
fi

# The working directory belonging to path $1: its dirname with "\" normalised
# to "/" (so a Windows path lands too); an empty argument, or a dirname with
# no docs/.workflows/ segment -> an empty result (no trap, never exit != 0).
# When the segment IS there, the WHOLE directory of the Intent:/Spec: file is
# adopted (the tail after the LAST "docs/.workflows/", untruncated) - never
# the part of the path that lies before docs/.workflows/.
run_dir_of() {
  local p="$1"
  [[ -z "$p" ]] && return 0
  p="${p//\\//}"
  local d
  d="$(dirname -- "$p")"
  case "$d" in
    *docs/.workflows/*) ;;
    *) return 0 ;;
  esac
  local tail="${d##*docs/.workflows/}"
  printf '%s\n' "docs/.workflows/${tail}"
}

# Intent: wins over Spec: (it is written first, in the same run directory);
# with neither (or with neither lying under docs/.workflows/) it falls back to
# the name derived from the plan's title.
dir="$(run_dir_of "$intent_path")"
[[ -z "$dir" ]] && dir="$(run_dir_of "$spec_path")"
[[ -z "$dir" ]] && dir="docs/.workflows/$(date +%F)-${slug}"

# Remember whether the working directory existed BEFORE this run - the trap
# below may remove only a directory THIS run created; a resume (a directory
# that was already there) stays untouched even on an error. An adopted
# directory ALWAYS existed earlier (it holds at least intent.md or spec.md),
# so it inherits that guarantee for free - a failed decomposition never
# deletes it.
dir_preexisted=0
[[ -d "$dir" ]] && dir_preexisted=1

# Cleanup on any non-zero exit before the decomposition commit: the working
# directory is removed only when THIS run created it, so an error (no TASK
# section, a missing spec, and so on) leaves no orphaned tree behind. The trap
# is disarmed just before the commit section - a git error past that point
# must leave the fully built working directory in place, not destroy it.
cleanup_on_failure() {
  local status=$?
  if [[ "$status" -ne 0 && "$dir_preexisted" -eq 0 ]]; then
    rm -rf "$dir"
  fi
  exit "$status"
}
trap cleanup_on_failure EXIT

# a fresh tasks directory (drop whatever an earlier run left behind)
rm -rf "$dir/tasks"
mkdir -p "$dir/tasks"

# the directory for the reviewer's reports; an existing one is kept on a resume
mkdir -p "$dir/implementation"

# The criteria source for the per-task "### Covered criteria" section: the
# spec (the superbuild track) or the plan itself - its HEADER's "## Acceptance
# criteria" (the simplebuild track). Always set, so criteria are appended on
# both tracks.
if [[ -n "$spec_path" ]]; then
  crit_source="$spec_path"
else
  crit_source="$plan"
fi

# one section of the spec (its heading plus its body, up to the next "## " or EOF)
spec_section() {
  awk -v h="$1" '
    index($0, h) == 1 { insec=1; print; next }
    insec && /^## /   { exit }
    insec             { print }
  ' "$spec_path"
}

# the text of acceptance criterion number $1, read from crit_source (the
# "N. ..." line plus its continuations, up to the next number, a blank line or
# the end of the section)
criterion_of() {
  awk -v n="$1" '
    /^## Acceptance criteria/ { insec=1; next }
    insec && /^## /           { exit }
    !insec                    { next }
    $0 ~ ("^" n "\\. ")       { grab=1; print; next }
    /^[0-9][0-9]*\. /         { grab=0; next }
    /^[[:space:]]*$/          { grab=0; next }
    grab                      { print }
  ' "$crit_source"
}

# --- the plan's header ---
header="$dir/plan-header.md"
{
  [[ -n "$title_line" ]] && printf '%s\n' "$title_line"
  [[ -n "$spec_line" ]] && printf '%s\n' "$spec_line"
  [[ -n "$intent_path" ]] && printf '%s\n' "$intent_line"
  printf '\n'
} > "$header"

# The superbuild track: the spec's global sections go into the plan header -
# the only part of the spec the per-task forks (implementor / task-reviewer)
# ever see.
if [[ -n "$spec_path" ]]; then
  for sec in "## Out of scope" "## Constraints / assumptions"; do
    content="$(spec_section "$sec")"
    if [[ -n "${content//[[:space:]]/}" ]]; then
      printf '%s\n\n' "$content" >> "$header"
    fi
  done
fi

# --- a copy of the whole plan ---
# The whole plan lands beside the header as plan.md; the decomposition commit
# makes the working directory a self-contained, committed record of the build.
plan_copy="$dir/plan.md"
cp "$plan" "$plan_copy"

# --- the status file: the number of the last processed task (00 = none) ---
# Updated by status-update.sh after every finished task. An existing status is
# kept (a resume); no file -> it is initialised to 00.
status="$dir/status.md"
last="00"
if [[ -f "$status" ]]; then
  parsed="$(sed -n 's/^task:[[:space:]]*\([0-9]\{1,\}\).*$/\1/p' "$status" | head -n1)"
  [[ -n "$parsed" ]] && last="$parsed"
else
  printf 'task: %s\n' "$last" > "$status"
fi

# --- bazowy SHA builda: HEAD sprzed commita dekompozycji ---
# The diff boundary for the Final Review (git diff <base>..HEAD); an existing
# base.md is kept (a resume never moves the base). No commit in the repository
# -> none.
basefile="$dir/base.md"
if [[ -f "$basefile" ]]; then
  base="$(sed -n 's/^base:[[:space:]]*//p' "$basefile" | head -n1)"
  if [[ -z "$base" ]]; then base="none"; fi
else
  # --verify -q: in a repository with no commit, a plain rev-parse HEAD prints
  # the literal "HEAD" on stdout despite the error; the -q form stays silent
  # and lets none be substituted.
  base="$(git rev-parse --verify -q HEAD 2>/dev/null || true)"
  if [[ -z "$base" ]]; then base="none"; fi
  printf 'base: %s\n' "$base" > "$basefile"
fi

# --- the split into task files + the index on stdout ---
# workdir: the working directory; status: the last task's number (or none);
# then the header and the tasks.
echo "workdir: $dir"
echo "root: $repo_root"
if [[ "$((10#$last))" -gt 0 ]]; then
  echo "status: $last"
else
  echo "status: none"
fi
echo "base: $base"
echo "plan-header: $header"
echo "plan: $plan_copy"
[[ -n "$spec_path" ]] && echo "spec: $spec_path"
[[ -n "$intent_path" ]] && echo "intent: $intent_path"
awk -v dir="$dir" -v hdr="$header" '
  # a marker delimits a block only as a WHOLE line (trailing whitespace, a CR
  # included, absorbed) - a plan quoting a marker mid-line is ordinary content
  /^<!-- HEADER -->[[:space:]]*$/   { inhdr=1; next }
  /^<!-- \/HEADER -->[[:space:]]*$/ { inhdr=0; next }
  inhdr                             { print >> hdr; next }

  /^<!-- TASK -->[[:space:]]*$/     { intask=1; n++; sec=""; f=sprintf("%s/tasks/task-%02d.md", dir, n); files[n]=f; next }
  /^<!-- \/TASK -->[[:space:]]*$/   { intask=0; next }
  intask {
    print > f
    # the FIRST non-empty line of the block is the ONLY candidate for its task
    # heading: it must be "## Task <N> - <title>" with a non-empty title (the
    # <N> is not checked against the file index), otherwise the title stays
    # empty and END below aborts the run. A "## " line further down the block
    # is a section of the task body and never fills the slot.
    # (no apostrophe in this comment on purpose - the awk program is a
    # single-quoted shell string)
    if (!seen[n] && $0 ~ /[^[:space:]]/) {
      seen[n]=1
      if ($0 ~ /^##[[:space:]]+Task[[:space:]]+[0-9]+[[:space:]]*-[[:space:]]*[^[:space:]]/) {
        t=$0; sub(/^##[[:space:]]*/, "", t); title[n]=t
      }
    }
    # concurrency inputs, collected from this block only: sec tracks which of
    # the two sections the reader stands in, is reset when the block opens and
    # is closed by the next heading of any depth - so a "(Task 3)" token in
    # "### Approach" prose is never read as a dependency.
    if ($0 ~ /^###[[:space:]]+Dependencies[[:space:]]*$/) { sec="deps"; hasdeps[n]=1; next }
    if ($0 ~ /^###[[:space:]]+Files[[:space:]]*$/)        { sec="files"; hasfiles[n]=1; next }
    if ($0 ~ /^#/)                                        { sec=""; next }
    if (sec == "deps") {
      # every "(Task <N>)" pointer of the section, leading zeros dropped
      s=$0
      while (match(s, /\(Task[[:space:]]+[0-9]+\)/)) {
        d=substr(s, RSTART, RLENGTH); gsub(/[^0-9]/, "", d)
        deps[n]=deps[n] " " (d+0) " "
        s=substr(s, RSTART+RLENGTH)
      }
    }
    else if (sec == "files" && $0 ~ /^-[[:space:]]*(add|modify|delete)[[:space:]]*-[[:space:]]*/) {
      # "- <verb> - <path> (<symbol>)" -> the path alone, the annotation cut,
      # kept verbatim otherwise (a non-literal path stays the token it is)
      p=$0
      sub(/^-[[:space:]]*(add|modify|delete)[[:space:]]*-[[:space:]]*/, "", p)
      q=index(p, " (")
      if (q > 0) p=substr(p, 1, q-1)
      sub(/[[:space:]]+$/, "", p)
      if (p != "") fpaths[n]=fpaths[n] p "\n"
    }
    # per-task build-strength markers: first "- Model:" / "- Review:" line
    # wins; value trimmed, passed through verbatim (validity belongs to the
    # plan reviewer). No "- Effort:" capture: that line is body text only.
    if (model[n] == "" && $0 ~ /^-[[:space:]]*Model:/) { m=$0; sub(/^-[[:space:]]*Model:[[:space:]]*/, "", m); sub(/[[:space:]]+$/, "", m); model[n]=m }
    if (review[n] == "" && $0 ~ /^-[[:space:]]*Review:/) { r=$0; sub(/^-[[:space:]]*Review:[[:space:]]*/, "", r); sub(/[[:space:]]+$/, "", r); review[n]=r }
    next
  }

  END {
    if (n == 0) { print "error: no <!-- TASK --> blocks found in plan" > "/dev/stderr"; exit 3 }
    # a task nobody can name is not a task: report EVERY heading-less block,
    # then abort - before any index row reaches stdout, so no consumer ever
    # sees a row with an empty heading column
    headless=0
    for (i = 1; i <= n; i++) {
      if (title[i] == "") {
        printf("error: task-%02d.md has no task heading\n", i) > "/dev/stderr"
        headless=1
      }
    }
    if (headless) exit 6
    # a title the orchestrator spends as a double-quoted shell argument to
    # commit-task.sh: a backtick or a "$(" in it would be executed in the host
    # repo root, a double quote would split the argument. Report EVERY
    # offending block, then abort before any index row reaches stdout.
    unsafe=0
    for (i = 1; i <= n; i++) {
      if (title[i] ~ /[`$"\\]/) {
        printf("error: task-%02d.md title carries a shell metacharacter (one of ` $ \" \\): %s\n", i, title[i]) > "/dev/stderr"
        unsafe=1
      }
    }
    if (unsafe) exit 8
    for (i = 1; i <= n; i++) {
      # fifth column: may this task be started while the PRECEDING one is
      # still under review? Read conservatively - anything unknown is "no".
      prev=i-1
      conc="no"
      if (i > 1 && hasdeps[i] && hasfiles[i] && hasfiles[prev] && index(deps[i], " " prev " ") == 0) {
        conc="yes"
        cnt=split(fpaths[i], cur, "\n")
        for (j = 1; j <= cnt; j++) {
          if (cur[j] == "") continue
          # both sides are newline-delimited, so the search is for a WHOLE
          # entry: "b/c.sh" never matches inside "a/b/c.sh"
          if (index("\n" fpaths[prev], "\n" cur[j] "\n") > 0) { conc="no"; break }
        }
      }
      printf "%s\t%s\t%s\t%s\t%s\n", files[i], title[i], (model[i] == "" ? "-" : model[i]), (review[i] == "" ? "-" : review[i]), conc
    }
  }
' "$plan"

# --- acceptance criteria into the task files (both tracks) ---
# Every task gets, verbatim, the text of the criteria its "Covers:" line names,
# read from crit_source (the spec on the superbuild track, the plan's HEADER on
# the simplebuild track) - so a per-task fork never has to scan the whole
# thing. A criterion named in "Covers:" and absent from the source is drift ->
# a hard error.
for task_file in "$dir"/tasks/task-*.md; do
  # the messages below are human-facing prose, so they name the task in the
  # review contract's reference form - the bare title, the pointer supplied by
  # the "(task-NN.md)" that follows it - never the whole heading
  task_title="$(sed -n 's/^##[[:space:]]*//p' "$task_file" | head -n 1 | sed -e 's/^Task[[:space:]]*[0-9][0-9]*[[:space:]]*-[[:space:]]*//')"
  covers="$(grep -m1 '^-[[:space:]]*Covers:' "$task_file" || true)"
  nums="$(printf '%s\n' "$covers" | grep -o '#[0-9][0-9]*' | tr -d '#' || true)"
  if [[ -z "$nums" ]]; then
    printf 'warning: `%s` (%s) has no '"'"'Covers:'"'"' criteria - none appended\n' "$task_title" "$(basename "$task_file")" >&2
    continue
  fi
  crit_block=""
  for n in $nums; do
    text="$(criterion_of "$n")"
    if [[ -z "${text//[[:space:]]/}" ]]; then
      printf 'error: `%s` (%s) covers criterion #%s, absent from source: %s\n' "$task_title" "$(basename "$task_file")" "$n" "$crit_source" >&2
      exit 5
    fi
    crit_block+="$text"$'\n'
  done
  printf '\n### Covered criteria\n%s' "$crit_block" >> "$task_file"
done

# The working directory is fully built now - a git error below must leave it
# in place rather than destroy it, so the cleanup trap is disarmed.
trap - EXIT

# --- commit dekompozycji ---
# The commit is best-effort. Outside a git repository there is nothing to commit
# to, and the working dir above is already complete on disk - so skip it and exit
# clean, instead of letting `set -e` turn git's exit 128 into a failed decompose
# that stops the whole build.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "decompose: not a git repository - skipping commit" >&2
  exit 0
fi

# Only the run directory this script built enters the decomposition commit:
# whatever else sits in the working tree (a parallel edit, a stray file) is the
# user's, and staging it here would smuggle it into a commit nobody declared.
# Git noise goes to stderr, so stdout carries the index alone.
git add -A -- "$dir"
if git diff --cached --quiet; then
  echo "decompose: nothing to commit" >&2
else
  git commit -m "chore($prefix): decompose plan $slug" >&2
fi
