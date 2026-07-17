#!/bin/sh
# supergh — skills/create-pr/scripts/check-base.sh
# Verifies the user-confirmed base branch in one deterministic call: does the base exist
# on origin, and is there already an open PR head->base? Replaces the 2-3 prose calls
# (git rev-parse, git branch -r filtering, gh pr list) in SKILL.md Step 2. Reports facts
# only — STOP / re-ask logic stays in the skill.
#
# IN : $1 = base branch (as confirmed by the user, without "origin/")
#      $2 = head branch (the current branch)
# OUT: KEY=VALUE block on stdout —
#        BASE_EXISTS=1|0        refs/remotes/origin/<base> resolves
#        REMOTE_BRANCHES=<a,b>  only when BASE_EXISTS=0: origin/* names (prefix stripped),
#                               minus origin/HEAD and the head branch itself, comma-joined
#        OPEN_PR=<url|empty>    only when BASE_EXISTS=1: first open PR head->base
#                               (fail-open: a gh probe failure yields empty — gh pr create
#                               still rejects a duplicate downstream)
# exit: 0 always (fail-open facts); 2 on missing arguments.
set -u

base=${1:-}; head=${2:-}
if [ -z "$base" ] || [ -z "$head" ]; then
  echo "ERROR check-base.sh: need <base> <head>" >&2
  exit 2
fi

if git rev-parse --verify -q "refs/remotes/origin/$base" >/dev/null 2>&1; then
  echo "BASE_EXISTS=1"
  pr=$(gh pr list --head "$head" --base "$base" --state open \
        --json url --jq '.[0].url // ""' 2>/dev/null | tr -d '\r' || true)
  echo "OPEN_PR=$pr"
else
  echo "BASE_EXISTS=0"
  branches=$(git branch -r 2>/dev/null \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]].*$//' \
    | grep '^origin/' | grep -v '^origin/HEAD$' | grep -v "^origin/$head\$" \
    | sed 's#^origin/##' | paste -s -d, -)
  echo "REMOTE_BRANCHES=$branches"
fi
exit 0
