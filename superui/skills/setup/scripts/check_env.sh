#!/bin/sh
# superui - skills/setup/scripts/check_env.sh
# Diagnostic environment report for the setup skill: the Node.js runtime the
# pipeline's *.ts steps run on (native type stripping, zero third-party
# dependencies). Self-verifying, diagnostic-only - the setup skill trusts its
# lines verbatim and never re-checks them.
#
# IN : (no args). Reads $CLAUDE_PLUGIN_ROOT when set (normal skill invocation)
#      to locate the plugin-root check_node.sh; falls back to a path relative
#      to this script (../../../scripts/check_node.sh) for a direct/manual run.
# OUT: one line per check on stdout -
#        NODE <cmd>       a working runtime found; <cmd> is the exact command to
#                         run the bundled .ts scripts (`node`, or
#                         `node --experimental-strip-types` on 22.6 <= v < 23.6)
#        NODE MISSING     node absent, or older than 22.6
#        VERSION <v>      the installed node version (reported only when node exists)
#      ALWAYS exits 0 (diagnostic only - a failing check is data, not an error).
set -eu

script_dir=$(cd "$(dirname "$0")" && pwd)
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -n "$plugin_root" ] && [ -f "$plugin_root/scripts/check_node.sh" ]; then
  check_node="$plugin_root/scripts/check_node.sh"
else
  check_node="$script_dir/../../../scripts/check_node.sh"
fi

node_result=$(sh "$check_node")
case "$node_result" in
  "NODE_OK "*)
    echo "NODE ${node_result#NODE_OK }"
    ;;
  *)
    echo "NODE MISSING"
    ;;
esac
if command -v node >/dev/null 2>&1; then
  echo "VERSION $(node -v 2>/dev/null || echo unknown)"
fi

exit 0
