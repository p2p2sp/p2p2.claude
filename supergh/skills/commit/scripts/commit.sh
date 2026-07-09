#!/usr/bin/env bash
#
# commit.sh — wykonuje git commit z podanym message.
#
# Uzycie:
#   commit.sh <message> [selector]
#
# Parametry:
#   message  (wymagany) — tresc commita
#   selector (opcjonalny):
#              (puste)/all — commituje wszystkie zmiany (staged + unstaged + nowe pliki)
#              staged       — commituje tylko zmiany juz staged
#              <sciezka>    — commituje TYLKO podana sciezke (plik lub katalog),
#                             izolowana od innych staged zmian; obsluguje sciezki
#                             POSIX, C:/, C:\ oraz /c/ (patrz commit-args.sh)
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/commit-args.sh"

message="${1:-}"
selector="${2:-}"

if [[ -z "$message" ]]; then
  echo "error: missing required parameter 'message'" >&2
  echo "usage: commit.sh <message> [selector]" >&2
  exit 1
fi

resolve_commit_selector "$selector"

case "$COMMIT_MODE" in
  all)    git add -A ;;
  staged) : ;;  # nic nie dodajemy — commitujemy istniejacy index
  path)   git add -- "$COMMIT_PATH" ;;
esac

if [[ "$COMMIT_MODE" == "path" ]]; then
  # tylko podana sciezka: sprawdz i commituj z ograniczeniem pathspec
  if git diff --cached --quiet -- "$COMMIT_PATH"; then
    echo "Nothing to commit."
    exit 0
  fi
  git commit -m "$message" -- "$COMMIT_PATH"
else
  if git diff --cached --quiet; then
    echo "Nothing to commit."
    exit 0
  fi
  git commit -m "$message"
fi
