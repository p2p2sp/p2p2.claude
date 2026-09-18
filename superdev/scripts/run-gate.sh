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
# and carries that reason: the plan decided it has nothing to run and said why.
# One the block does not hold AT ALL is a different case and carries a
# different word - "absent - <reason>", counted red - because nothing was
# decided about it and the stage's gate is short a whole subsection; the
# contract's "## Gates" is what turns that into a BLOCKED. A subsection the
# stage does not select gets no line and no detail block.
# Every other entry is one command, its "- " or "* " bullet stripped; a "---"
# rule and a blank line are skipped.
#
# Behaviour:
#   - each collected command runs through the sibling runner
#     skills/executor/scripts/run.sh, resolved from THIS script's own location,
#     one invocation per command, fed `command:`, `expect-exit: 0` and a
#     `timeout:` on stdin. The commands run in the CALLER's working directory
#     (the runner's own `cwd:` default), so the orchestrator calls this script
#     from the host repository root.
#   - GATE_BUDGET bounds the WHOLE run, not one command: each command is fed
#     what is left of it, and one that would start with nothing left is not
#     run at all - its entry carries a RESULT / STATUS / REASON triple naming
#     the spent budget and counts red, so the round says what it did not get
#     to rather than leaving a silent gap.
#   - the budget exists because the orchestrator calls this script through its
#     own tool, whose timeout caps at 600 s: a per-command bound cannot keep
#     three slow commands inside that, and a script the caller kills writes no
#     block and prints no RED: line at all. 540 leaves the caller its headroom.
#     The runner's own default of 600 is never used here - too short for one
#     slow suite, too long for a set of them.
#   - GATE_BUDGET is read from the environment only so this script's own tests
#     can exercise the spent-budget path in a second; no caller of a build ever
#     sets it, and it is not a parameter of the contract.
#   - a command whose run comes back on the runner's pre-launch error path
#     (exit 2, the RESULT / STATUS / REASON triple) does not stop the round:
#     the remaining commands still run, that triple is carried into the block
#     and the command counts as red.
#
# Output file - written whole, never appended to:
#   # <closing stage> review          "checkpoint" or "final"
#
#   ## Gates
#   <subsection> - pass|red - <n>s      one line per selected subsection, in
#   <subsection> - none - <reason>      Build, Tests, Integration order; the
#   <subsection> - absent - <reason>    wall time is the sum of its commands'
#                                       DURATION values
#
#   ### <subsection>                  one detail block per command, in the
#   COMMAND: <the command>            same order. COMMAND and TIMEOUT are
#   TIMEOUT: <n>s                     written by THIS script - the command it
#   RESULT: ...                       ran and the bound it gave that run - and
#   STATUS: ...                       then every line the runner printed for
#   EXIT: ...                         it, verbatim and in its order: RESULT,
#   DURATION: ...                     STATUS, EXIT, DURATION, LOG, LINES and
#   LOG: ...                          TAIL where the runner printed one, or
#   LINES: ...                        the shorter RESULT / STATUS / REASON
#   TAIL: ...                         triple of its pre-launch error path.
#                                     Nothing is filtered: a reviewer's
#                                     evidence rules read TAIL and LOG off this
#                                     block, the COMMAND line is what names the
#                                     entry when a subsection holds several
#                                     commands, and a BLOCKED bullet on a
#                                     timeout names the TIMEOUT seconds. A
#                                     command the budget left no room for
#                                     carries COMMAND plus a RESULT / STATUS /
#                                     REASON triple and no TIMEOUT: it was
#                                     never given one.
#
# STDOUT - nothing at all on any non-zero exit; on exit 0, in this order:
#   <subsection>: pass|red|       one line per selected subsection
#                 none|absent
#   GATES: <out-file>             the path exactly as it was given
#   RED: yes|no                   yes when any command came back anything other
#                                 than "RESULT: SUCCESS", a pre-launch error
#                                 and a command the budget left no room for
#                                 included, and yes for an "absent"
#                                 subsection; a "none - <reason>" subsection is
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

# The bound on the WHOLE run, in seconds - not on one command. See "Behaviour"
# above for why it is a whole-run budget and why the environment may override
# it (this script's own tests, and nothing else).
GATE_BUDGET="${GATE_BUDGET:-540}"
# A value that is not a positive integer is not an error worth a round: fall
# back rather than let bash arithmetic read it as 0 and skip every command.
[[ "$GATE_BUDGET" =~ ^[1-9][0-9]*$ ]] || GATE_BUDGET=540

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
  absent=0
  if [[ ${#current_entries[@]} -eq 0 ]]; then
    absent=1
  elif [[ ${#current_entries[@]} -eq 1 ]]; then
    case "${current_entries[0]}" in
      none | none\ -\ *) none_reason="${current_entries[0]}" ;;
    esac
  fi

  if [[ $absent -eq 1 ]]; then
    # NOT a "none - <reason>" subsection: there the plan decided the
    # subsection has nothing to run and said why. Here the plan says nothing
    # about it at all, so the stage's gate is short a whole subsection and
    # nobody chose that. It counts red, so a checkpoint round whose only
    # fault is this still dispatches the reviewer that settles it.
    summary+=("$subsection - absent - the plan's ## Gate commands block holds no such subsection")
    printed+=("$subsection: absent")
    red=1
    continue
  fi

  if [[ -n "$none_reason" ]]; then
    summary+=("$subsection - $none_reason")
    printed+=("$subsection: none")
    continue
  fi

  subsection_red=0
  subsection_seconds=0
  for gate_command in "${current_entries[@]}"; do
    details+=("" "### $subsection" "COMMAND: $gate_command")
    # SECONDS counts from this script's own start, so it IS the elapsed run.
    remaining=$((GATE_BUDGET - SECONDS))
    if (( remaining < 1 )); then
      # Reported, never started: the caller's own timeout is what the budget
      # protects, and an entry the contract's case 1 settles as BLOCKED says
      # more about the round than a command killed from outside ever could.
      details+=("RESULT: DEVIATION" "STATUS: error" \
        "REASON: gate budget of ${GATE_BUDGET}s spent before this command ran")
      subsection_red=1
      red=1
      continue
    fi
    # The bound this command actually got. The runner never prints it back, and
    # a reviewer's BLOCKED bullet on a timeout has to name the seconds it was
    # given - which is no longer a constant anyone could infer from the script.
    details+=("TIMEOUT: ${remaining}s")
    block="$(printf 'command: %s\nexpect-exit: 0\ntimeout: %s\n' "$gate_command" "$remaining" | "$RUNNER")"
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
