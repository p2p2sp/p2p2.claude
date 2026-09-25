#!/bin/sh
#
# post-comment.sh - posts one prepared markdown file as a comment on one GitHub
# issue and reports the new comment's URL.
#
# It exists so a viber skill publishes through ONE pre-approved command: a
# multi-line comment cannot travel as an argument of a single literal Bash
# line, so the body always goes through `--body-file`. Self-verifying:
# COMMENT_URL is printed only after gh exited 0 AND printed a well-formed
# `.../issues/<N>#issuecomment-<id>` URL - the caller trusts it and never
# re-posts.
#
# Contract:
#   argv   : $1 = the issue, as `<N>`, `#<N>` or
#            `https://<host>/<owner>/<repo>/issues/<N>`; $2 = path of the
#            comment file, which must exist. Exactly two arguments. A URL's
#            `#...` fragment or `?...` query is dropped and gh gets the bare
#            issue URL.
#   cwd    : resolves a bare number and a relative $2 only: gh maps `<N>` to
#            the repository of the cwd. A URL is cwd-independent.
#   env    : none of its own; gh reads its usual auth and host config.
#   file   : $2, sent verbatim as the comment body; never modified or removed.
#   stdout : on success exactly one line:
#              COMMENT_URL=https://<host>/<owner>/<repo>/issues/<N>#issuecomment-<id>
#            Nothing on stdout on any failure.
#   exit   : 0 with that line; 1 with one `ERROR` line on stderr when gh is not
#            on PATH, gh failed (no auth, no such issue, no network) or printed
#            no comment URL - whether a comment landed is then unknown, so the
#            caller reports and never retries; 2 on bad arguments or a missing
#            comment file.
#
set -u

if [ $# -ne 2 ]; then
  echo "ERROR post-comment.sh: need <issue number or url> <comment file>" >&2
  exit 2
fi
bad() { echo "ERROR post-comment.sh: not an issue number or url: $1" >&2; exit 2; }
ref=${1#\#}
case $ref in
  ''|*[!0-9]*)
    case $ref in https://*/issues/*) ;; *) bad "$1" ;; esac
    ref=${ref%%[#?]*}
    n=${ref##*/issues/}
    mid=${ref#https://}
    mid=${mid%/issues/*}
    case $n in ''|*[!0-9]*) bad "$1" ;; esac
    case $mid in /*|*/|*//*|*/*/*/*) bad "$1" ;; */*/*) ;; *) bad "$1" ;; esac
    ;;
esac
file=$2
if [ ! -f "$file" ]; then
  echo "ERROR post-comment.sh: comment file not found: $file" >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR post-comment.sh: gh not found on PATH" >&2
  exit 1
fi

out=$(gh issue comment "$ref" --body-file "$file" 2>&1)
st=$?
url=$(printf '%s\n' "$out" | tr -d '\r' \
  | sed -n 's#^\(https://[^/]*/[^/]*/[^/]*/issues/[0-9][0-9]*\#issuecomment-[0-9][0-9]*\)$#\1#p' | tail -n 1)
if [ $st -ne 0 ] || [ -z "$url" ]; then
  echo "ERROR post-comment.sh: gh issue comment failed: $(printf '%s' "$out" | tr '\n\r' '  ')" >&2
  exit 1
fi

echo "COMMENT_URL=$url"
exit 0
