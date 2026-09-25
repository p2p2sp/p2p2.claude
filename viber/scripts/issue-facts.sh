#!/bin/sh
#
# issue-facts.sh - fetches one GitHub issue (metadata, body, every comment) as
# one fixed text block for the viber skills that read a GitHub issue.
#
# It exists so a skill reads an issue through ONE pre-approved command with
# a fixed output shape: a hand-composed `gh issue view` differs per run in
# flags and filter, and each variant is a new, unapproved command. The filter
# runs through gh's own `--jq`, so no external `jq` is needed. Self-verifying:
# the block is printed only after gh exited 0 AND its first line is
# `NUMBER=<digits>` - the caller trusts it and never re-fetches.
#
# Contract:
#   argv   : $1 = the issue, as `<N>`, `#<N>` or
#            `https://<host>/<owner>/<repo>/issues/<N>`. Exactly one argument.
#            A URL's `#...` fragment or `?...` query (a comment's "Copy link"
#            form) is dropped and gh gets the bare issue URL; every comment
#            is fetched either way.
#   cwd    : resolves a bare number only: gh maps `<N>` to the repository of
#            the cwd. A URL is cwd-independent.
#   env    : none of its own; gh reads its usual auth and host config.
#   stdout : on success, CR stripped, in this order:
#              NUMBER=<N>
#              URL=<issue url>
#              TITLE=<title>
#              STATE=OPEN|CLOSED
#              AUTHOR=<login>
#              LABELS=<name>, <name>   (empty when none)
#              COMMENTS=<count>
#              --- body ---
#              <body, verbatim, any number of lines>
#            then per comment, oldest first:
#              --- comment <k> by <login> at <ISO time> ---
#              <comment body>
#            Nothing on stdout on any failure.
#   exit   : 0 with the block; 1 with one `ERROR` line on stderr when gh is not
#            on PATH, gh failed (no auth, no such issue, no network) or printed
#            no `NUMBER=` first line; 2 on bad arguments.
#
set -u

if [ $# -ne 1 ]; then
  echo "ERROR issue-facts.sh: need exactly one <issue number or url>" >&2
  exit 2
fi
bad() { echo "ERROR issue-facts.sh: not an issue number or url: $1" >&2; exit 2; }
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

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR issue-facts.sh: gh not found on PATH" >&2
  exit 1
fi

filter='"NUMBER=\(.number)\nURL=\(.url)\nTITLE=\(.title)\nSTATE=\(.state)\nAUTHOR=\(.author.login)\nLABELS=\([.labels[].name] | join(", "))\nCOMMENTS=\(.comments | length)\n--- body ---\n\(.body)\n" + ([.comments | to_entries[] | "--- comment \(.key + 1) by \(.value.author.login) at \(.value.createdAt) ---\n\(.value.body)\n"] | join(""))'

errf=$(mktemp 2>/dev/null) || errf=""
if [ -n "$errf" ]; then
  trap 'rm -f "$errf"' EXIT
  out=$(gh issue view "$ref" --json number,url,title,state,author,labels,body,comments --jq "$filter" 2>"$errf")
  st=$?
  err=$(tr '\n\r' '  ' < "$errf")
else
  out=$(gh issue view "$ref" --json number,url,title,state,author,labels,body,comments --jq "$filter" 2>/dev/null)
  st=$?
  err="(stderr not captured)"
fi

out=$(printf '%s\n' "$out" | tr -d '\r')
first=$(printf '%s\n' "$out" | sed -n '1p')
case $first in
  NUMBER=*) num=${first#NUMBER=} ;;
  *) num="" ;;
esac
case $num in ''|*[!0-9]*) num="" ;; esac
if [ $st -ne 0 ] || [ -z "$num" ]; then
  echo "ERROR issue-facts.sh: gh issue view failed: $err" >&2
  exit 1
fi

printf '%s\n' "$out"
exit 0
