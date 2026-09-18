#!/usr/bin/env bash
#
# run-gate.sh - runs ONE review round's gate command set, once, and writes the
# round's gate block.
#
# Why it exists: every reviewer of a round used to run the plan's gate commands
# itself, so one round's suite ran two or three times and two reviewers of the
# same tree could read two different results of it. The orchestrator now runs
# the stage's whole set once through this script and hands the block it wrote
# to every reviewer of the round on its `gates:` label; a reviewer runs no gate
# command at all.
#
# Usage:
#   run-gate.sh <workdir> <stage> <out-file>
#
# Parameters:
#   workdir   (required) - the run's working directory. <workdir>/plan.md is
#             read for its "## Gate commands" block, the one ABOVE the first
#             "<!-- TASK -->" marker; nothing below that marker is ever
#             collected, so a task's "### Task Checks" line never runs here.
#   stage     (required) - one of `checkpoint`, `final`, `re-review:checkpoint`
#             or `re-review:final`. The set is closed: every other value is a
#             usage error. A `re-review:<closing-stage>` value runs the set of
#             the stage it names and titles the block with it.
#   out-file  (required) - the file this script writes whole, used VERBATIM as
#             given: no name is derived here, so a caller passing a
#             `re-review:` stage names the file itself. Its parent directory
#             must already exist.
#
# Subsections per stage, taken from the gate block's "#### " headings:
#   checkpoint, re-review:checkpoint  ->  Build, Tests
#   final, re-review:final            ->  Build, Tests, Integration
# A selected subsection whose single entry reads "none - <reason>" is not run
# and carries that reason; so is one the block does not hold at all, whose
# reason is then "none - absent from the plan's ## Gate commands block". A
# subsection the stage does not select gets no line and no detail block.
# Every other entry is one command, its "- " or "* " bullet stripped; a "---"
# rule and a blank line are skipped.
#
# Behaviour:
#   - each collected command runs through the sibling runner
#     skills/executor/scripts/run.sh, resolved from THIS script's own location,
#     one invocation per command, fed `command:`, `expect-exit: 0` and
#     `timeout: 1800` on stdin. The commands run in the CALLER's working
#     directory (the runner's own `cwd:` default), so the orchestrator calls
#     this script from the host repository root.
#   - 1800 is a fixed constant of this script, never an input: a deterministic
#     caller cannot judge how slow a host's suite is, and the runner's own
#     default of 600 is too short for a slow one. Half an hour is the generous
#     bound that still names a hung command within one round.
#   - a command whose run comes back on the runner's pre-launch error path
#     (exit 2, the RESULT / STATUS / REASON triple) does not stop the round:
#     the remaining commands still run, that triple is carried into the block
#     and the command counts as red.
#
# Output file - written whole, never appended to:
#   # <closing stage> review          "checkpoint" or "final"
#
#   ## Gates
#   <subsection> - pass|red - <n>s    one line per selected subsection, in
#   <subsection> - none - <reason>    Build, Tests, Integration order; the wall
#                                     time is the sum of its commands'
#                                     DURATION values
#
#   ### <subsection>                  one detail block per command run, in the
#   COMMAND: <the command>            same order, carrying every line the
#   RESULT: ...                       runner printed for it, verbatim and in
#   STATUS: ...                       its order - RESULT, STATUS, EXIT,
#   EXIT: ...                         DURATION, LOG, LINES and TAIL where the
#   DURATION: ...                     runner printed one, or the shorter
#   LOG: ...                          RESULT / STATUS / REASON triple of its
#   LINES: ...                        pre-launch error path. Nothing is
#   TAIL: ...                         filtered: a reviewer's evidence rules
#                                     read TAIL and LOG off this block, and the
#                                     COMMAND line is what names the entry when
#                                     a subsection holds several commands.
#
# STDOUT - nothing at all on any non-zero exit; on exit 0, in this order:
#   <subsection>: pass|red|none   one line per selected subsection
#   GATES: <out-file>             the path exactly as it was given
#   RED: yes|no                   yes when any command came back anything other
#                                 than "RESULT: SUCCESS", a pre-launch error
#                                 included; a "none - <reason>" subsection is
#                                 never red. ALWAYS the last line.
#
# EXIT CODE: 0 whatever the gate commands returned - a command's outcome is
# DATA, carried on the RED: line, never this script's own status.
#   1  a missing argument, or a <stage> outside its accepted set (the usage
#      line on stderr, no command run and no file written); or a
#      <workdir>/plan.md that is absent or holds no "## Gate commands" block
#      (the reason on stderr)
#   2  the sibling runner cannot be resolved from this script's own location,
#      or <out-file> cannot be written (the reason on stderr)
#
# `set -e` is deliberately absent, for the reason run.sh states about its own:
# a failing gate command is this script's ORDINARY result, not its own error,
# and an exiting shell would destroy the very block this script exists to
# write.
#
set -uo pipefail

# The bound every gate command gets, in seconds. See "Behaviour" above.
GATE_TIMEOUT=1800

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PLUGIN_ROOT/skills/executor/scripts/run.sh"

usage() {
  echo "usage: run-gate.sh <workdir> <stage> <out-file>" >&2
  echo "       <stage>: checkpoint | final | re-review:checkpoint | re-review:final" >&2
}

# Strips leading and trailing whitespace.
trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

workdir="${1:-}"
stage="${2:-}"
out_file="${3:-}"

if [[ -z "$workdir" || -z "$stage" || -z "$out_file" ]]; then
  usage
  exit 1
fi

# The closing stage: what selects the subsections and what titles the block.
case "$stage" in
  checkpoint | re-review:checkpoint) closing="checkpoint" ;;
  final | re-review:final) closing="final" ;;
  *)
    usage
    exit 1
    ;;
esac

if [[ "$closing" == "final" ]]; then
  selected=("Build" "Tests" "Integration")
else
  selected=("Build" "Tests")
fi

if [[ ! -f "$RUNNER" ]]; then
  echo "error: runner not found: $RUNNER" >&2
  exit 2
fi

plan="$workdir/plan.md"
if [[ ! -f "$plan" ]]; then
  echo "error: no plan to read gate commands from: $plan" >&2
  exit 1
fi

build_entries=()
tests_entries=()
integration_entries=()
block_found=0

# Reads the "## Gate commands" block above the first "<!-- TASK -->" marker
# into the three arrays above. The block closes at that marker or at the next
# level-2 heading, so a plan that puts another "## " section between the block
# and the first task contributes nothing from it.
read_gate_block() {
  local line entry current="" in_block=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    case "$line" in
      '<!-- TASK -->'*) break ;;
    esac
    if [[ $in_block -eq 0 ]]; then
      if [[ "$line" == '## Gate commands'* ]]; then
        in_block=1
        block_found=1
      fi
      continue
    fi
    case "$line" in
      '## '*) break ;;
      '#### '*)
        current="$(trim "${line#"#### "}")"
        continue
        ;;
      '#'*) continue ;;
    esac
    entry="$(trim "$line")"
    [[ -n "$entry" ]] || continue
    [[ "$entry" != "---" ]] || continue
    case "$entry" in
      -\ * | \*\ *) entry="$(trim "${entry#?}")" ;;
    esac
    [[ -n "$entry" ]] || continue
    case "$current" in
      Build) build_entries+=("$entry") ;;
      Tests) tests_entries+=("$entry") ;;
      Integration) integration_entries+=("$entry") ;;
    esac
  done < "$plan"
}

read_gate_block

if [[ $block_found -eq 0 ]]; then
  echo "error: no '## Gate commands' block in $plan" >&2
  exit 1
fi

# The out-file is probed before the first command runs: a whole gate set is too
# expensive to spend on a block that cannot be written afterwards. The
# `2>/dev/null` comes FIRST on purpose - redirections are set up left to right,
# so with it second the shell's own "No such file or directory" would already
# have reached the real stderr and joined the one reason line below.
: 2>/dev/null >"$out_file" || {
  echo "error: cannot write gate block: $out_file" >&2
  exit 2
}

# One subsection's entries, into the global `current_entries`. Indexed arrays
# only: bash 3.2 (the macOS system shell) has no associative array.
current_entries=()
select_entries() {
  current_entries=()
  case "$1" in
    Build) current_entries=(${build_entries[@]+"${build_entries[@]}"}) ;;
    Tests) current_entries=(${tests_entries[@]+"${tests_entries[@]}"}) ;;
    Integration) current_entries=(${integration_entries[@]+"${integration_entries[@]}"}) ;;
  esac
}

summary=()      # the "## Gates" lines
details=()      # the "### <subsection>" detail blocks
printed=()      # the stdout lines, held back until the file is written
red=0

for subsection in "${selected[@]}"; do
  select_entries "$subsection"
  none_reason=""
  if [[ ${#current_entries[@]} -eq 0 ]]; then
    none_reason="none - absent from the plan's ## Gate commands block"
  elif [[ ${#current_entries[@]} -eq 1 ]]; then
    case "${current_entries[0]}" in
      none | none\ -\ *) none_reason="${current_entries[0]}" ;;
    esac
  fi

  if [[ -n "$none_reason" ]]; then
    summary+=("$subsection - $none_reason")
    printed+=("$subsection: none")
    continue
  fi

  subsection_red=0
  subsection_seconds=0
  for gate_command in "${current_entries[@]}"; do
    block="$(printf 'command: %s\nexpect-exit: 0\ntimeout: %s\n' "$gate_command" "$GATE_TIMEOUT" | "$RUNNER")"
    details+=("" "### $subsection" "COMMAND: $gate_command")
    command_result=""
    while IFS= read -r reply_line; do
      reply_line="${reply_line%$'\r'}"
      [[ -n "$reply_line" ]] || continue
      details+=("$reply_line")
      case "$reply_line" in
        'RESULT: '*)
          [[ -n "$command_result" ]] || command_result="${reply_line#RESULT: }"
          ;;
        'DURATION: '*)
          seconds="${reply_line#DURATION: }"
          seconds="${seconds%s}"
          if [[ "$seconds" =~ ^[0-9]+$ ]]; then
            subsection_seconds=$((subsection_seconds + seconds))
          fi
          ;;
      esac
    done <<< "$block"
    # Anything but SUCCESS is red, an unreadable or empty reply included: a
    # command that produced no verdict never proved the tree green.
    if [[ "$command_result" != "SUCCESS" ]]; then
      subsection_red=1
      red=1
    fi
  done

  if [[ $subsection_red -eq 1 ]]; then
    summary+=("$subsection - red - ${subsection_seconds}s")
    printed+=("$subsection: red")
  else
    summary+=("$subsection - pass - ${subsection_seconds}s")
    printed+=("$subsection: pass")
  fi
done

{
  printf '# %s review\n' "$closing"
  printf '\n'
  printf '## Gates\n'
  for line in ${summary[@]+"${summary[@]}"}; do
    printf '%s\n' "$line"
  done
  for line in ${details[@]+"${details[@]}"}; do
    printf '%s\n' "$line"
  done
} 2>/dev/null >"$out_file" || {
  echo "error: cannot write gate block: $out_file" >&2
  exit 2
}

for line in ${printed[@]+"${printed[@]}"}; do
  printf '%s\n' "$line"
done
printf 'GATES: %s\n' "$out_file"
if [[ $red -eq 1 ]]; then
  printf 'RED: yes\n'
else
  printf 'RED: no\n'
fi
exit 0
