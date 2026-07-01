#!/bin/sh
# supergh — shared/scripts/body-path.sh
# Deterministic body-file path builder, shared by create-issue and create-pr. Replaces
# the prose `date +…` + 7-step slugify (with Polish transliteration) that was DUPLICATED
# verbatim in both skills. The skill calls it in Step 8 (the title is known only after the
# interactive flow, so this is a real `Bash` call, not a `!`-load preload). Self-verifying:
# it emits the path ONLY after it has created the parent directory, so the caller trusts
# the line without re-checking (same trust contract as commit/route.sh).
#
# IN : $1 = prefix (the .temp subdir, e.g. "create-issue" | "create-pr")
#      $2 = title (raw, may contain spaces / Polish diacritics / punctuation / embedded
#           newlines — any \n or \r is collapsed to a space before slugify, so a multi-
#           line title can never split the OUT contract below across multiple lines)
# OUT: exactly one line on stdout — the ready body path:
#        .temp/<prefix>/<YYYYmmdd-HHMMSS>-<slug>.md
#      The parent dir `.temp/<prefix>/` is `mkdir -p`'d before the line is printed.
# Slugify (applied to the title, in order):
#   0. collapse embedded newlines/CR to spaces (see IN above)
#   1. lowercase (ASCII)
#   2. transliterate PL diacritics: ą->a ć->c ę->e ł->l ń->n ó->o ś->s ź->z ż->z (both cases)
#   3. every char outside [a-z0-9] -> '-'
#   4. collapse runs of '-' into one
#   5. trim leading/trailing '-'
#   6. truncate to 40 chars; if the cut lands mid-word, back off to the last '-' before 40
#   7. empty result -> "untitled"
# exit: 0 on the emitted path; 2 on missing args; 1 if the dir could not be created.
# Pure POSIX — no jq/awk/bc. Transliteration via literal-byte sed (locale-independent match).
set -u

prefix=${1:-}
title=${2:-}
if [ -z "$prefix" ] || [ $# -lt 2 ]; then
  echo "ERROR body-path.sh: need <prefix> <title>" >&2
  exit 2
fi

# Collapse any embedded newline/CR in the title to a space BEFORE slugify — the
# sed pipeline below is line-oriented, so a multi-line title would otherwise
# split across multiple stdout lines, breaking the "exactly one line" contract.
# Same idiom as commit.sh's emit_error (`tr '\n\r' '  '`).
title=$(printf '%s' "$title" | tr '\n\r' '  ')

slug=$(printf '%s' "$title" \
  | tr 'A-Z' 'a-z' \
  | sed -e 's/ą/a/g' -e 's/Ą/a/g' \
        -e 's/ć/c/g' -e 's/Ć/c/g' \
        -e 's/ę/e/g' -e 's/Ę/e/g' \
        -e 's/ł/l/g' -e 's/Ł/l/g' \
        -e 's/ń/n/g' -e 's/Ń/n/g' \
        -e 's/ó/o/g' -e 's/Ó/o/g' \
        -e 's/ś/s/g' -e 's/Ś/s/g' \
        -e 's/ź/z/g' -e 's/Ź/z/g' \
        -e 's/ż/z/g' -e 's/Ż/z/g' \
  | sed -e 's/[^a-z0-9]/-/g' -e 's/--*/-/g' -e 's/^-//' -e 's/-$//')

# Step 6 — truncate to 40 with word-boundary back-off (slug is pure ASCII here, so
# character count == byte count and ${#var} is safe).
if [ "${#slug}" -gt 40 ]; then
  c41=$(printf '%s' "$slug" | cut -c41-41)
  slug=$(printf '%s' "$slug" | cut -c1-40)
  c40=$(printf '%s' "$slug" | cut -c40-40)
  # Cut inside a word (neither the 40th nor the 41st char is a boundary) -> drop the
  # trailing partial segment. A boundary on either side means 40 chars is already clean.
  if [ "$c41" != "-" ] && [ "$c40" != "-" ]; then
    case "$slug" in
      *-*) slug=$(printf '%s' "$slug" | sed -e 's/-[^-]*$//') ;;
    esac
  fi
  slug=$(printf '%s' "$slug" | sed -e 's/-$//')
fi

[ -n "$slug" ] || slug=untitled

ts=$(date +%Y%m%d-%H%M%S)
dir=".temp/$prefix"
mkdir -p "$dir" 2>/dev/null
if [ ! -d "$dir" ]; then
  echo "ERROR body-path.sh: could not create $dir" >&2
  exit 1
fi

printf '%s\n' "$dir/$ts-$slug.md"
exit 0
