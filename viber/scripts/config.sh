#!/usr/bin/env bash
#
# config.sh - resolves the .claude/viber.yml switches into the block a skill
# preloads when it loads.
#
# It exists because a grep|sed YAML parser is a compound command, and Claude
# Code asks for approval on every member of one - which stalls the step on any
# permission mode that does not auto-accept everything. One script is ONE
# command to the permission engine. It is also the only way `implementor` can
# read the file at all: that skill's body forbids it to open a file.
#
# The file is resolved against the REPOSITORY ROOT, not the caller's cwd: a `!`
# preload runs wherever the session started, and a session started in a
# subdirectory would otherwise find no file and fail open with every switch
# false - silently turning off every layer the user configured.
#
# Two kinds of key, told apart by where they sit. A switch is a top-level key -
# column 0, the exact key name - and is on only when its value is `true` in
# any letter case. A directory key lives INSIDE the
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
#   keys   : adr, memory, rules, qa, cleanup, plain-plan-review - switches. One is `true` ONLY
#            when the file holds a line whose key starts at column 0, spells
#            the key name exactly (case-sensitive, no leading indentation),
#            and whose value is `true` in any letter case (ended by a space,
#            a comment or the end of the line): `^<key>\s*:\s*[Tt][Rr][Uu][Ee]`.
#            An indented key (it then belongs to some other group, never a
#            switch) or a key differing in case -> false. An absent key ->
#            false.
#            directories.runs (default `_specs`) and
#            directories.specifications (default `specs`) - the directory names
#            under docs/ holding the open runs and the archived ones. Read ONLY
#            from inside the `directories:` group: `directories:` at column 0,
#            its keys indented under it, the group ending at the next top-level
#            key. A same-named key outside the group is ignored. The value is
#            the first such assignment, cut at the first space or `#`, and must
#            match `[A-Za-z0-9._-]+` and be neither `.` nor `..`; anything else
#            -> the default, silently.
#            tiers.min (default `haiku`) and tiers.max (default `opus`) - the
#            model range implementor clamps its dispatches into. Read the same
#            group-bound way; the value is one of haiku, sonnet, opus, fable (any
#            case). The default max stays opus: fable is reached only when a
#            project names it. Anything else -> that key's default; min above
#            max -> both defaults.
#   stdout : a header line, then one `<key>: <true|false>` line per switch,
#            one `directories.<key>: <name>` line per directory key and one
#            `tiers.<key>: <tier>` line per tier key - dotted, so
#            the block reads the way the file does and no reader can take a
#            directory name for a switch - in a fixed order:
#              # viber config (resolved)
#              adr: true
#              memory: true
#              rules: true
#              qa: true
#              cleanup: true
#              plain-plan-review: true
#              directories.runs: _specs
#              directories.specifications: specs
#              tiers.min: haiku
#              tiers.max: opus
#   exit  : ALWAYS 0 (fail-open - a missing file or key never breaks a run, and
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
  if [ -f "$cfg" ] && grep -qE "^${key}[[:space:]]*:[[:space:]]*[Tt][Rr][Uu][Ee]([[:space:]]|#|$)" "$cfg"; then
    echo "true"
  else
    echo "false"
  fi
}

# The raw value of one key inside one group, empty when the file gives none. The
# awk tracks the group rather than matching the key anywhere: a top-level line
# that is not the group's own closes it, while a blank line and a comment at
# column 0 leave it open, which is how a group is written.
group_value() {
  group="$1"
  key="$2"
  [ -f "$cfg" ] || return 0
  awk -v group="$group" -v key="$key" '
/^[^[:space:]#]/ { ingroup = ($0 ~ "^" group "[[:space:]]*:"); next }
ingroup && $0 ~ "^[[:space:]]+" key "[[:space:]]*:" {
  sub(/^[^:]*:[[:space:]]*/, "")
  sub(/[[:space:]#\r].*$/, "")
  print
  exit
}
' "$cfg"
}

# A directory name, or the fallback. The value is one path SEGMENT, and the
# rejection list is what stops a slash, a traversal or an absolute path from
# turning a docs/ layer into somewhere else.
resolve_dir() {
  value="$(group_value directories "$1" || true)"
  case "$value" in
    ''|.|..|*[!A-Za-z0-9._-]*) value="$2" ;;
  esac
  echo "$value"
}

# A tier's rank, 0 for anything that is not one of the four tiers.
tier_rank() {
  case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
    haiku) echo 1 ;;
    sonnet) echo 2 ;;
    opus) echo 3 ;;
    fable) echo 4 ;;
    *) echo 0 ;;
  esac
}

tier_name() {
  case "$1" in
    1) echo haiku ;;
    2) echo sonnet ;;
    4) echo fable ;;
    *) echo opus ;;
  esac
}

echo "# viber config (resolved)"
for key in adr memory rules qa cleanup plain-plan-review; do
  printf '%s: %s\n' "$key" "$(resolve "$key")"
done
printf 'directories.runs: %s\n' "$(resolve_dir runs _specs)"
printf 'directories.specifications: %s\n' "$(resolve_dir specifications specs)"

min="$(tier_rank "$(group_value tiers min || true)")"
max="$(tier_rank "$(group_value tiers max || true)")"
[ "$min" -eq 0 ] && min=1
[ "$max" -eq 0 ] && max=3
if [ "$min" -gt "$max" ]; then
  min=1
  max=3
fi
printf 'tiers.min: %s\n' "$(tier_name "$min")"
printf 'tiers.max: %s\n' "$(tier_name "$max")"

exit 0
