#!/usr/bin/env bash
#
# config.sh - resolves the .claude/viber.yml switches into the block a skill
# preloads when it loads.
#
# It exists because a grep|sed YAML parser is a compound command, and Claude
# Code asks for approval on every member of one - which stalls the step on any
# permission mode that does not auto-accept everything. One script is ONE
# command to the permission engine. It is also the only way `implementor` can
# read the file at all: that skill carries `disallowed-tools: Read`.
#
# The file is resolved against the REPOSITORY ROOT, not the caller's cwd: a `!`
# preload runs wherever the session started, and a session started in a
# subdirectory would otherwise find no file and fail open with every switch
# false - silently turning off every layer the user configured.
#
# Two kinds of key, told apart by where they sit. A switch is a top-level key
# and is on only when it literally says `true`. A directory key lives INSIDE the
# `directories:` group and names ONE directory under docs/ - never a path. The
# group is the disambiguation: `runs` on its own reads like a count and `specs`
# like a switch, where `directories.runs` cannot be read as anything else, so a
# key of that name outside the group is not this key and is ignored. The value
# is sanitized because "docs/ is the one home for persisted knowledge" rests on
# it: a slash, a traversal or an absolute path is a configuration error, so the
# default stands and the run is unaffected.
#
# Contract:
#   argv   : none.
#   cwd    : any directory inside the host project - the repository root is
#            resolved here. Outside a repository, the cwd is the base.
#   env    : none.
#   file   : <repo root>/.claude/viber.yml (optional). No file -> every switch
#            false, every directory key at its default.
#   keys   : adr, memory, rules, qa, cleanup - switches. One is `true` ONLY
#            when the file holds a line matching `^\s*<key>\s*:\s*true` (the
#            value ended by a space, a comment or the end of the line). An
#            absent key -> false.
#            directories.runs (default `_specs`) and
#            directories.specifications (default `specs`) - the directory names
#            under docs/ holding the open runs and the archived ones. Read ONLY
#            from inside the `directories:` group: `directories:` at column 0,
#            its keys indented under it, the group ending at the next top-level
#            key. A same-named key outside the group is ignored. The value is
#            the first such assignment, cut at the first space or `#`, and must
#            match `[A-Za-z0-9._-]+` and be neither `.` nor `..`; anything else
#            -> the default, silently.
#   stdout : a header line, then one `<key>: <true|false>` line per switch and
#            one `directories.<key>: <name>` line per directory key - dotted, so
#            the block reads the way the file does and no reader can take a
#            directory name for a switch - in a fixed order:
#              # viber config (resolved)
#              adr: true
#              memory: true
#              rules: true
#              qa: true
#              cleanup: true
#              directories.runs: _specs
#              directories.specifications: specs
#   exit   : ALWAYS 0 (fail-open - a missing file or key never breaks a run, and
#            a non-zero exit in a `!` preload would abort the whole skill load).
#
set -u

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$repo_root" ] && [ -d "$repo_root" ]; then
  cfg="$repo_root/.claude/viber.yml"
else
  cfg=".claude/viber.yml"
fi

resolve() {
  key="$1"
  if [ -f "$cfg" ] && grep -qiE "^[[:space:]]*${key}[[:space:]]*:[[:space:]]*true([[:space:]]|#|$)" "$cfg"; then
    echo "true"
  else
    echo "false"
  fi
}

# A directory name out of the `directories:` group, or the fallback when the
# file gives none usable. The awk tracks the group rather than matching the key
# anywhere: a top-level line that is not `directories:` closes it, while a blank
# line and a comment at column 0 leave it open, which is how the group is
# written. The value is one path SEGMENT, and the rejection list is what stops a
# slash, a traversal or an absolute path from turning a docs/ layer into
# somewhere else.
resolve_dir() {
  key="$1"
  fallback="$2"
  value=""
  if [ -f "$cfg" ]; then
    value="$(awk -v key="$key" '
/^[^[:space:]#]/ { ingroup = ($0 ~ /^directories[[:space:]]*:/); next }
ingroup && $0 ~ "^[[:space:]]+" key "[[:space:]]*:" {
  sub(/^[^:]*:[[:space:]]*/, "")
  sub(/[[:space:]#].*$/, "")
  print
  exit
}
' "$cfg")"
  fi
  case "$value" in
    ''|.|..|*[!A-Za-z0-9._-]*) value="$fallback" ;;
  esac
  echo "$value"
}

echo "# viber config (resolved)"
for key in adr memory rules qa cleanup; do
  printf '%s: %s\n' "$key" "$(resolve "$key")"
done
printf 'directories.runs: %s\n' "$(resolve_dir runs _specs)"
printf 'directories.specifications: %s\n' "$(resolve_dir specifications specs)"

exit 0
