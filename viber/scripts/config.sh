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
# Contract:
#   argv   : none.
#   cwd    : any directory inside the host project - the repository root is
#            resolved here. Outside a repository, the cwd is the base.
#   env    : none.
#   file   : <repo root>/.claude/viber.yml (optional). No file -> every key false.
#   keys   : adr, memory, rules. A key is `true` ONLY when the file holds a line
#            matching `^\s*<key>\s*:\s*true` (the value ended by a space, a
#            comment or the end of the line). An absent key -> false.
#   stdout : a header line plus one `<key>: <true|false>` line per key, in a
#            fixed order. Values normalised to true/false.
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

echo "# viber config (resolved)"
for key in adr memory rules; do
  printf '%s: %s\n' "$key" "$(resolve "$key")"
done

exit 0
