#!/usr/bin/env bash
# superdev / scripts - lib_sha256.sh
#
# The ONE portable sha256 digest behind the reviewed-plan check. Both sides
# of that check source it: the ExitPlanMode hook (hooks/scripts/review-plan.sh),
# which records the digest of the plan it just approved beside the plan file,
# and decompose.sh, which recomputes the digest of the plan it is handed and
# refuses to build one that differs from the reviewed bytes. It exists so the
# two never disagree on HOW a digest is spelled: the host machine varies
# (coreutils `sha256sum` on Linux and Git-Bash, `shasum -a 256` on macOS,
# `openssl` as the last resort), and two scripts each picking their own tool
# would differ in the exact place the comparison has to hold.
#
# The file is fed to the tool on STDIN, never named as an argument. GNU
# coreutils escapes a checksum line whose filename carries a backslash or a
# newline: it prefixes the whole line with `\` and doubles the backslashes, so
# a Windows plan path - `C:\Users\...\plan.md`, exactly what both callers are
# handed under Git-Bash - came back as `\<hex> *C:\\Users\\...`, its first
# field then failed the hex check, and every digest on Windows silently
# returned 1. That left the hook writing no sidecar and decompose.sh skipping
# the reviewed-plan check on every run there. Reading stdin prints `<hex>  -`
# whatever the path looks like.
#
# Contract:
#   sha256_of <file>
#     -> the lowercase hex sha256 digest of the file's bytes, on stdout,
#        followed by a newline; returns 0. Tools tried in order: `sha256sum`,
#        `shasum -a 256`, `openssl dgst -sha256` (its "SHA256(stdin)= <hex>" /
#        "SHA2-256(stdin)= <hex>" output is reduced to the hex alone). A
#        missing or unreadable file, an empty argument, or a tool answering
#        with anything that is not 64 hex characters -> nothing on stdout,
#        returns 1. No digest tool on PATH at all -> nothing on stdout, ONE
#        `lib_sha256: no sha256 tool on PATH ...` line on stderr, returns 1,
#        so an absent tool is told apart from a failed digest. The caller
#        decides what a missing digest means (the hook swallows both,
#        decompose.sh warns and skips the check).
#
#   usage  : source "$(dirname "${BASH_SOURCE[0]}")/lib_sha256.sh"
#            digest="$(sha256_of "$plan")" || echo "no digest" >&2
#   note   : self-contained; does NOT enable set -e/-u/pipefail - a caller
#            running under `set -euo pipefail` (decompose.sh) or under
#            `set -u` alone (review-plan.sh) is never aborted by it.

# Lowercase hex sha256 of a file's bytes, through the first digest tool found.
sha256_of() {
  local file="$1" out=""
  if [[ -z "$file" || ! -f "$file" || ! -r "$file" ]]; then
    return 1
  fi
  # stdin, never an argument - see the header for what a filename in the
  # tool's own output costs on Windows
  if command -v sha256sum >/dev/null 2>&1; then
    out="$(sha256sum < "$file" 2>/dev/null)" || out=""
  elif command -v shasum >/dev/null 2>&1; then
    out="$(shasum -a 256 < "$file" 2>/dev/null)" || out=""
  elif command -v openssl >/dev/null 2>&1; then
    out="$(openssl dgst -sha256 < "$file" 2>/dev/null)" || out=""
    # "SHA2-256(stdin)= <hex>" - keep what follows the last "= "
    out="${out##*= }"
  else
    echo "lib_sha256: no sha256 tool on PATH (sha256sum, shasum, openssl)" >&2
    return 1
  fi
  # sha256sum / shasum print "<hex>  -": the first field is the digest
  out="${out%%[[:space:]]*}"
  case "$out" in
    *[!0-9a-fA-F]* | "") return 1 ;;
  esac
  if [[ "${#out}" -ne 64 ]]; then
    return 1
  fi
  printf '%s\n' "$out" | tr '[:upper:]' '[:lower:]'
  return 0
}
