#!/usr/bin/env bash
# read-config.sh - resolves the .claude/superdev.yml switches into the fixed
# block injected into simplebuild / superbuild when the skill loads.
#
# It exists because a grep|sed YAML parser is a compound command, and Claude
# Code splits a compound command and asks for approval on EVERY member (see
# setup/bootstrap.sh) - which kills the step on any permission mode that does
# not auto-accept everything. One script is ONE command to the permission
# engine.
#
# The config file is resolved against the REPOSITORY ROOT, not the caller's
# cwd. A `!` preload runs wherever the session started, and a session started
# in a subdirectory would otherwise find no file there and fail open with
# every switch false - silently turning off every opt-in layer the user
# configured. Outside a repository the cwd is the only base there is and the
# path resolves against it, as before.
#
# Contract:
#   argv   : none.
#   cwd    : any directory inside the host project - the repository root is
#            resolved here. Outside a repository, the cwd is the base.
#   env    : none.
#   file   : <repo root>/.claude/superdev.yml (optional). No file -> every key
#            false.
#   keys   : adr, rules, memory, changelog, cleanup, stats, qa, e2e-ui,
#            e2e-api. A key is `true` ONLY when the file holds a line matching
#            `^\s*<key>\s*:\s*true` (the value ended by a space, a comment or
#            the end of the line). A key that is absent -> false.
#   stdout : a header line plus one `<key>: <true|false>` line per key, in a
#            fixed order. Values normalised to true/false.
#   exit   : ALWAYS 0 (fail-open - a missing file or key never breaks the
#            mechanism, and a non-zero exit in a `!` preload would abort the
#            whole skill load).

set -u

# Resolve the repository root ONCE. `|| true` and the -d guard keep this
# fail-open: a git that is absent, or a cwd outside any repository, leaves the
# relative path standing rather than aborting the preload.
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$repo_root" ] && [ -d "$repo_root" ]; then
  cfg="$repo_root/.claude/superdev.yml"
else
  cfg=".claude/superdev.yml"
fi

# true iff the config holds a line `^\s*<key>\s*:\s*true` (the value ended by a
# space, a `#` or the end of the line). No file or no match -> false.
resolve() {
  key="$1"
  if [ -f "$cfg" ] && grep -qiE "^[[:space:]]*${key}[[:space:]]*:[[:space:]]*true([[:space:]]|#|$)" "$cfg"; then
    echo "true"
  else
    echo "false"
  fi
}

echo "# superdev config (resolved)"
for key in adr rules memory changelog cleanup stats qa e2e-ui e2e-api; do
  printf '%s: %s\n' "$key" "$(resolve "$key")"
done

exit 0
