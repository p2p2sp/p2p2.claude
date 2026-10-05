#!/bin/sh
#
# qa-comment.sh - posts one build's qa.md as a comment on a pull request, at
# most once per run.
#
# It exists so the build close and `create-pr` publish through ONE
# pre-approved command, and so a run reaching the pull request from both never
# posts twice: the body carries a marker naming the qa file, and a comment
# already holding a marker of the same run key - whether it named the run
# directory or its archive - skips the post. Self-verifying: COMMENT_URL is
# printed only after gh exited 0 AND printed a well-formed
# `.../pull/<N>#issuecomment-<id>` URL - the caller trusts it and never
# re-posts.
#
# Contract:
#   argv   : $1 = the qa file path; optionally `--pr <pull request URL>`
#            (`https://<host>/<owner>/<repo>/pull/<N>`, a `#...` fragment or
#            `?...` query dropped). Any other count, flag or URL shape -> exit 2.
#   cwd    : any directory inside the host repository - the script resolves the
#            repository root itself and a relative qa file path resolves from
#            that root, never from the cwd. Outside one, the answer is no-repo.
#   env    : none of its own; gh reads its usual auth and host config.
#   file   : the qa file, read verbatim, never modified. The body is written to
#            <repo root>/.temp/viber/qa-comment/<run key>.md and left there,
#            gh's stderr of the comments read beside it in <run key>.err:
#              line 1  <!-- viber:qa <repo-relative path of the qa file> -->
#              line 2  QA document: `<that path>`
#              line 3  empty
#              then    the qa file verbatim
#   run key: the name of the qa file's parent directory.
#   gh     : `gh pr list --head <branch> --state open` (no --pr only),
#            `gh pr view <pr> --json comments`, `gh pr comment <pr> --body-file`.
#   stdout : exit 0, one block:
#              STATUS=posted
#              COMMENT_URL=https://<host>/<owner>/<repo>/pull/<N>#issuecomment-<id>
#            or
#              STATUS=skip
#              REASON=no-gh | no-repo | no-pr | exists
#            Checks, in order: no-repo (not inside a repository), the qa file
#            (exit 2 when missing), no-gh (gh not on PATH), no-pr (no --pr and a
#            detached HEAD, or no open pull request whose head is the current
#            branch), exists (a comment of the target pull request holds
#            "<!-- viber:qa " with a path ending in "/<run key>/qa.md").
#   exit   : 0 with either block; 1 with one ERROR line on stderr and nothing on
#            stdout when gh failed reading the comments or posting, or printed no
#            comment URL - whether a comment landed is then unknown, so the
#            caller reports and never retries; 2 on bad arguments or a missing
#            qa file.
#
set -u

usage() {
  echo "ERROR qa-comment.sh: usage: qa-comment.sh <qa file path> [--pr <pull request URL>]" >&2
  exit 2
}
fail() {
  echo "ERROR qa-comment.sh: $1" >&2
  exit 1
}
skip() {
  printf 'STATUS=skip\nREASON=%s\n' "$1"
  exit 0
}

pr=""
case $# in
  1) ;;
  3)
    [ "$2" = --pr ] || usage
    pr=${3%%[#?]*}
    case $pr in https://*/pull/*) ;; *) usage ;; esac
    n=${pr##*/pull/}
    mid=${pr#https://}
    mid=${mid%/pull/*}
    case $n in ''|*[!0-9]*) usage ;; esac
    case $mid in /*|*/|*//*|*/*/*/*) usage ;; */*/*) ;; *) usage ;; esac
    ;;
  *) usage ;;
esac
file=$1
[ -n "$file" ] || usage

root=$(git rev-parse --show-toplevel 2>/dev/null)
[ -n "$root" ] && cd "$root" 2>/dev/null || skip no-repo

if [ ! -f "$file" ]; then
  echo "ERROR qa-comment.sh: qa file not found: $file" >&2
  exit 2
fi
command -v gh >/dev/null 2>&1 || skip no-gh

dir=$(dirname -- "$file")
prefix=$(cd "$dir" 2>/dev/null && git rev-parse --show-prefix 2>/dev/null)
rel=$prefix$(basename -- "$file")
key=$(basename -- "$dir")

if [ -z "$pr" ]; then
  branch=$(git symbolic-ref --short -q HEAD 2>/dev/null)
  [ -n "$branch" ] || skip no-pr
  pr=$(gh pr list --head "$branch" --state open --json url --jq '.[].url' 2>/dev/null | tr -d '\r' | sed -n 1p)
  [ -n "$pr" ] || skip no-pr
fi

tmp="$root/.temp/viber/qa-comment"
mkdir -p "$tmp" 2>/dev/null || fail "cannot create $tmp"
err="$tmp/$key.err"
comments=$(gh pr view "$pr" --json comments --jq '.comments[].body' 2>"$err") \
  || fail "gh pr view failed: $(tr '\n\r' '  ' < "$err" 2>/dev/null)"
# A marker path, cut at its closing " -->", ending in /<key>/qa.md: the run was
# posted already, whether the marker named the run directory or the archive.
exists=$(printf '%s\n' "$comments" | tr -d '\r' | TAIL="/$key/qa.md" awk '
{
  i = index($0, "<!-- viber:qa ")
  if (i == 0) next
  p = substr($0, i + 14)
  j = index(p, " -->")
  if (j > 0) p = substr(p, 1, j - 1)
  t = ENVIRON["TAIL"]
  if (length(p) >= length(t) && substr(p, length(p) - length(t) + 1) == t) { print "yes"; exit }
}')
[ -z "$exists" ] || skip exists

body="$tmp/$key.md"
{
  printf '<!-- viber:qa %s -->\n' "$rel"
  printf 'QA document: `%s`\n\n' "$rel"
  cat "$file"
} > "$body" || fail "cannot write $body"

out=$(gh pr comment "$pr" --body-file "$body" 2>&1)
st=$?
url=$(printf '%s\n' "$out" | tr -d '\r' \
  | sed -n 's#^\(https://[^/]*/[^/]*/[^/]*/pull/[0-9][0-9]*\#issuecomment-[0-9][0-9]*\)$#\1#p' | tail -n 1)
if [ $st -ne 0 ] || [ -z "$url" ]; then
  fail "gh pr comment failed: $(printf '%s' "$out" | tr '\n\r' '  ')"
fi

echo "STATUS=posted"
echo "COMMENT_URL=$url"
exit 0
