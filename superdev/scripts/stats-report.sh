#!/usr/bin/env bash
#
# stats-report.sh - renders ONE run's stats report from the events
# stats-record.sh appended and the fixed template shipped beside it.
#
# Usage:
#   stats-report.sh <workdir>
#
# workdir  (required) - the run's working directory, as decompose.sh prints it
#          (docs/.workflows/<run>/); a trailing "/" and a leading "./" are
#          tolerated and normalised away, exactly as stats-record.sh does. It
#          names the run AND is read for the anomaly counters below.
#
# RUN ID: derived from <workdir> exactly as stats-record.sh derives it - the
# tail after the LAST "docs/.workflows/" segment with its path segments joined
# by "-", and the basename when the workdir carries no such segment - so both
# scripts always name the same run.
#
# INPUT:  .temp/superdev/stats/<run>.events, relative to the current working
#         directory (the host repo root, where the orchestrator runs). One
#         event is one tab-separated line of ten fields:
#           <epoch seconds> kind label model effort tokens tool_uses
#           duration_ms verdict note
#         A line carrying fewer fields has every missing one read as "-".
#         Also <workdir>/implementation/*.md, for the anomaly counters.
# TEMPLATE: ../references/stats-template.md, beside this script's own dir. Its
#         five placeholders - {{RUN}}, {{TASKS_TABLE}}, {{KINDS_TABLE}},
#         {{TOTALS}}, {{ANOMALIES}} - each appear exactly once and are
#         substituted here; nothing else in the rendered file varies.
# OUTPUT: .temp/superdev/stats/<run>.md, written whole on every run, plus the
#         single machine line "stats: <path>" on stdout.
#
# WALL TIME: one event's wall time is its own duration_ms rounded to whole
# seconds when it carries one, and otherwise the gap between the previous
# event's stamp and its own - the rule that gives a `Skill` fork, whose
# result carries no usage figures, its time. The run's total wall time spans
# the `start` (or `resume`) event to the last event, the first event standing
# in when there is none. Every wall figure prints mm:ss, minutes uncapped.
#
# TOTALS: the run's wall time, its summed tokens and its dispatch count -
# every event except the `start` and `resume` markers, the kind table holding
# the breakdown.
#
# PER TASK: one row per label - the caller's own name for the dispatch (a task
# file, a writer, a review round) - in first-appearance order, carrying the
# implementor's and the reviewer's strength - <model> alone when its effort is
# "-" (every event the orchestrators record from this change on), else
# <model>/<effort> - the count of review events, the summed wall time and the
# summed tokens. A label enters this table when one of its events carries a
# model or has a kind naming an implementor or a review; every other label is
# a run marker, a commit or a fork and lives in the kind table alone.
#
# PER KIND: one row per kind, in first-appearance order, with its event count,
# summed wall time and summed tokens.
#
# ANOMALIES: two sources. One line per event carrying a note, shaped
# "<mm:ss offset from start> <kind> <label> - <note>", then a counter table
# per task counting the "UNDERSPECIFIED:", "DECISION:", "CARRY:", "touched:"
# and "NOTE: plan defect" lines of <workdir>/implementation/*.md (each at the
# start of its line, a leading "- " tolerated) plus that task's review rounds
# past the first (its task-NN-review-R.md files). A file's task is the
# "<name>-<NN>" head of its basename, or the whole basename when it has none.
# A row appears only when one of its counters is non-zero. Neither source
# yielding anything prints the single line "none".
#
# Tokens sum the numeric fields only: a "-" contributes nothing, and a row
# with no numeric token at all prints "-".
#
# A missing or empty <workdir> -> "error: missing required parameter" plus the
# usage line on stderr, exit 1, nothing written. A missing events file ->
# "error: no events file: <path>" on stderr, exit 1, nothing written. A
# <workdir>/implementation/ that does not exist -> every counter zero and no
# counter row.
#
set -euo pipefail

usage() {
  echo "usage: stats-report.sh <workdir>" >&2
}

raw_workdir="${1-}"
if [[ -z "$raw_workdir" ]]; then
  echo "error: missing required parameter" >&2
  usage
  exit 1
fi

# normalise workdir: drop a trailing "/" and a leading "./"
dir="${raw_workdir%/}"
[[ "$dir" == ./* ]] && dir="${dir#./}"

# run id: the tail after the LAST "docs/.workflows/", its segments joined with
# "-"; the basename when the workdir carries no such segment
marker="docs/.workflows/"
tail_path=""
[[ "$dir" == *"$marker"* ]] && tail_path="${dir##*"$marker"}"
if [[ -n "$tail_path" ]]; then
  run="${tail_path//\//-}"
else
  run="${dir##*/}"
fi

stats_dir=".temp/superdev/stats"
events="$stats_dir/$run.events"
report="$stats_dir/$run.md"

if [[ ! -f "$events" ]]; then
  echo "error: no events file: $events" >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
template="$script_dir/../references/stats-template.md"
if [[ ! -f "$template" ]]; then
  echo "error: no template: $template" >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

tasks_block="$work/tasks"
kinds_block="$work/kinds"
totals_block="$work/totals"
notes_block="$work/notes"
counters_block="$work/counters"
anomalies_block="$work/anomalies"

# ---------------------------------------------------------------------------
# one pass over the events: the task table, the kind table, the totals and the
# noted events
# ---------------------------------------------------------------------------
awk -v tasks_out="$tasks_block" \
    -v kinds_out="$kinds_block" \
    -v totals_out="$totals_block" \
    -v notes_out="$notes_block" '
function fld(value) { return (value == "" ? "-" : value) }
function mmss(secs,   mins) {
  if (secs < 0) secs = 0
  mins = int(secs / 60)
  return sprintf("%02d:%02d", mins, secs % 60)
}
function strength(model, effort) {
  if (model == "-" && effort == "-") return "-"
  if (effort == "-") return model
  return model "/" effort
}
function tokens_cell(seen, sum) { return (seen ? sum "" : "-") }
BEGIN { FS = "\t" }
/^[ \t]*$/ { next }
{
  n++
  stamp = $1 + 0
  kind = fld($2); label = fld($3); model = fld($4); effort = fld($5)
  tokens = fld($6); duration = fld($8); note = fld($10)

  if (n == 1) first_stamp = stamp
  last_stamp = stamp
  if (run_start == "" && (kind == "start" || kind == "resume")) run_start = stamp

  if (duration ~ /^[0-9]+$/) secs = int((duration + 500) / 1000)
  else if (n > 1) secs = stamp - prev_stamp
  else secs = 0
  if (secs < 0) secs = 0
  prev_stamp = stamp

  has_tokens = (tokens ~ /^[0-9]+$/)
  if (has_tokens) { total_tokens += tokens; total_tokens_seen = 1 }
  if (kind != "start" && kind != "resume") dispatches++

  # per kind
  if (!(kind in kind_seen)) { kind_seen[kind] = 1; kind_order[++kind_n] = kind }
  kind_count[kind]++
  kind_wall[kind] += secs
  if (has_tokens) { kind_tokens[kind] += tokens; kind_tokens_seen[kind] = 1 }

  # per label
  if (!(label in label_seen)) { label_seen[label] = 1; label_order[++label_n] = label }
  label_wall[label] += secs
  if (has_tokens) { label_tokens[label] += tokens; label_tokens_seen[label] = 1 }
  if (model != "-" || kind ~ /implement|review/) label_is_task[label] = 1
  if (kind ~ /implement/ && !(label in label_impl)) label_impl[label] = strength(model, effort)
  if (kind ~ /review/) {
    label_rounds[label]++
    if (!(label in label_review)) label_review[label] = strength(model, effort)
  }
  if (model != "-" && !(label in label_any)) label_any[label] = strength(model, effort)

  if (note != "-") {
    note_n++
    note_stamp[note_n] = stamp
    note_kind[note_n] = kind
    note_label[note_n] = label
    note_text[note_n] = note
  }
}
END {
  base = (run_start == "" ? first_stamp : run_start)

  rows = 0
  for (i = 1; i <= label_n; i++) {
    label = label_order[i]
    if (!(label in label_is_task)) continue
    if (rows == 0) {
      print "| Task | Implementor | Review | Rounds | Wall | Tokens |" > (tasks_out)
      print "| --- | --- | --- | --- | --- | --- |" > (tasks_out)
    }
    rows++
    impl = (label in label_impl) ? label_impl[label] : ((label in label_any) ? label_any[label] : "-")
    review = (label in label_review) ? label_review[label] : "-"
    printf "| %s | %s | %s | %d | %s | %s |\n", \
      label, impl, review, label_rounds[label] + 0, mmss(label_wall[label] + 0), \
      tokens_cell(label_tokens_seen[label], label_tokens[label] + 0) > (tasks_out)
  }
  if (rows == 0) print "none" > (tasks_out)
  close(tasks_out)

  if (kind_n > 0) {
    print "| Kind | Count | Wall | Tokens |" > (kinds_out)
    print "| --- | --- | --- | --- |" > (kinds_out)
    for (i = 1; i <= kind_n; i++) {
      kind = kind_order[i]
      printf "| %s | %d | %s | %s |\n", \
        kind, kind_count[kind], mmss(kind_wall[kind] + 0), \
        tokens_cell(kind_tokens_seen[kind], kind_tokens[kind] + 0) > (kinds_out)
    }
  } else {
    print "none" > (kinds_out)
  }
  close(kinds_out)

  print "- Wall time: " mmss(last_stamp - base) > (totals_out)
  print "- Tokens: " tokens_cell(total_tokens_seen, total_tokens + 0) > (totals_out)
  print "- Dispatches: " dispatches + 0 > (totals_out)
  close(totals_out)

  for (i = 1; i <= note_n; i++) {
    printf "%s %s %s - %s\n", \
      mmss(note_stamp[i] - base), note_kind[i], note_label[i], note_text[i] > (notes_out)
  }
  close(notes_out)
}
' "$events"

# ---------------------------------------------------------------------------
# the anomaly counters, read out of <workdir>/implementation/
# ---------------------------------------------------------------------------
: > "$counters_block"
impl_dir="$dir/implementation"
if [[ -d "$impl_dir" ]]; then
  shopt -s nullglob
  impl_files=("$impl_dir"/*.md)
  shopt -u nullglob
  if [[ ${#impl_files[@]} -gt 0 ]]; then
    awk -v out="$counters_block" '
function task_of(path,   base) {
  base = path
  sub(/^.*\//, "", base)
  sub(/\.md$/, "", base)
  if (match(base, /^[A-Za-z]+-[0-9]+/)) return substr(base, 1, RLENGTH)
  return base
}
function basename_of(path,   base) {
  base = path
  sub(/^.*\//, "", base)
  sub(/\.md$/, "", base)
  return base
}
FNR == 1 {
  task = task_of(FILENAME)
  if (!(task in seen)) { seen[task] = 1; order[++n] = task }
  if (basename_of(FILENAME) ~ /^task-[0-9]+-review-[0-9]+$/) reviews[task]++
}
/^(- )?UNDERSPECIFIED:/ { under[task]++ }
/^(- )?DECISION:/ { decision[task]++ }
/^(- )?CARRY:/ { carry[task]++ }
/^(- )?touched:/ { touched[task]++ }
/^(- )?NOTE: plan defect/ { defect[task]++ }
END {
  rows = 0
  for (i = 1; i <= n; i++) {
    task = order[i]
    extra = (reviews[task] > 1 ? reviews[task] - 1 : 0)
    if (under[task] + decision[task] + carry[task] + touched[task] + defect[task] + extra == 0) continue
    if (rows == 0) {
      print "| Task | UNDERSPECIFIED | DECISION | CARRY | touched | NOTE: plan defect | Extra review rounds |" > (out)
      print "| --- | --- | --- | --- | --- | --- | --- |" > (out)
    }
    rows++
    printf "| %s | %d | %d | %d | %d | %d | %d |\n", \
      task, under[task] + 0, decision[task] + 0, carry[task] + 0, touched[task] + 0, defect[task] + 0, extra > (out)
  }
  close(out)
}
' "${impl_files[@]}"
  fi
fi

# ---------------------------------------------------------------------------
# the anomalies block: the noted events, then the counter table, then "none"
# when neither source yielded anything
# ---------------------------------------------------------------------------
: > "$anomalies_block"
[[ -s "$notes_block" ]] && cat "$notes_block" >> "$anomalies_block"
if [[ -s "$counters_block" ]]; then
  [[ -s "$notes_block" ]] && echo "" >> "$anomalies_block"
  cat "$counters_block" >> "$anomalies_block"
fi
[[ -s "$anomalies_block" ]] || echo "none" > "$anomalies_block"

# ---------------------------------------------------------------------------
# render the template
# ---------------------------------------------------------------------------
mkdir -p "$stats_dir"
awk -v run="$run" \
    -v tasks_in="$tasks_block" \
    -v kinds_in="$kinds_block" \
    -v totals_in="$totals_block" \
    -v anomalies_in="$anomalies_block" '
function emit(file,   line) {
  while ((getline line < file) > 0) print line
  close(file)
}
function subst(text, token, value,   out, at) {
  out = ""
  while ((at = index(text, token)) > 0) {
    out = out substr(text, 1, at - 1) value
    text = substr(text, at + length(token))
  }
  return out text
}
{
  line = subst($0, "{{RUN}}", run)
  if (index(line, "{{TASKS_TABLE}}") > 0) { emit(tasks_in); next }
  if (index(line, "{{KINDS_TABLE}}") > 0) { emit(kinds_in); next }
  if (index(line, "{{TOTALS}}") > 0) { emit(totals_in); next }
  if (index(line, "{{ANOMALIES}}") > 0) { emit(anomalies_in); next }
  print line
}
' "$template" > "$report"

echo "stats: $report"
