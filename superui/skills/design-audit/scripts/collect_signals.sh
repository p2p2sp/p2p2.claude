#!/usr/bin/env bash
# collect_signals.sh — cheap, deterministic, idiom-aware signal sweep for the
# design-audit Impact x Opportunity pass. Emits one JSON object per candidate UI
# file to stdout (JSONL). These are PRIORS for the scouts, not the score itself.
#
# Usage:
#   bash collect_signals.sh <family|agnostic> <repo-root> [--scope <pathspec>]
#     family ∈ css | js-theme | flutter | agnostic
#
# Signals per file:
#   ext                file extension
#   raw_value_hits     hardcoded literals that should be tokens (per family)
#   class_hits         off-theme / arbitrary classes  (css only; else 0)
#   inline_style_hits  inline style / sx literals      (css & js-theme; else 0)
#   loc                line count
#
# File set: tracked files via `git ls-files` when inside a work tree, else a
# `find` fallback; filtered to the family's extensions, minus vendor/build noise.
set -euo pipefail

FAMILY="${1:?family required: css|js-theme|flutter|agnostic}"
ROOT="${2:?repo-root required}"
SCOPE=""
shift 2 || true
while [ "$#" -gt 0 ]; do
  case "$1" in
    --scope) SCOPE="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done

cd "$ROOT"

# Extension regex + hit patterns per family. An empty pattern means "0 hits".
case "$FAMILY" in
  css)
    EXT='\.(css|scss|html?|jsx|tsx)$'
    RAW='#[0-9a-fA-F]{3,8}\b|\b[0-9]+(\.[0-9]+)?(px|rem|em)\b|(rgba?|hsla?)\('
    CLS='\[#[0-9a-fA-F]|\[[0-9]+px\]'
    INL='style="|style=\{\{'
    ;;
  js-theme)
    EXT='\.(jsx|tsx|js|ts)$'
    RAW='#[0-9a-fA-F]{3,8}\b|\b[0-9]+(\.[0-9]+)?(px|rem|em)\b|(rgba?|hsla?)\('
    CLS=''
    INL='sx=\{\{|style=\{\{'
    ;;
  flutter)
    EXT='\.dart$'
    RAW='Color\(0x|Colors\.|EdgeInsets|TextStyle\(|fontSize:|SizedBox\(|BorderRadius'
    CLS=''
    INL=''
    ;;
  agnostic)
    EXT='\.(css|scss|html?|jsx|tsx|js|ts|dart)$'
    RAW='#[0-9a-fA-F]{3,8}\b|\b[0-9]+(\.[0-9]+)?(px|rem|em)\b|(rgba?|hsla?)\(|Color\(0x|Colors\.'
    CLS=''
    INL=''
    ;;
  *)
    echo "STATUS: FAIL — unknown family: $FAMILY" >&2
    exit 1
    ;;
esac

# Minimal JSON string escaper (handles backslash and double-quote).
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

# count <pattern> <file>  — matching-line count; empty pattern -> 0.
count() {
  [ -z "$1" ] && { printf '0'; return; }
  grep -Eic -- "$1" "$2" 2>/dev/null || true
}

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  files="$(git ls-files -- ${SCOPE:+"$SCOPE"} 2>/dev/null || true)"
else
  files="$(find ${SCOPE:-.} -type f 2>/dev/null || true)"
fi

# Filter to the family's extensions minus noise. `|| true` swallows a no-match
# grep (rc=1) so an empty candidate set yields empty output, not a set -e abort.
cand="$(printf '%s\n' "$files" \
  | grep -Ev '(^|/)(node_modules|dist|build|out|vendor|third_party)(/|$)|\.min\.|\.map$' \
  | grep -E "$EXT" || true)"

printf '%s\n' "$cand" \
  | while IFS= read -r f; do
      [ -n "$f" ] || continue
      [ -f "$f" ] || continue
      ext="${f##*.}"
      loc="$(wc -l < "$f" | tr -d ' ')"
      raw="$(count "$RAW" "$f")"
      cls="$(count "$CLS" "$f")"
      inl="$(count "$INL" "$f")"
      printf '{"path":"%s","ext":"%s","raw_value_hits":%s,"class_hits":%s,"inline_style_hits":%s,"loc":%s}\n' \
        "$(esc "$f")" "$(esc "$ext")" "$raw" "$cls" "$inl" "$loc"
    done
