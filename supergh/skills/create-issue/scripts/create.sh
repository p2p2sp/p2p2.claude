#!/bin/sh
# supergh - skills/create-issue/scripts/create.sh
# Creates the GitHub issue and (optionally) applies the issue type in one deterministic
# step: `gh issue create` -> parse the printed URL -> REST PATCH the type (no `--type`
# flag exists on `gh issue create`). Replaces the 3-call prose dance (create, URL parse,
# PATCH + benign-error triage) in SKILL.md Step 8. Self-verifying: ISSUE_URL is printed
# only after gh returned a well-formed issue URL - the caller trusts the block without
# re-checking.
#
# IN : $1 = body file path (from body-path.sh)
#      $2 = title
#      remaining args, in any order:
#        --type <T>       issue type to PATCH after creation (optional)
#        --label <L>      repeatable, passed to gh verbatim
#        --assignee <A>   repeatable, passed to gh verbatim
#        --project <P>    repeatable, passed to gh verbatim
# OUT: KEY=VALUE block on stdout -
#        ISSUE_URL=https://github.com/{owner}/{repo}/issues/{N}
#        ISSUE_NUMBER=<N>
#        TYPE=applied|dropped|error|none
#        TYPE_ERROR=<one line>   (only when TYPE=dropped|error)
#      TYPE=dropped -> benign type failure (types not enabled / type or repo not found /
#      validation / 403 / 404): the issue exists, caller warns and continues.
#      TYPE=error   -> unexpected PATCH failure: the issue still exists (never rolled
#      back), caller surfaces TYPE_ERROR and continues.
# exit: 0 with the block above; 1 (one ERROR line on stderr) when `gh issue create`
#       itself failed or printed no parsable URL - nothing created to trust, caller STOPs;
#       2 on bad arguments.
set -u

body=${1:-}; title=${2:-}
if [ -z "$body" ] || [ -z "$title" ]; then
  echo "ERROR create.sh: need <body_path> <title> [flags]" >&2
  exit 2
fi
shift 2

# Split off --type; keep --label/--assignee/--project pairs verbatim for gh.
type=""
i=$#
while [ $i -gt 0 ]; do
  a=$1; shift; i=$((i-1))
  case $a in
    --type)
      [ $i -gt 0 ] || { echo "ERROR create.sh: --type needs a value" >&2; exit 2; }
      type=$1; shift; i=$((i-1)) ;;
    --label|--assignee|--project)
      [ $i -gt 0 ] || { echo "ERROR create.sh: $a needs a value" >&2; exit 2; }
      set -- "$@" "$a" "$1"; shift; i=$((i-1)) ;;
    *)
      echo "ERROR create.sh: unknown flag $a" >&2; exit 2 ;;
  esac
done

out=$(gh issue create --title "$title" --body-file "$body" "$@" 2>&1)
st=$?
url=$(printf '%s\n' "$out" | tr -d '\r' \
  | sed -n 's#^\(https://github\.com/[^/]*/[^/]*/issues/[0-9][0-9]*\)$#\1#p' | tail -n 1)
if [ $st -ne 0 ] || [ -z "$url" ]; then
  echo "ERROR create.sh: gh issue create failed: $(printf '%s' "$out" | tr '\n\r' '  ')" >&2
  exit 1
fi

number=${url##*/}
ownerrepo=${url#https://github.com/}
ownerrepo=${ownerrepo%/issues/*}
echo "ISSUE_URL=$url"
echo "ISSUE_NUMBER=$number"

if [ -z "$type" ]; then
  echo "TYPE=none"
elif perr=$(gh api -X PATCH "repos/$ownerrepo/issues/$number" -f type="$type" 2>&1 >/dev/null); then
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
