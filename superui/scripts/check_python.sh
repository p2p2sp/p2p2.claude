#!/bin/sh
# superui — scripts/check_python.sh
# Plugin-level Python interpreter preflight, shared by every superui skill that runs a
# bundled .py step. Resolves the first WORKING interpreter so the skill can substitute
# it (or halt with a clear message) before any `python …` step — instead of the agent
# hitting a raw `python: command not found` (common on Windows: absent / Store stub; on
# Linux often only python3 exists).
#
# IN : (no args)
# OUT: exactly one line on stdout —
#        PYTHON_OK <cmd>   first of python|python3|py that is callable AND prints a
#                          non-empty `--version` (the non-empty check skips the Windows
#                          Store stub, which can exit 0 with no output)
#        PYTHON_MISSING    none of the candidates is a working interpreter
#      ALWAYS exits 0 (fail-open: a missing interpreter must never break skill load).
set -eu

for cmd in python python3 py; do
  command -v "$cmd" >/dev/null 2>&1 || continue
  ver=$("$cmd" --version 2>&1) || continue
  [ -n "$ver" ] || continue
  echo "PYTHON_OK $cmd"
  exit 0
done

echo "PYTHON_MISSING"
exit 0
