#!/usr/bin/env bash
#
# label.sh - prints ONE scalar value from a fork's labeled argument block.
#
# Usage:
#   label.sh <args-block> <label>
#
# For a label whose value is a path the fork must READ, use resolve-input.sh
# instead - it validates and injects the file's content. This script is for a
# value the fork only needs to KNOW: a stage name, a SHA, a directory, or a path
# it will WRITE to (which therefore does not exist yet and cannot be validated).
#
# It replaces the `printf '%s' "$ARGUMENTS" | tr -d '\r' | sed -n '…' | head -n1`
# pipeline the three build reviewers each carried six times. Two reasons it is a
# script: the pipeline was duplicated 18 times with no behavioural test of its
# own, and it had silently drifted from resolve-input.sh's parser over trailing
# whitespace. Both now share lib_label.sh.
#
# Contract:
#   input  : $1 = the fork's full $ARGUMENTS, $2 = one label name.
#   output : the label's value on stdout with a trailing newline; NOTHING at all
#            (no newline, no message) when the label is absent or empty - callers
#            check emptiness themselves and their own contract decides what a
#            missing label means.
#   exit   : ALWAYS 0 once the arguments are well-formed, whether the label was
#            found or not. This script runs as a SKILL.md `!` preload, where a
#            non-zero exit aborts the WHOLE fork load ("Shell command failed for
#            pattern…") and the fork never sees any of its input. A wiring bug -
#            no label argument, or a label that is not [A-Za-z0-9_-]+ - is the one
#            exception: it exits 1, loudly, at dev time, exactly as
#            resolve-input.sh does for its own usage error.
#
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib_label.sh"

block="${1-}"
label="${2-}"

if [[ $# -ne 2 || -z "$label" ]]; then
  echo "error: usage: label.sh <args-block> <label>" >&2
  exit 1
fi

# The label is interpolated into a sed address, so anything outside this set
# could rewrite the expression. Every real label is a plain token.
if [[ ! "$label" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "error: label.sh: invalid label '$label' (expected [A-Za-z0-9_-]+)" >&2
  exit 1
fi

# Captured, never left as the last command: head -n1 can close the pipe early and
# pipefail would turn that SIGPIPE into a non-zero exit, killing the fork load.
value="$(label_value "$label" "$block" || true)"

if [[ -n "$value" ]]; then
  printf '%s\n' "$value"
fi

exit 0
