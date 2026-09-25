#!/bin/sh
# viber - scripts/create-issue.sh
#
# Creates a GitHub issue and, when a type was requested, applies it through
# the REST API in one deterministic step: `gh issue create` -> parse the
# printed URL -> REST PATCH the type (no `--type` flag exists on `gh issue
# create`). Ported from the retired supergh `create-issue` skill's
# `scripts/create.sh` (git history before commit 6e9b1004) so an intent
# interview or a triage diagnosis that did not start from an issue can save
# its conclusion as a new one, built from the project's own issue templates.
# Self-verifying: ISSUE_URL is printed only after gh returned a well-formed
# issue URL - the caller trusts the block without re-checking. Generalized
# past github.com so the PATCH resolves through `gh api --hostname <host>`
# against the issue's own host, GitHub Enterprise included.
#
# Contract:
#   argv : $1 = body file path, $2 = title, then in any order:
#            --type <T>       issue type to PATCH after creation (optional)
#            --label <L>      repeatable, passed to gh verbatim
#            --assignee <A>   repeatable, passed to gh verbatim
#            --project <P>    repeatable, passed to gh verbatim
#   cwd  : gh resolves the repository from the cwd.
#   env  : none of its own; gh reads its usual auth and host config.
#   stdout, exit 0:
#            ISSUE_URL=https://<host>/<owner>/<repo>/issues/<N>
#            ISSUE_NUMBER=<N>
#            TYPE=applied|dropped|error|none
#            TYPE_ERROR=<one line>        (only with dropped or error)
#          TYPE: none = no --type; applied = the PATCH on
#          repos/<owner>/<repo>/issues/<N> via `gh api --hostname <host>`
#          succeeded; dropped = that PATCH failed on a benign reason (types
#          not enabled / not found / issue types / validation failed / 403 /
#          404); error = any other PATCH failure. Either way the issue is
#          never removed.
#   exit 1: one ERROR line on stderr, nothing on stdout - gh missing, `gh
#           issue create` failed or printed no parsable issue URL.
#   exit 2: missing body file or title, body file not found, or an unknown or
#           valueless flag - gh is never invoked.
set -u

body=${1:-}; title=${2:-}
if [ -z "$body" ] || [ -z "$title" ]; then
  echo "ERROR create-issue.sh: need <body file> <title> [flags]" >&2
  exit 2
fi
if [ ! -f "$body" ]; then
  echo "ERROR create-issue.sh: body file not found: $body" >&2
  exit 2
fi
shift 2

# Split off --type; keep --label/--assignee/--project pairs verbatim for gh,
# in the order they arrived.
type=""
i=$#
while [ $i -gt 0 ]; do
  a=$1; shift; i=$((i-1))
  case $a in
    --type)
      [ $i -gt 0 ] || { echo "ERROR create-issue.sh: --type needs a value" >&2; exit 2; }
      type=$1; shift; i=$((i-1)) ;;
    --label|--assignee|--project)
      [ $i -gt 0 ] || { echo "ERROR create-issue.sh: $a needs a value" >&2; exit 2; }
      set -- "$@" "$a" "$1"; shift; i=$((i-1)) ;;
    *)
      echo "ERROR create-issue.sh: unknown flag $a" >&2; exit 2 ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR create-issue.sh: gh not found on PATH" >&2
  exit 1
fi

out=$(gh issue create --title "$title" --body-file "$body" "$@" 2>&1)
st=$?
url=$(printf '%s\n' "$out" | tr -d '\r' \
  | sed -n 's#^\(https://[^/][^/]*/[^/][^/]*/[^/][^/]*/issues/[0-9][0-9]*\)$#\1#p' | tail -n 1)
if [ $st -ne 0 ] || [ -z "$url" ]; then
  echo "ERROR create-issue.sh: gh issue create failed: $(printf '%s' "$out" | tr '\n\r' '  ')" >&2
  exit 1
fi

number=${url##*/}
rest=${url#https://}
host=${rest%%/*}
ownerrepo=${rest#*/}
ownerrepo=${ownerrepo%/issues/*}
echo "ISSUE_URL=$url"
echo "ISSUE_NUMBER=$number"

if [ -z "$type" ]; then
  echo "TYPE=none"
elif perr=$(gh api --hostname "$host" -X PATCH "repos/$ownerrepo/issues/$number" -f type="$type" 2>&1 >/dev/null); then
  echo "TYPE=applied"
else
  line=$(printf '%s' "$perr" | tr '\n\r' '  ')
  low=$(printf '%s' "$line" | tr 'A-Z' 'a-z')
  case $low in
    *"not enabled"*|*"not found"*|*"issue types"*|*"validation failed"*|*403*|*404*)
      echo "TYPE=dropped" ;;
    *)
      echo "TYPE=error" ;;
  esac
  echo "TYPE_ERROR=$line"
fi
exit 0
