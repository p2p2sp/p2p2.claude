#!/usr/bin/env bash
#
# commit-context.sh - emituje kontekst do skomponowania commit message:
#   - kilka ostatnich tematow commitow (styl/scope repo do dopasowania),
#   - liste zmian (git status) wlasciwa dla selektora,
#   - diff wlasciwy dla selektora (paths -> vs HEAD dla tych sciezek, inaczej ->
#     vs HEAD), z limitem rozmiaru, by nie zalac kontekstu forka.
#
# Uzycie:
#   commit-context.sh [selector]
#
# Parametry:
#   selector (opcjonalny) - pelny string argumentow skilla. Interpretacja jak w
#                           commit-args.sh: ""/all -> all,
#                           lista istniejacych sciezek -> paths (kontekst
#                           zawezony do nich), reszta -> all.
#
# Uwaga: swiadomie BEZ `set -e` - to best-effort kontekst; pojedyncza nieudana
# komenda git nie moze wywalic ladowania skilla.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/commit-args.sh"

mode_raw="${1:-}"
MAX_LINES=400

resolve_commit_selector "$mode_raw"
paths_label="${COMMIT_PATHS[*]:-}"

# Baza diffa: HEAD gdy branch ma commity, inaczej pusty obiekt drzewa (unborn
# branch / swieze repo bez HEAD). git diff <empty-tree> pokazuje staged dodatki
# zamiast wywalac sie fatalem "ambiguous argument 'HEAD'".
if git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  BASE="HEAD"
else
  BASE="$(git hash-object -t tree /dev/null 2>/dev/null || echo 4b825dc642cb6eb9a060e54bf8d69288fbee4904)"
fi

if [ "$COMMIT_MODE" = "paths" ]; then
  echo "## Selector: paths - run commit.sh with 2nd arg \"$paths_label\""
else
  echo "## Selector: all - run commit.sh with no 2nd arg"
fi
echo

if [ -n "$COMMIT_ISSUE_REFS" ]; then
  echo "## Issue footer (explicit, from a #N reference or GitHub issue link in the arguments - use verbatim, ignore the branch)"
  refs=""
  for n in $COMMIT_ISSUE_REFS; do refs="${refs:+$refs, }#$n"; done
  echo "Refs: $refs"
  echo
fi

echo "## Current branch (issue-footer source)"
# symbolic-ref: czysta nazwa brancha takze na unborn (main), bez fatala HEAD.
git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || true
echo

echo "## Recent commit subjects (match this type/scope style)"
git log --oneline -n 10 2>&1 || true
echo

if [ "$COMMIT_MODE" = "paths" ]; then
  echo "## Changes (git status for paths: $paths_label)"
  git status --short --untracked-files=all -- "${COMMIT_PATHS[@]}" 2>&1 || true
else
  echo "## Changes (git status, all untracked files)"
  git status --short --untracked-files=all 2>&1 || true
fi
echo

if [ "$COMMIT_MODE" = "paths" ]; then
  echo "## Overview (git diff HEAD --stat for paths: $paths_label)"
  git diff "$BASE" --stat -- "${COMMIT_PATHS[@]}" 2>&1 || true
  echo
  echo "## Diff (changes vs HEAD for paths: $paths_label; a new untracked file appears only in git status above)"
  diff_out="$(git diff "$BASE" -- "${COMMIT_PATHS[@]}" 2>&1)"
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
    echo "... [diff truncated: showing first ${MAX_LINES} of ${total} lines - run git diff for the rest]"
  fi
fi
