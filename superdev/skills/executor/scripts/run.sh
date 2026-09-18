#!/usr/bin/env bash
#
# run.sh - runs ONE shell command, captures its whole output in a log file, and
# prints a short, fixed status block. The caller never sees that output itself,
# only this block plus whatever it chooses to read back from the log. The block
# carries its own verdict on the RESULT: line, so a caller can run this script
# directly and act on a SUCCESS without a fork; the superdev:executor fork is
# what reads the log when RESULT: says DEVIATION.
#
# Usage:
#   printf 'command: <shell line>\n' | run.sh
#
# INPUT - stdin, one "label: value" per line. The FIRST occurrence of a label
# wins; every other line (blank, prose, an unknown label) is ignored:
#   command:      (required) one shell line, run verbatim by `bash -c`. The
#                 caller owns its content; this script only checks it is not
#                 empty.
#   cwd:          (optional) an existing directory to run it in. Default: $PWD.
#   timeout:      (optional) positive integer seconds. Default: 600. The
#                 command runs in a process group of its own, and a timeout
#                 signals that whole group (TERM, then KILL a second later),
#                 so the command's own children die with it rather than
#                 outliving the block this script prints. The block is held
#                 back until the group is gone (up to 3 s more), because
#                 LINES: and TAIL: are read off the log a survivor would still
#                 be writing to.
#   expect-exit:  (optional) the exit code that counts as a success: `nonzero`,
#                 or one plain decimal code (0, 1, 2 ...). Default: 0.
# A trailing CR (a CRLF block) and trailing whitespace are stripped from every
# value. A label that IS present must carry a usable value - an empty one is an
# error, not a fallback to the default.
#
# OUTPUT - stdout, exactly these lines, in this order (nothing ever goes to
# stderr):
#   RESULT: SUCCESS |    always the first line, on every path. SUCCESS only when
#           DEVIATION    the command ran to completion AND its exit code
#                        satisfies expect-exit:; every other outcome - a
#                        timeout, an error, a pre-launch error - is a DEVIATION
#   STATUS: ok | timeout | error
#   EXIT: <n>            the command's own exit code (124 on a timeout)
#   DURATION: <n>s       wall time of the command
#   LOG: <path>          the log file holding its whole output, absolute
#                        whenever cwd is (the $PWD default and a git root
#                        always are)
#   LINES: <n>           newline count of that log file
#   TAIL: <line>         the log's last line carrying more than whitespace, its
#                        trailing CR and blanks stripped - the line is omitted
#                        entirely when the log holds no such line
#   REASON: <one line>   error only, always the last line
# A pre-launch error (bad input, unusable log location) prints RESULT:, STATUS:
# and REASON: only - no command ran, so there is no
# EXIT:/DURATION:/LOG:/LINES:/TAIL:. A command that exits 126 or 127 prints the
# whole block: it did run, and the shell's own message is in the log.
#
# EXIT CODE: 0 for STATUS: ok and STATUS: timeout - the command's own exit code
# is DATA, reported on the EXIT: line, never this script's own status. 2 for
# every STATUS: error.
#
# LOG FILE:
#   <repo-root>/.temp/superdev/logs/<UTC yyyymmddTHHMMSSZ>-<slug>-<pid>.log
# repo-root is `git -C <cwd> rev-parse --show-toplevel` when that succeeds,
# else <cwd> itself; the directory is created as needed. <slug> is the first 40
# characters of the command with every run of characters outside [A-Za-z0-9._]
# collapsed into one "-" and the edges trimmed ("cmd" when nothing survives).
# <pid> is this script's pid, so two runs starting in the same second with the
# same command still get their own file.
#
# FAILURE MODES - all RESULT: DEVIATION, STATUS: error, exit 2:
#   no command: line, or an empty one  -> REASON: missing command:
#   cwd: is not an existing directory  -> REASON: working directory missing: <cwd>
#   timeout: is not ^[1-9][0-9]*$      -> REASON: invalid timeout: <value>
#   expect-exit: is not                -> REASON: invalid expect-exit: <value>
#     ^(nonzero|0|[1-9][0-9]*)$
#   log dir or log file not writable   -> REASON: cannot write log: <path>
#                                         (the directory for a failed mkdir,
#                                         the file for a failed open; platform
#                                         dependent, so it carries no test)
#   the command exited 126 or 127      -> REASON: command not found or not
#                                         executable (exit <n>)
#
# `set -e` is deliberately absent: a failing command is the normal case here,
# its exit code is the payload.
#
set -uo pipefail

label_command=""
label_cwd=""
label_timeout=""
label_expect_exit=""
seen_command=0
seen_cwd=0
seen_timeout=0
seen_expect_exit=0

# Reads the "label: value" block from stdin into the label_* variables. The
# first occurrence of a label wins, so a caller may repeat or annotate the
# block without changing what runs.
parse_labels() {
  local line name value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^(command|cwd|timeout|expect-exit):[[:space:]]*(.*)$ ]] || continue
    name="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    # drop the trailing whitespace run (an all-whitespace value becomes empty)
    value="${value%"${value##*[![:space:]]}"}"
    case "$name" in
      command)
        if [[ $seen_command -eq 0 ]]; then
          label_command="$value"
          seen_command=1
        fi
        ;;
      cwd)
        if [[ $seen_cwd -eq 0 ]]; then
          label_cwd="$value"
          seen_cwd=1
        fi
        ;;
      timeout)
        if [[ $seen_timeout -eq 0 ]]; then
          label_timeout="$value"
          seen_timeout=1
        fi
        ;;
      expect-exit)
        if [[ $seen_expect_exit -eq 0 ]]; then
          label_expect_exit="$value"
          seen_expect_exit=1
        fi
        ;;
    esac
  done
}

# Maps the run's outcome onto SUCCESS or DEVIATION - the caller's whole
# decision on the success path. SUCCESS demands both that the command actually
# ran to completion and that its exit code is the expected one.
resolve_result() {
  local status="$1" exit_code="$2" expect="$3"
  if [[ "$status" != "ok" ]]; then
    printf 'DEVIATION'
    return
  fi
  if [[ "$expect" == "nonzero" ]]; then
    if [[ "$exit_code" != "0" ]]; then printf 'SUCCESS'; else printf 'DEVIATION'; fi
    return
  fi
  if [[ "$exit_code" == "$expect" ]]; then printf 'SUCCESS'; else printf 'DEVIATION'; fi
}

# The whole pre-launch error channel: three lines on stdout, exit 2. Nothing
# else has been printed yet at any call site, so the block stays exactly as
# documented - and a caller that reads nothing but RESULT: still sees that the
# run did not deliver what it asked for.
emit_error() {
  printf 'RESULT: DEVIATION\n'
  printf 'STATUS: error\n'
  printf 'REASON: %s\n' "$1"
  exit 2
}

main() {
  parse_labels

  [[ -n "$label_command" ]] || emit_error "missing command:"

  local cwd="$PWD"
  [[ $seen_cwd -eq 0 ]] || cwd="$label_cwd"
  # An absolute cwd keeps the LOG: path absolute; a relative one is anchored on
  # $PWD as a string, with no symlink resolution - a shell script joins with
  # "/" whatever native path it was handed.
  case "$cwd" in
    /* | \\* | [A-Za-z]:*) ;;
    *) cwd="$PWD/$cwd" ;;
  esac
  [[ -d "$cwd" ]] || emit_error "working directory missing: $cwd"

  local timeout=600
  if [[ $seen_timeout -eq 1 ]]; then
    [[ "$label_timeout" =~ ^[1-9][0-9]*$ ]] || emit_error "invalid timeout: $label_timeout"
    timeout="$label_timeout"
  fi

  local expect_exit=0
  if [[ $seen_expect_exit -eq 1 ]]; then
    [[ "$label_expect_exit" =~ ^(nonzero|0|[1-9][0-9]*)$ ]] || emit_error "invalid expect-exit: $label_expect_exit"
    expect_exit="$label_expect_exit"
  fi

  # The log belongs to the repository the command runs in, so every run of one
  # build leaves its logs in one place; outside a repository, cwd itself is it.
  local repo_root
  repo_root="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -z "$repo_root" || ! -d "$repo_root" ]]; then
    repo_root="$cwd"
  fi
  [[ "$repo_root" == "/" ]] || repo_root="${repo_root%/}"

  local log_dir="$repo_root/.temp/superdev/logs"
  mkdir -p "$log_dir" 2>/dev/null || emit_error "cannot write log: $log_dir"

  # slug: the first 40 characters of the command, every run of characters
  # outside [A-Za-z0-9._] collapsed into one "-", edges trimmed. Spelled out as
  # a character set rather than a range so no locale's collation can widen it.
  local allowed='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._'
  local head="${label_command:0:40}"
  local slug="" ch i
  for (( i = 0; i < ${#head}; i++ )); do
    ch="${head:i:1}"
    if [[ "$allowed" == *"$ch"* ]]; then
      slug+="$ch"
    elif [[ "$slug" != *- ]]; then
      slug+="-"
    fi
  done
  slug="${slug#-}"
  slug="${slug%-}"
  [[ -n "$slug" ]] || slug="cmd"

  local log="$log_dir/$(date -u +%Y%m%dT%H%M%SZ)-$slug-$$.log"
  : >"$log" 2>/dev/null || emit_error "cannot write log: $log"

  local start=$SECONDS
  local pid status="ok" exit_code=0 grace
  # The launch, the poll and the kill live inside one stderr-silenced block:
  # `set -m` is what puts the command in a process group of its own, and a
  # shell running with job control reports an abnormally terminated job on ITS
  # OWN stderr ("Terminated: 15"), which the OUTPUT contract above forbids.
  # Nothing in this script writes to stderr on purpose, so silencing the region
  # hides no diagnostic of ours.
  {
    set -m
    # `exec` so the subshell IS the command's shell rather than its parent, and
    # </dev/null so a command that reads stdin cannot be stopped by SIGTTIN now
    # that it sits outside the terminal's foreground group (stdin is spent -
    # parse_labels drained it before this point).
    ( cd "$cwd" && exec bash -c "$label_command" ) <"/dev/null" >"$log" 2>&1 &
    pid=$!
    set +m

    # Polled rather than blocked on, so the timeout is enforced by this script
    # alone - timeout(1) is not on every macOS box.
    while kill -0 "$pid" 2>/dev/null; do
      if (( SECONDS - start >= timeout )); then
        status="timeout"
        break
      fi
      sleep 1
    done

    if [[ "$status" == "timeout" ]]; then
      # Signal the GROUP, never the pid alone: `$pid` is the wrapper subshell,
      # and its `bash -c` descendants are what actually do the work - signalled
      # one at a time they are missed, reparented to init and left running past
      # the block this script is about to print. The negative form can never
      # reach this script's own group (our pgid is not a pid we just forked);
      # where job control did not take, it simply finds no such group and the
      # plain-pid form runs instead.
      kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
      sleep 1
      kill -KILL -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
      # reaps the wrapper, so the confirmation below cannot see its zombie
      wait "$pid"
      exit_code=124
      # Confirm the group is gone before the block is printed: LINES: and TAIL:
      # are read off the log, and a survivor is still writing to it.
      grace=0
      while (( grace < 3 )) && kill -0 -"$pid" 2>/dev/null; do
        sleep 1
        grace=$(( grace + 1 ))
      done
    else
      wait "$pid"
      exit_code=$?
    fi
  } 2>/dev/null
  local duration=$(( SECONDS - start ))

  local lines=0
  if [[ -f "$log" ]]; then
    lines=$(( $(wc -l < "$log" 2>/dev/null || echo 0) ))
  fi

  # The log's last line that carries anything but whitespace - the one piece of
  # the output the block itself shows, so a caller reading no further still has
  # the tool's own closing word. A trailing CR (a command writing CRLF) and
  # trailing blanks are stripped, so the value is one clean line; a log with no
  # such line leaves it empty and the TAIL: line is dropped.
  # Spelled with no POSIX character class, so gawk, mawk and BSD awk all read it
  # the same; an awk that is missing, or a log it cannot read, simply leaves the
  # value empty and the line unprinted.
  local tail_line=""
  if [[ -s "$log" ]]; then
    tail_line="$(awk '
      {
        line = $0
        sub(/\r$/, "", line)
        sub(/[ \t]+$/, "", line)
        if (line != "") last = line
      }
      END { if (last != "") print last }
    ' "$log" 2>/dev/null || true)"
  fi

  local reason=""
  if [[ "$status" == "ok" ]] && (( exit_code == 126 || exit_code == 127 )); then
    status="error"
    reason="command not found or not executable (exit $exit_code)"
  fi

  printf 'RESULT: %s\n' "$(resolve_result "$status" "$exit_code" "$expect_exit")"
  printf 'STATUS: %s\n' "$status"
  printf 'EXIT: %s\n' "$exit_code"
  printf 'DURATION: %ss\n' "$duration"
  printf 'LOG: %s\n' "$log"
  printf 'LINES: %s\n' "$lines"
  [[ -z "$tail_line" ]] || printf 'TAIL: %s\n' "$tail_line"
  [[ -z "$reason" ]] || printf 'REASON: %s\n' "$reason"

  [[ "$status" != "error" ]] || exit 2
  exit 0
}

main "$@"
