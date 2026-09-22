#!/bin/sh
# supergh - shared/scripts/preflight.sh
# Plugin-level read-only preflight, `!`-injected at skill-load by every supergh skill
# that otherwise opens with 2-5 sequential gh/git probes (create-issue, create-pr).
# It collects the start-of-flow facts ONCE so the skill reads a single
# injected block instead of round-tripping `gh --version` -> `gh auth status` ->
# `git rev-parse …`. STOP logic stays in the skill (it reads these facts and decides);
# this script only reports - it never prints a message, never halts a flow.
#
# IN : (no args)
# OUT: a KEY=VALUE block on stdout, one key per line, ALWAYS in this order -
#        GH_PRESENT=1|0      gh CLI is callable
#        GH_AUTH=ok|fail     `gh auth status` exit 0 (fail also when gh absent)
#        BRANCH=<name>       `git rev-parse --abbrev-ref HEAD` ("" if not a repo / detached)
#        UPSTREAM=<ref>      `git rev-parse --abbrev-ref @{u}` ("" if branch not pushed)
#        REPO=<owner/name>   parsed from `git remote get-url origin` ("" if none) - local,
#                            no network gh call (keeps an always-on preflight cheap)
#      ALWAYS exits 0 (fail-open: a probe failure must never break skill load - it just
#      yields an empty / fail value the skill then acts on).
# No `set -e`: every probe is individually fail-soft; the block must always print in full.
set -u

if command -v gh >/dev/null 2>&1; then
  echo "GH_PRESENT=1"
  if gh auth status >/dev/null 2>&1; then
    echo "GH_AUTH=ok"
  else
    echo "GH_AUTH=fail"
  fi
else
  echo "GH_PRESENT=0"
  echo "GH_AUTH=fail"
fi

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
# On a detached HEAD, `--abbrev-ref HEAD` succeeds and prints the literal string
# "HEAD" (not empty) - normalize that to "" to honor the contract above.
[ "$branch" = "HEAD" ] && branch=""
echo "BRANCH=$branch"

upstream=$(git rev-parse --abbrev-ref '@{u}' 2>/dev/null || true)
echo "UPSTREAM=$upstream"

url=$(git remote get-url origin 2>/dev/null || true)
# owner/name from either git@github.com:owner/name.git or https://github.com/owner/name(.git)
repo=$(printf '%s' "$url" | sed -e 's#^.*github\.com[:/]##' -e 's#\.git$##')
echo "REPO=$repo"

exit 0
