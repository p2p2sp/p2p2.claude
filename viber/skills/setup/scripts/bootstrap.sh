#!/usr/bin/env bash
#
# bootstrap.sh - seeds the host project for a viber run. Idempotent: it never
# overwrites anything that already exists, so a second run is a no-op that still
# reports the truth.
#
# It is one script rather than a handful of inline commands because a `!` preload
# is permission-checked as ONE command: a compound `test && cp && grep` would ask
# for approval per member and stall the skill load on any mode that does not
# auto-accept.
#
# Contract:
#   argv   : none.
#   cwd    : any directory inside the host project - the repository root is
#            resolved here. Outside a repository, the cwd is the base.
#   env    : none.
#   writes : <root>/.claude/viber.yml (from templates/viber.yml, only when absent)
#            <root>/.gitignore        (appends ".temp/" only when absent)
#   stdout : one result line per item - the skill carries them into its report
#            verbatim and never re-verifies them.
#   exit   : ALWAYS 0. A preload that exits non-zero aborts the whole skill load,
#            and a project that refuses one of these files is not a broken setup.
#
set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
template="$here/../templates/viber.yml"

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ] || [ ! -d "$root" ]; then
  root="$(pwd)"
fi

cfg="$root/.claude/viber.yml"
if [ -f "$cfg" ]; then
  echo "viber.yml: already present (left untouched)"
elif [ ! -f "$template" ]; then
  echo "viber.yml: template missing at $template - nothing written"
else
  mkdir -p "$root/.claude" 2>/dev/null
  if cp "$template" "$cfg" 2>/dev/null; then
    echo "viber.yml: seeded from template - adr, memory and rules all on"
  else
    echo "viber.yml: could not write $cfg"
  fi
fi

ignore="$root/.gitignore"
if [ -f "$ignore" ] && grep -qE '^[[:space:]]*\.temp/?[[:space:]]*$' "$ignore"; then
  echo ".gitignore: already ignores .temp/"
elif printf '.temp/\n' >> "$ignore" 2>/dev/null; then
  echo ".gitignore: .temp/ appended"
else
  echo ".gitignore: could not write $ignore"
fi

exit 0
