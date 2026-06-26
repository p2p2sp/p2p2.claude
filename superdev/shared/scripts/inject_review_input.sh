#!/bin/sh
# inject_review_input.sh
# IN : $1 = raw reviewer $ARGUMENTS  ->  "<plan-path>"  | "<plan-path> ||| <prior fixes one-line>"
# OUT: <plan> block with the file's full text (or __NO_PLAN__ when unreadable);
#      a <prior-fixes> block ONLY on a re-review.
# Self-verifying: the caller injects stdout verbatim and trusts it — never re-parses, never re-runs.
# Path-executed via a SKILL `!`-block; commit 100755. Pure POSIX sh + cat, no awk/jq/bc.
set -eu

args=$1

# Split on the FIRST " ||| " only (left = plan path, may contain spaces; right = prior fixes).
case "$args" in
  *" ||| "*)
    plan_path=${args%%" ||| "*}
    prior=${args#*" ||| "}
    ;;
  *)
    plan_path=$args
    prior=""
    ;;
esac

printf '<plan path="%s">\n' "$plan_path"
if [ -f "$plan_path" ]; then
  cat "$plan_path"
else
  printf '%s' "__NO_PLAN__"
fi
printf '\n</plan>\n'

if [ -n "$prior" ]; then
  printf '<prior-fixes mode="re-review">\n%s\n</prior-fixes>\n' "$prior"
fi

exit 0
