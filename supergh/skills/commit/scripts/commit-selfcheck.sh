#!/usr/bin/env bash
#
# commit-selfcheck.sh - weryfikuje, czy commit powstał, porównując HEAD sprzed i po commicie.
#
# Użycie:
#   commit-selfcheck.sh <before_sha>
#
# Parametry:
#   before_sha (wymagany) - SHA HEAD sprzed commita
#
# Wypisuje jedno słowo na stdout:
#   VERIFIED - HEAD się zmienił (commit powstał)
#   FAILED   - HEAD bez zmian (commit nie powstał)
set -euo pipefail

before="${1:-}"

if [[ -z "$before" ]]; then
  echo "error: missing required parameter 'before_sha'" >&2
  echo "usage: commit-selfcheck.sh <before_sha>" >&2
  exit 1
fi

# --verify -q: puste (nie smiec) gdy HEAD wciaz unborn (commit nie powstal).
after="$(git rev-parse --verify -q HEAD 2>/dev/null || true)"

# VERIFIED tylko gdy HEAD istnieje I ruszyl wzgledem before (sentinel "(none)"
# przy pierwszym root-commicie tez przechodzi; pusty after => FAILED).
if [[ -n "$after" && "$after" != "$before" ]]; then
  echo "VERIFIED"
else
  echo "FAILED"
fi
