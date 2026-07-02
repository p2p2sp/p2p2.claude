#!/bin/sh
# route.sh — idiom-family rubric router for design-audit.
# IN : $1 = idiom family (css | js-theme | flutter | agnostic).
# OUT: the matching references/rubric-<family>.md on stdout, verbatim.
#      unknown/missing family -> "STATUS: FAIL — ..." on stdout, non-zero exit.
# Self-locating via $0 (POSIX): references resolved relative to this script's own
# dir (../references), never the host CWD. Every fragment is PLACEHOLDER-FREE
# (no ${CLAUDE_PLUGIN_ROOT}) so the stdout can be pasted straight into an agent
# prompt. Self-verifying — the caller injects this output and does NOT re-run it.
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ref="$dir/../references"
family=$(printf '%s' "${1:-}" | tr 'A-Z' 'a-z')

case "$family" in
  css|js-theme|flutter|agnostic) ;;
  *) printf 'STATUS: FAIL — unknown idiom family: %s\n' "${1:-<empty>}"; exit 1 ;;
esac

f="$ref/rubric-$family.md"
[ -f "$f" ] || { printf 'STATUS: FAIL — missing rubric fragment: %s\n' "$f"; exit 1; }

cat "$f"
