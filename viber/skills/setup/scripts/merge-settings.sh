#!/usr/bin/env bash
#
# merge-settings.sh - merges the bundled permissions template into the host
# project's .claude/settings.json key by key, idempotently.
#
# Usage:
#   merge-settings.sh [--reset] <template> [<target>]
#
# --reset  (optional) - replace the target with the template instead of
#                       merging. An existing target is first copied to
#                       <root>/.temp/viber/setup/settings.json.bak (overwritten
#                       on every reset); a failed backup leaves the target
#                       untouched. Needs no node: it is a plain copy, staged
#                       in <target>.tmp and renamed over the target.
# template (required) - the bundled permissions template
#                       (viber/skills/setup/templates/settings.json).
# target   (optional) - the host settings file; defaults to
#                       .claude/settings.json at the repository root (the
#                       current dir outside a repository), so a run from a
#                       subdirectory never seeds a nested .claude/.
#
# A missing target (with or without --reset) is always created from the
# template by a plain copy, needing no node. node is checked, and needed,
# only once a real merge into an EXISTING target is due.
#
# Merge rules (applied by the sibling merge program, only when the target
# already exists), walked recursively over every key of the template:
#   - a key the host lacks is added with the template's value.
#   - an object on both sides is merged key by key, at any depth.
#   - an array on both sides keeps the host's entries in the host's order;
#     template entries missing from it are appended at its end, each exactly
#     once. Arrays only ever gain entries.
#   - in permissions.allow, permissions.ask and permissions.deny a template
#     rule already covered by a host rule of the same list is not appended: a
#     bare `Tool` covers every `Tool(<specifier>)`, and a match-all specifier
#     (`*`, `**`, `**/*`) counts as bare, so a host carrying `Edit` never gains
#     `Edit(**/*)`, and the reverse. A narrower host rule (`Edit(src/**)`)
#     covers nothing broader, and a host rule is never removed.
#   - anything else (a scalar, or a type mismatch) takes the template's value
#     when it differs. The template wins because a project's own override
#     belongs in .claude/settings.local.json, which this merge never touches.
#   - the one removal: an entry the template carries in permissions.ask is
#     dropped from the host's permissions.deny. deny outranks ask, so a rule
#     the template moved from deny to ask would otherwise stay a hard block in
#     every project set up before the move.
#   - a key the template does not carry is never changed or removed.
#   - a semantically unchanged file is not rewritten at all, so a second run
#     leaves it byte-identical.
#   - the rewrite is atomic: the result is written to <target>.tmp and
#     renamed over the target.
#
# Output (stdout, exactly one line - plus the template body on the node-skip
# case, which is the block a user merges by hand):
#   settings.json: created from template
#   settings.json: reset from template (previous file saved to .temp/viber/setup/settings.json.bak)
#   settings.json: backup failed - left untouched (<message>)
#   settings.json: merged - added <k> keys, <e> list entries, updated <u> values, moved <d> deny to ask
#   settings.json: already up to date
#   settings.json: node not found - merge skipped, recommended block:
#   settings.json: template missing at <path> - skipped
#   settings.json: not valid JSON - left untouched (<message>)
#   settings.json: unreadable - left untouched (<message>)
#   settings.json: write failed (<message>)
#
# Exit codes:
#   0 - merged, already up to date, created, reset, or skipped (no node on PATH)
#   1 - template missing/unreadable, or a wrong argument count
#   2 - the target could not be read or parsed, the backup failed, or the
#       write failed
#
set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
reset=0
if [ "${1:-}" = "--reset" ]; then
  reset=1
  shift
fi
template="${1:-}"
root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ] || [ ! -d "$root" ]; then
  root="$(pwd)"
fi
target="${2:-$root/.claude/settings.json}"

if [ -z "$template" ] || [ "$#" -gt 2 ]; then
  echo "usage: merge-settings.sh [--reset] <template> [<target>]" >&2
  exit 1
fi

if [ ! -r "$template" ]; then
  echo "settings.json: template missing at $template - skipped"
  exit 1
fi

# A reset is a plain copy, so it runs before the node check. A target that does
# not exist yet is simply created: there is nothing to back up.
if [ "$reset" = 1 ]; then
  note=""
  if [ -f "$target" ]; then
    backup_dir="$root/.temp/viber/setup"
    if ! err="$(mkdir -p "$backup_dir" 2>&1 && cp "$target" "$backup_dir/settings.json.bak" 2>&1)"; then
      echo "settings.json: backup failed - left untouched ($(printf '%s' "$err" | tr '\n' ' '))"
      exit 2
    fi
    note=" (previous file saved to .temp/viber/setup/settings.json.bak)"
  fi
  mkdir -p "$(dirname "$target")" 2>/dev/null
  if cp "$template" "$target.tmp" 2>/dev/null && mv -f "$target.tmp" "$target" 2>/dev/null; then
    if [ -n "$note" ]; then
      echo "settings.json: reset from template$note"
    else
      echo "settings.json: created from template"
    fi
    exit 0
  fi
  rm -f "$target.tmp" 2>/dev/null
  echo "settings.json: write failed (cannot write $target)"
  exit 2
fi

# A missing target is a plain copy, so it is created before the node check:
# only a real merge (an existing target) needs node.
if [ ! -f "$target" ]; then
  mkdir -p "$(dirname "$target")" 2>/dev/null
  if cp "$template" "$target" 2>/dev/null; then
    echo "settings.json: created from template"
    exit 0
  fi
  echo "settings.json: write failed (cannot create $target)"
  exit 2
fi

# node carries the merge (JSON in, JSON out); without it the step is skipped
# with the recommended block on stdout, never guessed at with a text editor.
if ! command -v node >/dev/null 2>&1; then
  echo "settings.json: node not found - merge skipped, recommended block:"
  cat "$template"
  exit 0
fi

node "$here/merge-settings.js" "$template" "$target"
exit $?
