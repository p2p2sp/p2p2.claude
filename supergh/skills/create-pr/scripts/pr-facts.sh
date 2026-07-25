#!/bin/sh
# supergh - skills/create-pr/scripts/pr-facts.sh
# Gathers every git/gh fact the PR flow needs after issue resolution, in ONE call:
# issue title, first-commit subject, closes-refs, changed files, raw commit messages.
# Replaces up to 4 prose calls (gh issue view, git log x2, git diff --name-only) spread
# over SKILL.md Steps 4 and 6. Reports facts only - title/fallback logic stays in the
# skill. Fail-soft: a failed probe yields an empty value, never a broken block.
#
# IN : $1 = base branch, $2 = head branch, $3 = issue number (optional)
#      The commit range prefers "<base>..<head>"; when <base> does not resolve locally
#      it falls back to "origin/<base>..<head>".
# OUT: block on stdout -
#        ISSUE_TITLE=<title>     only when $3 given and the fetch succeeded
#        ISSUE_ERROR=<one line>  only when $3 given and the fetch failed / empty title
#        FIRST_SUBJECT=<s>       subject of the first commit past base ("" if none)
#        CLOSES=<n,m>            distinct issue numbers from closes/fixes/resolves refs
#                                in commit messages of the range, $3 excluded ("" if none)
#        CHANGED_FILES=<a,b>     git diff --name-only over the range, comma-joined
#        COMMITS:                marker line; the rest is the raw output of
#                                `git log <range> --reverse --format='%s%n%b%n---'`
# exit: 0 always; 2 on missing arguments.
set -u

base=${1:-}; head=${2:-}; issue=${3:-}
if [ -z "$base" ] || [ -z "$head" ]; then
  echo "ERROR pr-facts.sh: need <base> <head> [issue-number]" >&2
  exit 2
fi

if [ -n "$issue" ]; then
  if t=$(gh issue view "$issue" --json title --jq .title 2>&1) && [ -n "$t" ]; then
    echo "ISSUE_TITLE=$(printf '%s' "$t" | tr '\n\r' '  ')"
  else
    echo "ISSUE_ERROR=$(printf '%s' "$t" | tr '\n\r' '  ')"
  fi
fi

baseref=$base
git rev-parse --verify -q "$baseref" >/dev/null 2>&1 || baseref="origin/$base"
range="$baseref..$head"

echo "FIRST_SUBJECT=$(git log "$range" --reverse --format=%s 2>/dev/null | head -n 1)"

nums=$(git log "$range" --format=%B 2>/dev/null \
  | tr 'A-Z' 'a-z' \
  | grep -oE '(closes|fixes|resolves)[[:space:]]+#[0-9]+' \
  | grep -oE '[0-9]+' | sort -un)
closes=""
for n in $nums; do
  [ -n "$issue" ] && [ "$n" = "$issue" ] && continue
  closes="$closes,$n"
done
echo "CLOSES=${closes#,}"

echo "CHANGED_FILES=$(git diff --name-only "$range" 2>/dev/null | paste -s -d, -)"

echo "COMMITS:"
git log "$range" --reverse --format='%s%n%b%n---' 2>/dev/null
exit 0
