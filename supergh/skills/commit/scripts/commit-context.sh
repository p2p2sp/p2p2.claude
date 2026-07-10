#!/usr/bin/env bash
#
# commit-context.sh — emituje kontekst do skomponowania commit message:
#   - kilka ostatnich tematow commitow (styl/scope repo do dopasowania),
#   - liste zmian (git status) wlasciwa dla selektora,
#   - diff wlasciwy dla selektora (staged -> --cached, path -> vs HEAD dla sciezki,
#     inaczej -> vs HEAD), z limitem rozmiaru, by nie zalac kontekstu forka.
#
# Uzycie:
#   commit-context.sh [selector]
#
# Parametry:
#   selector (opcjonalny) — pelny string argumentow skilla. Interpretacja jak w
#                           commit-args.sh: ""/all -> all, staged -> staged,
#                           cokolwiek innego -> sciezka (kontekst zawezony do niej).
#
# Uwaga: swiadomie BEZ `set -e` — to best-effort kontekst; pojedyncza nieudana
# komenda git nie moze wywalic ladowania skilla.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/commit-args.sh"

mode_raw="${1:-}"
MAX_LINES=400

resolve_commit_selector "$mode_raw"

# Baza diffa: HEAD gdy branch ma commity, inaczej pusty obiekt drzewa (unborn
# branch / swieze repo bez HEAD). git diff <empty-tree> pokazuje staged dodatki
# zamiast wywalac sie fatalem "ambiguous argument 'HEAD'".
if git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  BASE="HEAD"
else
  BASE="$(git hash-object -t tree /dev/null 2>/dev/null || echo 4b825dc642cb6eb9a060e54bf8d69288fbee4904)"
fi

if [ "$COMMIT_MODE" = "path" ]; then
  echo "## Selector: path — run commit.sh with 2nd arg \"$COMMIT_PATH\""
elif [ "$COMMIT_MODE" = "staged" ]; then
  echo "## Selector: staged — run commit.sh with 2nd arg \"staged\""
else
  echo "## Selector: all — run commit.sh with no 2nd arg"
fi
echo

echo "## Current branch (issue-footer source)"
# symbolic-ref: czysta nazwa brancha takze na unborn (main), bez fatala HEAD.
git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || true
echo

echo "## Recent commit subjects (match this type/scope style)"
git log --oneline -n 10 2>&1 || true
echo

if [ "$COMMIT_MODE" = "path" ]; then
  echo "## Changes (git status for path: $COMMIT_PATH)"
  git status --short --untracked-files=all -- "$COMMIT_PATH" 2>&1 || true
else
  echo "## Changes (git status, all untracked files)"
  git status --short --untracked-files=all 2>&1 || true
fi
echo

if [ "$COMMIT_MODE" = "staged" ]; then
  echo "## Overview (git diff --cached --stat)"
  git diff --cached --stat 2>&1 || true
  echo
  echo "## Diff (staged only)"
  diff_out="$(git diff --cached 2>&1)"
elif [ "$COMMIT_MODE" = "path" ]; then
  echo "## Overview (git diff HEAD --stat for path: $COMMIT_PATH)"
  git diff "$BASE" --stat -- "$COMMIT_PATH" 2>&1 || true
  echo
  echo "## Diff (changes vs HEAD for path: $COMMIT_PATH; a new untracked file appears only in git status above)"
  diff_out="$(git diff "$BASE" -- "$COMMIT_PATH" 2>&1)"
else
  echo "## Overview (git diff HEAD --stat)"
  git diff "$BASE" --stat 2>&1 || true
  echo
  echo "## Diff (all tracked changes vs HEAD; new untracked files are listed in git status above)"
  diff_out="$(git diff "$BASE" 2>&1)"
fi

if [ -z "$diff_out" ]; then
  echo "(no textual diff for this mode)"
else
  total=$(printf '%s\n' "$diff_out" | wc -l | tr -d ' ')
  printf '%s\n' "$diff_out" | head -n "$MAX_LINES"
  if [ "$total" -gt "$MAX_LINES" ]; then
    echo "... [diff truncated: showing first ${MAX_LINES} of ${total} lines — run git diff for the rest]"
  fi
fi
