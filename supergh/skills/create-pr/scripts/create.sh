#!/bin/sh
# supergh — skills/create-pr/scripts/create.sh
# Creates the draft PR and parses the printed URL in one deterministic step. `--draft`
# and `--body-file` are hardcoded here, so the invariants (always draft, never an inline
# body) cannot be skipped by the caller. Self-verifying: PR_URL is printed only after gh
# returned a well-formed PR URL — the caller trusts the block without re-checking.
#
# IN : $1 = base branch, $2 = head branch, $3 = body file path (from body-path.sh),
#      $4 = title
# OUT: KEY=VALUE block on stdout —
#        PR_URL=https://github.com/{owner}/{repo}/pull/{N}
#        PR_NUMBER=<N>
# exit: 0 with the block above; 1 (one ERROR line on stderr) when `gh pr create` failed
#       or printed no parsable URL — nothing created to trust, caller STOPs; 2 on bad
#       arguments.
set -u

base=${1:-}; head=${2:-}; body=${3:-}; title=${4:-}
if [ -z "$base" ] || [ -z "$head" ] || [ -z "$body" ] || [ -z "$title" ]; then
  echo "ERROR create.sh: need <base> <head> <body_path> <title>" >&2
  exit 2
fi

out=$(gh pr create --base "$base" --head "$head" --draft \
      --title "$title" --body-file "$body" 2>&1)
st=$?
url=$(printf '%s\n' "$out" | tr -d '\r' \
  | sed -n 's#^\(https://github\.com/[^/]*/[^/]*/pull/[0-9][0-9]*\)$#\1#p' | tail -n 1)
if [ $st -ne 0 ] || [ -z "$url" ]; then
  echo "ERROR create.sh: gh pr create failed: $(printf '%s' "$out" | tr '\n\r' '  ')" >&2
  exit 1
fi

echo "PR_URL=$url"
echo "PR_NUMBER=${url##*/}"
exit 0
