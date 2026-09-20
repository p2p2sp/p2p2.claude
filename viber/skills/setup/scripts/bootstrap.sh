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
#            <root>/.gitignore        (seeded from assets/gitignore.txt when the
#                                      project has none, otherwise ".temp/" is
#                                      appended only when no rule ignores it)
#   reads  : <root>/CLAUDE.md         (existence only, never written - the agents
#                                      take the build and test commands from it)
#   stdout : one result line per item - the skill carries them into its report
#            verbatim and never re-verifies them.
#   exit   : ALWAYS 0. A preload that exits non-zero aborts the whole skill load,
#            and a project that refuses one of these files is not a broken setup.
#
set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
template="$here/../templates/viber.yml"
asset_gitignore="$here/../assets/gitignore.txt"

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

# A project with no .gitignore gets the bundled one, which already carries
# .temp/. One that has its own keeps it: the only edit is the .temp/ rule the
# run needs, appended on its own line even when the file ends without one.
ignore="$root/.gitignore"
if [ ! -f "$ignore" ]; then
  if [ ! -f "$asset_gitignore" ]; then
    if printf '.temp/\n' > "$ignore" 2>/dev/null; then
      echo ".gitignore: created with .temp/ - template missing at $asset_gitignore"
    else
      echo ".gitignore: could not write $ignore"
    fi
  elif cp "$asset_gitignore" "$ignore" 2>/dev/null; then
    echo ".gitignore: created from template (ignores .temp/)"
  else
    echo ".gitignore: could not write $ignore"
  fi
elif grep -qE '^[[:space:]]*\.temp/?[[:space:]]*$' "$ignore"; then
  echo ".gitignore: already ignores .temp/"
else
  if [ -s "$ignore" ] && [ -n "$(tail -c1 "$ignore")" ]; then
    printf '\n' >> "$ignore" 2>/dev/null
  fi
  if printf '.temp/\n' >> "$ignore" 2>/dev/null; then
    echo ".gitignore: .temp/ appended"
  else
    echo ".gitignore: could not write $ignore"
  fi
fi

# Reported, never seeded: the build and test commands every agent reads live
# here, and a stub written by a script would be exactly the file that names
# none of them.
if [ -f "$root/CLAUDE.md" ]; then
  echo "CLAUDE.md: present - check it names the build and test commands"
else
  echo "CLAUDE.md: missing - run /init, then add the build and test commands"
fi

exit 0
