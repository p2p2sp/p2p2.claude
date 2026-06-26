#!/bin/sh
# route.sh — memory-rules mode router.
# IN : $1 = raw skill argument ($ARGUMENTS).
#      - text containing a line "Mode: improver"  → Mode C (improver fork).
#      - otherwise it is a bootstrap call: first whitespace token is the target
#        path (default "."); detect_state.sh on it gives "none" → Mode A,
#        "has-rules" → Mode B.
# OUT: a "resolved" header (MODE / project-path / state) then the chosen
#      references/mode-{a,b,c}.md verbatim on stdout — the single playbook
#      injected into the skill body. The other two modes never enter context.
# Self-locating via $0 (POSIX) — references resolved relative to this script's
# own dir, not the host CWD. Fail-open: any detect failure routes to Mode A.
# Self-verifying — the caller injects this output and does NOT re-route.
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ref="$dir/../references"
args=${1:-}

# Mode C — improver fork. Keyed only on the leading "Mode: improver" marker.
if printf '%s\n' "$args" | grep -q '^Mode: improver'; then
  printf 'MODE: C\nsource: improver-fork\n\n'
  cat "$ref/mode-c.md"
  exit 0
fi

# Bootstrap (Mode A / B) — first token is the target path, default ".".
path=$(printf '%s' "$args" | awk '{print $1}')
[ -n "$path" ] || path=.
# detect_state.sh needs bash (arrays via lib_find_excludes.sh); invoke the
# interpreter explicitly rather than relying on an exec bit.
state=$(bash "$dir/detect_state.sh" "$path" 2>/dev/null | awk -F': ' '/^state:/{print $2}')
[ -n "$state" ] || state=none

if [ "$state" = "has-rules" ]; then
  printf 'MODE: B\nproject-path: %s\nstate: %s\n\n' "$path" "$state"
  cat "$ref/mode-b.md"
else
  printf 'MODE: A\nproject-path: %s\nstate: %s\n\n' "$path" "$state"
  cat "$ref/mode-a.md"
fi
