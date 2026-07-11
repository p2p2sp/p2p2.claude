#!/bin/sh
# superui — skills/setup/scripts/check_env.sh
# Diagnostic environment report for the setup skill: the Python interpreter plus
# the third-party modules (Pillow, numpy, PyYAML) the pipeline's *.py steps
# depend on. Self-verifying, diagnostic-only — the setup skill trusts its lines
# verbatim and never re-checks them.
#
# IN : (no args). Reads $CLAUDE_PLUGIN_ROOT when set (normal skill invocation)
#      to locate the plugin-root check_python.sh; falls back to a path relative
#      to this script (../../../scripts/check_python.sh) for a direct/manual run.
# OUT: one line per check on stdout —
#        PYTHON <cmd>                                 a working interpreter found
#        PYTHON MISSING                                none of python|python3|py works
#        MODULE <name> OK                              the module imports under <cmd>
#        MODULE <name> MISSING (pip install <pkg>)     import failed, or no interpreter
#      ALWAYS exits 0 (diagnostic only — a failing check is data, not an error).
set -eu

script_dir=$(cd "$(dirname "$0")" && pwd)
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -n "$plugin_root" ] && [ -f "$plugin_root/scripts/check_python.sh" ]; then
  check_python="$plugin_root/scripts/check_python.sh"
else
  check_python="$script_dir/../../../scripts/check_python.sh"
fi

py_result=$(sh "$check_python")
py_cmd=""
case "$py_result" in
  "PYTHON_OK "*)
    py_cmd=${py_result#PYTHON_OK }
    echo "PYTHON $py_cmd"
    ;;
  *)
    echo "PYTHON MISSING"
    ;;
esac

for pair in "PIL:pillow" "numpy:numpy" "yaml:pyyaml"; do
  module=${pair%%:*}
  pkg=${pair#*:}
  if [ -n "$py_cmd" ] && "$py_cmd" -c "import $module" >/dev/null 2>&1; then
    echo "MODULE $module OK"
  else
    echo "MODULE $module MISSING (pip install $pkg)"
  fi
done

exit 0
