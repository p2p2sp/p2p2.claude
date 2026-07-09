#!/usr/bin/env bash
#
# commit-selfcheck.sh — weryfikuje, czy commit powstał, porównując HEAD sprzed i po commicie.
#
# Użycie:
#   commit-selfcheck.sh <before_sha>
#
# Parametry:
#   before_sha (wymagany) — SHA HEAD sprzed commita
#
# Wypisuje jedno słowo na stdout:
#   VERIFIED — HEAD się zmienił (commit powstał)
#   FAILED   — HEAD bez zmian (commit nie powstał)
set -euo pipefail

before="${1:-}"

if [[ -z "$before" ]]; then
  echo "error: missing required parameter 'before_sha'" >&2
  echo "usage: commit-selfcheck.sh <before_sha>" >&2
  exit 1
fi

after="$(git rev-parse HEAD 2>&1)"

if [[ "$after" != "$before" ]]; then
  echo "VERIFIED"
else
  echo "FAILED"
fi
