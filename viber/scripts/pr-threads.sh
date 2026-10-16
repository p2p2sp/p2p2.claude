#!/bin/sh
#
# pr-threads.sh - resolves the branch facts of one pull request for the skill
# that turns its review threads into plan tasks: the pull request's number,
# url and head branch, the branch checked out here and whether the local HEAD
# is the commit the pull request head points at, as one fixed text block.
#
# It exists so the skill reads a pull request through ONE pre-approved command
# with a fixed output shape: a hand-composed `gh api graphql` differs per run
# in query and flags, and each variant is a new, unapproved command. The
# filter runs through gh's own `--jq`, so no external `jq` is needed.
# Self-verifying: the block is printed only after gh exited 0 AND returned the
# url, the head branch and the head commit - the caller trusts it and never
# re-fetches. Nothing is checked out, pushed or written here.
#
# Contract:
#   argv   : exactly one: <N> | #<N> | https://<host>/<owner>/<repo>/pull/<N>
#            (a URL's #... fragment or ?... query is dropped). Anything else ->
#            exit 2 with one ERROR line on stderr and nothing on stdout, gh not
#            called.
#   cwd    : any directory inside the host repository - the script resolves the
#            repository root itself. Outside one, the answer is `no-repo`. A
#            bare number is resolved against the repository of the cwd.
#   env    : none of its own; gh reads its usual auth and host config.
#   gh     : `gh api graphql` for pullRequest(number) { url headRefName
#            headRefOid reviewThreads(first: 100) { pageInfo { hasNextPage }
#            nodes { isResolved isOutdated path line originalLine
#            comments(first: 100) { nodes { databaseId author { login }
#            createdAt body } } } } }. A URL gives owner, name and
#            `--hostname <host>`; a bare number the {owner}/{repo}
#            placeholders of the cwd repository.
#   git    : read-only: the root, the current branch, the HEAD commit.
#   stdout : exit 0, lines in this order:
#              STATUS=ready|stop
#              REASON=no-gh|no-repo|wrong-branch   (stop only)
#              PR=<N>
#              PR_URL=<url>
#              HEAD_BRANCH=<headRefName>
#              BRANCH=<current branch, empty when HEAD is detached>
#              PUSHED=yes|no                       (local HEAD equals headRefOid)
#            A no-gh or no-repo stop prints only STATUS= and REASON=. A
#            wrong-branch stop (BRANCH differs from HEAD_BRANCH) prints the
#            block up to PUSHED=.
#   exit   : 0 with the block (a stop included); 1 with one `ERROR
#            pr-threads.sh: ...` line on stderr and nothing on stdout when gh
#            failed or its output did not parse; 2 on bad arguments.
#
set -u

usage() {
  echo "ERROR pr-threads.sh: need exactly one <pull request number or url>: $1" >&2
  exit 2
}

[ $# -eq 1 ] || usage "got $#"
ref=${1#\#}
host=""
owner_name=""
case $ref in
  ''|*[!0-9]*)
    case $ref in https://*/pull/*) ;; *) usage "$1" ;; esac
    ref=${ref%%[#?]*}
    n=${ref##*/pull/}
    mid=${ref#https://}
    mid=${mid%/pull/*}
    case $n in ''|*[!0-9]*) usage "$1" ;; esac
    case $mid in /*|*/|*//*|*/*/*/*) usage "$1" ;; */*/*) ;; *) usage "$1" ;; esac
    host=${mid%%/*}
    owner_name=${mid#*/}
    ;;
  *) n=$ref ;;
esac

stop() {
  printf 'STATUS=stop\nREASON=%s\n' "$1"
  exit 0
}

command -v gh >/dev/null 2>&1 || stop no-gh
root=$(git rev-parse --show-toplevel 2>/dev/null)
[ -n "$root" ] && cd "$root" 2>/dev/null || stop no-repo

query='query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $number) { url headRefName headRefOid reviewThreads(first: 100) { pageInfo { hasNextPage } nodes { isResolved isOutdated path line originalLine comments(first: 100) { nodes { databaseId author { login } createdAt body } } } } } } }'
filter='.data.repository.pullRequest | "URL=\(.url)\nHEAD=\(.headRefName)\nOID=\(.headRefOid)"'

set -- api graphql
if [ -n "$host" ]; then
  set -- "$@" --hostname "$host" -f "owner=${owner_name%%/*}" -f "name=${owner_name#*/}"
else
  set -- "$@" -F 'owner={owner}' -F 'name={repo}'
fi
set -- "$@" -F "number=$n" -f "query=$query" --jq "$filter"

errf=$(mktemp 2>/dev/null) || errf=""
if [ -n "$errf" ]; then
  trap 'rm -f "$errf"' EXIT
  out=$(gh "$@" 2>"$errf")
  st=$?
  err=$(tr '\n\r' '  ' < "$errf")
else
  out=$(gh "$@" 2>/dev/null)
  st=$?
  err="(stderr not captured)"
fi

out=$(printf '%s\n' "$out" | tr -d '\r')
pr_url=$(printf '%s\n' "$out" | sed -n 's/^URL=//p' | sed -n 1p)
head_branch=$(printf '%s\n' "$out" | sed -n 's/^HEAD=//p' | sed -n 1p)
head_oid=$(printf '%s\n' "$out" | sed -n 's/^OID=//p' | sed -n 1p)
if [ $st -ne 0 ] || [ -z "$pr_url" ] || [ -z "$head_branch" ] || [ -z "$head_oid" ]; then
  echo "ERROR pr-threads.sh: gh api graphql failed: $err" >&2
  exit 1
fi

branch=$(git symbolic-ref --short -q HEAD 2>/dev/null)
local_oid=$(git rev-parse -q --verify HEAD 2>/dev/null)
pushed=no
if [ -n "$local_oid" ] && [ "$local_oid" = "$head_oid" ]; then pushed=yes; fi

if [ "$branch" = "$head_branch" ]; then status=ready; else status=stop; fi
echo "STATUS=$status"
if [ "$status" = stop ]; then echo "REASON=wrong-branch"; fi
echo "PR=$n"
echo "PR_URL=$pr_url"
echo "HEAD_BRANCH=$head_branch"
echo "BRANCH=$branch"
echo "PUSHED=$pushed"
exit 0
