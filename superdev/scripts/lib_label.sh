#!/usr/bin/env bash
# superdev / scripts - lib_label.sh
#
# The ONE parser for a fork's labeled argument block ("label: value", one label
# per line). Both consumers source it: label.sh (prints one scalar value into a
# SKILL.md preload) and resolve-input.sh (resolves a label to a file it reads).
# It exists so those two can never drift: before it, resolve-input.sh trimmed a
# value's trailing whitespace and the reviewers' inline `printf | tr | sed | head`
# preloads did not, so the same block yielded "docs/x.md" in one path and
# "docs/x.md   " in the other.
#
# Contract:
#   input  : $1 = label name (no regex metacharacters - callers validate),
#            $2 = the full argument block.
#   output : the FIRST matching label's value on stdout, CR stripped and both
#            ends trimmed; nothing at all when the label is absent or its value
#            is empty. Absence is NOT an error here - a caller decides what a
#            missing label means (optional -> skip, required -> its own report).
#   usage  : source "$(dirname "${BASH_SOURCE[0]}")/lib_label.sh"
#            value="$(label_value report "$block")"
#   note   : self-contained; does NOT enable set -e/-u/pipefail. A caller running
#            under `set -euo pipefail` must still capture the result in a command
#            substitution (`v="$(label_value …)"`), never leave the function as a
#            script's last command - `head -n1` can close the pipe early and
#            pipefail would turn that into a non-zero exit.

# Print the first value of label $1 found in block $2. See contract above.
label_value() {
  printf '%s\n' "$2" \
    | tr -d '\r' \
    | sed -n "s/^[[:space:]]*$1:[[:space:]]*//p" \
    | sed -e 's/[[:space:]]*$//' \
    | head -n1
}
