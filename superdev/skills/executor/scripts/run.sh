#!/usr/bin/env bash
#
# run.sh - runs ONE shell command for the superdev:executor fork, captures its
# whole output in a log file, and prints a short, fixed status block. The fork
# never sees that output itself, only this block plus whatever it chooses to
# read back from the log.
#
# Usage:
#   printf 'command: <shell line>\n' | run.sh
#
# INPUT - stdin, one "label: value" per line. The FIRST occurrence of a label
# wins; every other line (blank, prose, an unknown label) is ignored:
#   command:  (required) one shell line, run verbatim by `bash -c`. The caller
#             owns its content; this script only checks it is not empty.
#   cwd:      (optional) an existing directory to run it in. Default: $PWD.
#   timeout:  (optional) positive integer seconds. Default: 600.
# A trailing CR (a CRLF block) and trailing whitespace are stripped from every
# value. A label that IS present must carry a usable value - an empty one is an
# error, not a fallback to the default.
#
# OUTPUT - stdout, exactly these lines, in this order (nothing ever goes to
# stderr):
#   STATUS: ok | timeout | error
#   EXIT: <n>            the command's own exit code (124 on a timeout)
#   DURATION: <n>s       wall time of the command
#   LOG: <path>          the log file holding its whole output, absolute
#                        whenever cwd is (the $PWD default and a git root
#                        always are)
#   LINES: <n>           newline count of that log file
#   REASON: <one line>   error only, always the last line
# A pre-launch error (bad input, unusable log location) prints STATUS: and
# REASON: only - no command ran, so there is no EXIT:/DURATION:/LOG:/LINES:.
# A command that exits 126 or 127 prints all six lines: it did run, and the
# shell's own message is in the log.
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
# FAILURE MODES - all STATUS: error, exit 2:
#   no command: line, or an empty one  -> REASON: missing command:
#   cwd: is not an existing directory  -> REASON: working directory missing: <cwd>
#   timeout: is not ^[1-9][0-9]*$      -> REASON: invalid timeout: <value>
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
seen_command=0
seen_cwd=0
seen_timeout=0

# Reads the "label: value" block from stdin into the label_* variables. The
# first occurrence of a label wins, so a caller may repeat or annotate the
# block without changing what runs.
parse_labels() {
  local line name value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^(command|cwd|timeout):[[:space:]]*(.*)$ ]] || continue
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
    esac
  done
}

# The whole pre-launch error channel: two lines on stdout, exit 2. Nothing else
# has been printed yet at any call site, so the block stays exactly as
# documented.
emit_error() {
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
  ( cd "$cwd" && bash -c "$label_command" ) >"$log" 2>&1 &
  local pid=$!
  local status="ok"
  local exit_code=0

  # Polled rather than blocked on, so the timeout is enforced by this script
  # alone - timeout(1) is not on every macOS box.
  while kill -0 "$pid" 2>/dev/null; do
    if (( SECONDS - start >= timeout )); then
      kill -TERM "$pid" 2>/dev/null
      sleep 1
      kill -KILL "$pid" 2>/dev/null
      status="timeout"
      break
    fi
    sleep 1
  done

  if [[ "$status" == "timeout" ]]; then
    wait "$pid" 2>/dev/null
    exit_code=124
  else
    wait "$pid"
    exit_code=$?
  fi
  local duration=$(( SECONDS - start ))

  local lines=0
  if [[ -f "$log" ]]; then
    lines=$(( $(wc -l < "$log" 2>/dev/null || echo 0) ))
  fi

  local reason=""
  if [[ "$status" == "ok" ]] && (( exit_code == 126 || exit_code == 127 )); then
    status="error"
    reason="command not found or not executable (exit $exit_code)"
  fi

  printf 'STATUS: %s\n' "$status"
  printf 'EXIT: %s\n' "$exit_code"
  printf 'DURATION: %ss\n' "$duration"
  printf 'LOG: %s\n' "$log"
  printf 'LINES: %s\n' "$lines"
  [[ -z "$reason" ]] || printf 'REASON: %s\n' "$reason"

  [[ "$status" != "error" ]] || exit 2
  exit 0
}

main "$@"
